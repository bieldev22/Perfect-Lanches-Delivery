import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID, createHmac } from "node:crypto";
import { createDeliveryApp } from "../server/api.mjs";
import {
  createPix,
  crc16,
  aggregateOrders,
  validateWebhook,
} from "../server/domain.mjs";

const adminPassword = "Senha-unica-de-teste-2026";
const checkout = () => ({
  idempotencyKey: randomUUID(),
  items: [{ id: "perfect-classic", quantity: 2 }],
  deliveryType: "delivery",
  customer: {
    name: "Pessoa de Teste",
    email: "teste@example.invalid",
    phone: "85999999999",
    street: "Rua Exemplo",
    number: "12",
    complement: "",
    region: "Aldeota",
  },
  note: "",
});

async function setup(t, overrides = {}) {
  let app;
  const server = createServer((req, res) => app.handle(req, res));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  app = createDeliveryApp({
    demo: false,
    publicUrl: origin,
    dataDir: ":memory:",
    mediaDir: ".delivery/tests-media",
    adminEmail: "admin@example.invalid",
    adminPassword,
    pixProvider: "manual",
    pixKey: "pagamentos@example.invalid",
    ...overrides,
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    app.close();
  });
  async function client() {
    let cookie = "",
      csrf = "";
    const request = async (path, method = "GET", body, extra = {}) => {
      const response = await fetch(`${origin}/api${path}`, {
        method,
        headers: {
          Origin: origin,
          Cookie: cookie,
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const nextCookie = response.headers.get("set-cookie");
      if (nextCookie) cookie = nextCookie.split(";")[0];
      const data = await response.json();
      if (data.csrf) csrf = data.csrf;
      return { status: response.status, data, headers: response.headers };
    };
    const boot = await request("/bootstrap");
    return {
      request,
      boot,
      cookie: () => cookie,
      csrf: () => csrf,
      admin: () =>
        request("/auth/login", "POST", {
          email: "admin@example.invalid",
          password: adminPassword,
        }),
    };
  }
  return { client, app };
}

test("cardápio tem 15 produtos, distribuídos nas quatro categorias, sem dados administrativos", async (t) => {
  const { client } = await setup(t);
  const c = await client();
  assert.equal(c.boot.data.products.length, 15);
  assert.deepEqual(
    [...new Set(c.boot.data.products.map((p) => p.category))].sort(),
    ["burgers", "drinks", "fries", "sweets"],
  );
  assert.equal(c.boot.data.user, null);
  assert.ok(c.boot.headers.get("set-cookie").includes("HttpOnly"));
  assert.ok(c.boot.headers.get("set-cookie").includes("SameSite=Lax"));
  assert.equal(c.boot.headers.get("cache-control"), "no-store");
});
test("checkout ignora preço e total enviados pelo navegador e usa centavos do servidor", async (t) => {
  const { client } = await setup(t);
  const c = await client();
  const input = checkout();
  input.items[0].price = 1;
  input.total = 2;
  input.deliveryFee = 0;
  const result = await c.request("/checkout", "POST", input);
  assert.equal(result.status, 201);
  assert.equal(result.data.order.total, 5480);
  assert.equal(result.data.order.items[0].price, 2490);
  assert.equal(result.data.order.deliveryFee, 500);
  assert.equal(result.data.order.paymentStatus, "pending");
  assert.match(result.data.order.pixCode, /^000201/);
  assert.match(result.data.order.qrCode, /^data:image\/png;base64,/);
  assert.equal(
    result.data.order.expiresAt,
    null,
    "Pix estático não deve inventar vencimento bancário",
  );
});
test("repetir a mesma requisição reutiliza o pedido e o código Pix", async (t) => {
  const { client } = await setup(t);
  const c = await client(),
    input = checkout();
  const first = await c.request("/checkout", "POST", input),
    second = await c.request("/checkout", "POST", input);
  assert.equal(first.data.order.id, second.data.order.id);
  assert.equal(first.data.order.pixCode, second.data.order.pixCode);
  assert.equal((await c.request("/orders")).data.orders.length, 1);
});
test("pedido e chave de idempotência de um visitante não podem ser usados por outro", async (t) => {
  const { client } = await setup(t);
  const a = await client(),
    b = await client(),
    input = checkout();
  const first = await a.request("/checkout", "POST", input);
  assert.equal((await b.request(`/orders/${first.data.order.id}`)).status, 404);
  assert.equal((await b.request("/orders")).data.orders.length, 0);
  assert.equal((await b.request("/checkout", "POST", input)).status, 409);
});
test("CSRF, origem e autorização impedem gravação ou leitura administrativa indevida", async (t) => {
  const { client } = await setup(t);
  const c = await client();
  assert.equal(
    (
      await c.request("/checkout", "POST", checkout(), {
        "X-CSRF-Token": "forjado",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await c.request("/checkout", "POST", checkout(), {
        Origin: "https://outro.invalid",
      })
    ).status,
    403,
  );
  assert.equal((await c.request("/admin/dashboard")).status, 403);
  assert.equal(
    (await c.request("/admin/settings", "PATCH", { isOpen: false })).status,
    403,
  );
  assert.equal((await c.request("/auth/demo", "POST", {})).status, 403);
});
test("validação recusa quantidades inválidas, produtos desconhecidos e bairros fora da entrega", async (t) => {
  const { client } = await setup(t);
  const c = await client();
  for (const quantity of [0, -1, 1.5, 21, "2"]) {
    const input = checkout();
    input.items[0].quantity = quantity;
    assert.equal((await c.request("/checkout", "POST", input)).status, 400);
  }
  const unknown = checkout();
  unknown.items[0].id = "inexistente";
  assert.equal((await c.request("/checkout", "POST", unknown)).status, 409);
  const region = checkout();
  region.customer.region = "Fora do raio";
  assert.equal((await c.request("/checkout", "POST", region)).status, 400);
  const duplicate = checkout();
  duplicate.items.push(duplicate.items[0]);
  assert.equal((await c.request("/checkout", "POST", duplicate)).status, 400);
});
test("retirada não cobra entrega e pedido abaixo do mínimo é recusado", async (t) => {
  const { client } = await setup(t);
  const c = await client();
  const pickup = checkout();
  pickup.deliveryType = "pickup";
  pickup.customer.region = "";
  assert.equal(
    (await c.request("/checkout", "POST", pickup)).data.order.total,
    4980,
  );
  const small = checkout();
  small.items = [{ id: "coca-cola", quantity: 1 }];
  assert.equal((await c.request("/checkout", "POST", small)).status, 400);
});
test("cadastro não aceita elevar privilégios, rotaciona sessão e vincula pedido de visitante", async (t) => {
  const { client } = await setup(t);
  const c = await client();
  const order = (await c.request("/checkout", "POST", checkout())).data.order;
  const previousCookie = c.cookie();
  const register = await c.request("/auth/register", "POST", {
    name: "Cliente Teste",
    email: "cliente@example.invalid",
    password: "senha-cliente-123",
    role: "admin",
  });
  assert.equal(register.status, 201);
  assert.equal(register.data.user.role, "customer");
  assert.notEqual(c.cookie(), previousCookie);
  assert.equal((await c.request("/orders")).data.orders[0].id, order.id);
  assert.equal((await c.request("/admin/dashboard")).status, 403);
  await c.request("/auth/logout", "POST", {});
  assert.equal((await c.request(`/orders/${order.id}`)).status, 404);
  assert.equal(
    (
      await c.request("/auth/login", "POST", {
        email: "cliente@example.invalid",
        password: "errada",
      })
    ).status,
    401,
  );
  await c.request("/auth/login", "POST", {
    email: "cliente@example.invalid",
    password: "senha-cliente-123",
  });
  assert.equal((await c.request(`/orders/${order.id}`)).status, 200);
});
test("edição administrativa altera preço real, ingredientes e disponibilidade pública", async (t) => {
  const { client } = await setup(t);
  const admin = await client();
  await admin.admin();
  const p = admin.boot.data.products[0];
  assert.equal(
    (
      await admin.request(`/admin/products/${p.id}`, "PUT", {
        ...p,
        price: 3190,
        ingredients: ["Pão", "Carne", "Queijo"],
      })
    ).status,
    200,
  );
  const guest = await client();
  assert.equal(guest.boot.data.products[0].price, 3190);
  assert.equal(
    (await guest.request("/checkout", "POST", checkout())).data.order.total,
    6880,
  );
  await admin.request(`/admin/products/${p.id}`, "PUT", {
    ...p,
    active: false,
  });
  assert.equal(
    (await guest.request("/checkout", "POST", checkout())).status,
    409,
  );
  assert.equal(
    (await (await client()).request("/bootstrap")).data.products.length,
    14,
  );
});
test("admin não pode pular etapas nem preparar antes do pagamento manual conferido", async (t) => {
  const { client } = await setup(t);
  const c = await client(),
    admin = await client();
  await admin.admin();
  const order = (await c.request("/checkout", "POST", checkout())).data.order;
  assert.equal(
    (await c.request(`/orders/${order.id}/simulate`, "POST", {})).status,
    403,
  );
  assert.equal(
    (
      await admin.request(`/admin/orders/${order.id}`, "PATCH", {
        status: "preparing",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await admin.request(`/admin/orders/${order.id}`, "PATCH", {
        confirmManual: true,
      })
    ).data.order.paymentStatus,
    "approved",
  );
  assert.equal(
    (
      await admin.request(`/admin/orders/${order.id}`, "PATCH", {
        status: "delivered",
      })
    ).status,
    409,
  );
  for (const status of ["preparing", "out_for_delivery", "delivered"])
    assert.equal(
      (await admin.request(`/admin/orders/${order.id}`, "PATCH", { status }))
        .status,
      200,
    );
  assert.equal(
    (await c.request(`/orders/${order.id}`)).data.order.status,
    "delivered",
  );
});
test("loja fechada recusa novos pedidos sem apagar pedidos já criados", async (t) => {
  const { client } = await setup(t);
  const c = await client(),
    admin = await client();
  await admin.admin();
  const order = (await c.request("/checkout", "POST", checkout())).data.order;
  await admin.request("/admin/settings", "PATCH", { isOpen: false });
  assert.equal((await c.request("/checkout", "POST", checkout())).status, 409);
  assert.equal((await c.request(`/orders/${order.id}`)).status, 200);
});
test("cálculo Pix reproduz CRC16 de referência e inclui valor e txid únicos", () => {
  assert.equal(crc16("123456789"), "29B1");
  const code = createPix({
    key: "exemplo@example.invalid",
    merchant: "Perfect Lanches",
    city: "Fortaleza",
    amount: 5480,
    txid: "PL1234",
  });
  assert.ok(code.includes("540554.80"));
  assert.ok(code.includes("PL1234"));
  assert.equal(code.slice(-4), crc16(code.slice(0, -4)));
  assert.throws(() =>
    createPix({ key: "x", merchant: "x", city: "x", amount: 1.1, txid: "ABC" }),
  );
});
test("relatórios excluem pedidos não pagos e não vazam nomes, e-mails ou telefones para a IA", async (t) => {
  const { client } = await setup(t);
  const c = await client(),
    admin = await client();
  await admin.admin();
  const order = (await c.request("/checkout", "POST", checkout())).data.order;
  assert.equal(
    (await admin.request("/admin/dashboard")).data.analytics.orders,
    0,
  );
  await admin.request(`/admin/orders/${order.id}`, "PATCH", {
    confirmManual: true,
  });
  const dashboard = (await admin.request("/admin/dashboard")).data;
  assert.equal(dashboard.analytics.orders, 1);
  assert.equal(dashboard.analytics.revenue, 5480);
  const serialized = JSON.stringify(dashboard.analytics);
  for (const value of [
    order.customer.name,
    order.customer.email,
    order.customer.phone,
    order.customer.street,
  ])
    assert.ok(!serialized.includes(value));
  const ai = (
    await admin.request("/admin/insights", "POST", {
      question: "Quais regiões mais pedem?",
      days: 30,
    })
  ).data;
  assert.equal(ai.source, "local");
  assert.ok(ai.text.includes("Aldeota"));
});
test("agregação respeita o fuso de Fortaleza na transição de dia", () => {
  const at = Date.parse("2026-11-08T01:00:00Z"); // Sábado, 22h em Fortaleza.
  const order = {
    createdAt: at,
    paymentStatus: "approved",
    status: "confirmed",
    total: 100,
    deliveryType: "delivery",
    customer: { region: "Aldeota", email: "teste@example.invalid" },
    items: [],
  };
  const data = aggregateOrders([order], 7, at + 1000);
  assert.equal(data.weekdays.find((d) => d.name === "Sáb").count, 1);
  assert.equal(data.hours[22].count, 1);
});
test("webhook valida assinatura e rejeita falsificação ou notificação antiga", () => {
  const id = "123456",
    secret = "segredo-local",
    now = Date.now(),
    ts = String(Math.floor(now / 1000));
  const requestId = randomUUID();
  const digest = createHmac("sha256", secret)
    .update(`id:${id};request-id:${requestId};ts:${ts};`)
    .digest("hex");
  const headers = {
    "x-request-id": requestId,
    "x-signature": `ts=${ts},v1=${digest}`,
  };
  assert.equal(validateWebhook(headers, id, secret, now), true);
  assert.equal(validateWebhook(headers, id, "outro", now), false);
  assert.equal(validateWebhook(headers, id, secret, now + 600000), false);
});
test("produção recusa demonstração e ausência de HTTPS", () => {
  assert.throws(() => createDeliveryApp({ demo: true, publicUrl: "http://127.0.0.1:4174", pixProvider: "manual" }), /demonstração exige/);
  assert.throws(() => createDeliveryApp({ production: true, demo: false, publicUrl: "https://delivery.example.invalid", pixProvider: "invalido" }), /PIX_PROVIDER/);
  assert.throws(
    () =>
      createDeliveryApp({
        production: true,
        demo: true,
        publicUrl: "https://delivery.example.invalid",
      }),
    /Produção/,
  );
  assert.throws(
    () =>
      createDeliveryApp({
        production: true,
        demo: false,
        publicUrl: "http://delivery.example.invalid",
      }),
    /HTTPS/,
  );
});

test("Mercado Pago: confirma após conferir referência, valor e moeda e reconcilia estorno por webhook", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestBody,
    providerStatus = "approved",
    createCalls = 0;
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = String(input);
    if (!url.startsWith("https://api.mercadopago.com/"))
      return originalFetch(input, init);
    if (init?.method === "POST") {
      requestBody = JSON.parse(init.body);
      createCalls++;
      assert.ok(init.headers["X-Idempotency-Key"]);
      return Response.json({
        id: 123456,
        status: "approved",
        point_of_interaction: {
          transaction_data: { qr_code: "000201-PIX-DO-TESTE" },
        },
      });
    }
    return Response.json({
      id: 123456,
      status: providerStatus,
      transaction_amount: requestBody.transaction_amount,
      external_reference: requestBody.external_reference,
      currency_id: "BRL",
      payment_method_id: "pix",
    });
  });
  const { client } = await setup(t, {
    pixProvider: "mercadopago",
    mpToken: "TEST-token-local",
    webhookSecret: "segredo-webhook-teste",
  });
  const c = await client(),
    input = { ...checkout(), cpf: "12345678909" };
  const result = await c.request("/checkout", "POST", input);
  assert.equal(result.status, 201);
  assert.equal(result.data.order.status, "confirmed");
  assert.equal(result.data.order.paymentStatus, "approved");
  await c.request("/checkout", "POST", input);
  assert.equal(createCalls, 1);
  providerStatus = "refunded";
  const requestId = randomUUID(),
    ts = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", "segredo-webhook-teste")
    .update(`id:123456;request-id:${requestId};ts:${ts};`)
    .digest("hex");
  const webhook = await c.request(
    "/payments/webhook?data.id=123456",
    "POST",
    { data: { id: "123456" } },
    { "x-request-id": requestId, "x-signature": `ts=${ts},v1=${signature}` },
  );
  assert.equal(webhook.status, 200);
  assert.equal(
    (await c.request(`/orders/${result.data.order.id}`)).data.order
      .paymentStatus,
    "refunded",
  );
});

test("Mercado Pago: pagamento com valor diferente não libera o pedido", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestBody, creationStatus = "pending";
  t.mock.method(globalThis, "fetch", async (input, init) => {
    if (!String(input).startsWith("https://api.mercadopago.com/"))
      return originalFetch(input, init);
    if (init?.method === "POST") {
      requestBody = JSON.parse(init.body);
      return Response.json({
        id: 987,
        status: creationStatus,
        point_of_interaction: { transaction_data: { qr_code: "000201-TESTE" } },
      });
    }
    return Response.json({
      id: 987,
      status: "approved",
      transaction_amount: 0.01,
      external_reference: requestBody.external_reference,
      currency_id: "BRL",
      payment_method_id: "pix",
    });
  });
  const { client } = await setup(t, {
    pixProvider: "mercadopago",
    mpToken: "TEST-token-local",
  });
  const c = await client(),
    order = (
      await c.request("/checkout", "POST", {
        ...checkout(),
        cpf: "12345678909",
      })
    ).data.order;
  assert.equal(
    (await c.request(`/orders/${order.id}/payment`, "POST", {})).status,
    502,
  );
  assert.equal(
    (await c.request(`/orders/${order.id}`)).data.order.status,
    "awaiting_payment",
  );
  creationStatus = "approved";
  const immediate = await c.request("/checkout", "POST", {...checkout(), cpf: "12345678909"});
  assert.equal(immediate.status, 502);
  const saved = (await c.request("/orders")).data.orders;
  assert.ok(saved.every(o => o.paymentStatus === "pending" && o.status === "awaiting_payment"));
});

test("IA recebe somente agregados, desativa armazenamento e reutiliza o resultado em cache", async (t) => {
  const originalFetch = globalThis.fetch;
  let aiCalls = 0,
    aiRequest;
  t.mock.method(globalThis, "fetch", async (input, init) => {
    if (String(input) !== "https://api.openai.com/v1/responses")
      return originalFetch(input, init);
    aiCalls++;
    aiRequest = JSON.parse(init.body);
    return Response.json({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "Aldeota recebeu um pedido confirmado. Planeje a entrega com esse dado.",
            },
          ],
        },
      ],
    });
  });
  const { client } = await setup(t, { aiKey: "TEST-IA-local" }),
    c = await client(),
    admin = await client();
  await admin.admin();
  const order = (await c.request("/checkout", "POST", checkout())).data.order;
  await admin.request(`/admin/orders/${order.id}`, "PATCH", {
    confirmManual: true,
  });
  for (let i = 0; i < 2; i++) {
    const response = await admin.request("/admin/insights", "POST", {
      question: "Quais bairros mais pedem?",
      days: 30,
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.source, "openai");
  }
  assert.equal(aiCalls, 1);
  assert.equal(aiRequest.store, false);
  for (const value of [
    order.customer.name,
    order.customer.email,
    order.customer.phone,
    order.customer.street,
  ])
    assert.ok(!aiRequest.input.includes(value));
  assert.equal(JSON.parse(aiRequest.input).analytics.orders, 1);
});

test("pedidos demonstrativos e novos pedidos têm números distintos", async (t) => {
  const { client } = await setup(t, { demo: true, pixProvider: "demo" }),
    admin = await client(),
    c = await client();
  await admin.admin();
  await c.request("/checkout", "POST", checkout());
  const orders = (await admin.request("/admin/dashboard")).data.orders;
  assert.equal(new Set(orders.map((o) => o.number)).size, orders.length);
});
