import { createHmac, timingSafeEqual } from "node:crypto";

export const regions = [
  { name: "Aldeota", fee: 500 },
  { name: "Meireles", fee: 700 },
  { name: "Joaquim Távora", fee: 600 },
  { name: "Dionísio Torres", fee: 600 },
  { name: "Varjota", fee: 700 },
  { name: "Centro", fee: 800 },
];

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function textField(value, label, max = 150, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  ) {
    throw new HttpError(
      400,
      `${label}: preencha entre ${min} e ${max} caracteres.`,
    );
  }
  return value.trim();
}

export function mediaPath(value, kind = "image") {
  const v = textField(value, kind === "image" ? "Foto" : "Vídeo", 200);
  const ext = kind === "image" ? "(webp|png|jpg|jpeg)" : "(mp4|webm)";
  if (!new RegExp(`^/media/[a-zA-Z0-9_-]+\\.${ext}$`).test(v)) {
    throw new HttpError(400, "Envie um arquivo local pelo campo de mídia.");
  }
  return v;
}

export function validateProduct(input, id) {
  const category = input.category;
  if (!["burgers", "fries", "drinks", "sweets"].includes(category))
    throw new HttpError(400, "Categoria inválida.");
  if (
    !Number.isInteger(input.price) ||
    input.price < 100 ||
    input.price > 100000
  )
    throw new HttpError(400, "Preço deve estar entre R$ 1,00 e R$ 1.000,00.");
  if (
    !Array.isArray(input.ingredients) ||
    input.ingredients.length < 1 ||
    input.ingredients.length > 25
  )
    throw new HttpError(400, "Informe os ingredientes.");
  return {
    id,
    category,
    price: input.price,
    name: textField(input.name, "Nome", 80),
    description: textField(input.description, "Descrição", 700),
    ingredients: input.ingredients.map((v) => textField(v, "Ingrediente", 100)),
    image: mediaPath(input.image),
    video: input.video ? mediaPath(input.video, "video") : "",
    badge: textField(input.badge || "", "Destaque", 50, 0),
    allergens: textField(input.allergens || "", "Alergênicos", 300, 0),
    active: input.active !== false,
    featured: input.featured === true,
  };
}

export function calculateOrder(items, products, deliveryType, region, store) {
  if (!Array.isArray(items) || !items.length || items.length > 30)
    throw new HttpError(400, "Seu carrinho deve ter entre 1 e 30 itens.");
  if (!["delivery", "pickup"].includes(deliveryType))
    throw new HttpError(400, "Escolha entrega ou retirada.");
  const seen = new Set();
  const lines = items.map((item) => {
    const product = products.find((p) => p.id === item.id && p.active);
    if (!product)
      throw new HttpError(
        409,
        "Um produto ficou indisponível. Atualize seu carrinho.",
      );
    if (seen.has(item.id))
      throw new HttpError(400, "Produto repetido no carrinho.");
    seen.add(item.id);
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 20
    )
      throw new HttpError(400, "Quantidade deve estar entre 1 e 20.");
    return {
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: item.quantity,
      note: textField(item.note || "", "Observação do item", 200, 0),
    };
  });
  const subtotal = lines.reduce((sum, p) => sum + p.price * p.quantity, 0);
  if (subtotal < store.minimumOrder)
    throw new HttpError(
      400,
      `Pedido mínimo de R$ ${(store.minimumOrder / 100).toFixed(2).replace(".", ",")}.`,
    );
  const deliveryRegion = store.regions.find((r) => r.name === region);
  if (deliveryType === "delivery" && !deliveryRegion)
    throw new HttpError(400, "Selecione um bairro atendido.");
  const fee = deliveryType === "delivery" ? deliveryRegion.fee : 0;
  return { items: lines, subtotal, deliveryFee: fee, total: subtotal + fee };
}

function tlv(id, value) {
  return `${id}${Buffer.byteLength(value).toString().padStart(2, "0")}${value}`;
}
export function crc16(value) {
  let crc = 0xffff;
  for (const b of Buffer.from(value, "utf8")) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++)
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
export function createPix({ key, merchant, city, amount, txid }) {
  if (!key || !Number.isSafeInteger(amount) || amount < 1)
    throw new Error("Configuração Pix inválida.");
  const ascii = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 .-]/g, "")
      .toUpperCase();
  if (!/^[A-Za-z0-9]{1,25}$/.test(txid))
    throw new Error("Identificador Pix inválido.");
  const account = tlv("00", "br.gov.bcb.pix") + tlv("01", key);
  if (Buffer.byteLength(account) > 99)
    throw new Error("Chave Pix muito longa.");
  const payload =
    tlv("00", "01") +
    tlv("26", account) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", (amount / 100).toFixed(2)) +
    tlv("58", "BR") +
    tlv("59", ascii(merchant).slice(0, 25)) +
    tlv("60", ascii(city).slice(0, 15)) +
    tlv("62", tlv("05", txid)) +
    "6304";
  return payload + crc16(payload);
}

export function validateWebhook(headers, id, secret, now = Date.now()) {
  if (!secret || typeof id !== "string" || !/^[a-zA-Z0-9]+$/.test(id))
    return false;
  const signature = String(headers["x-signature"] || "");
  const ts = signature.match(/(?:^|,)\s*ts=(\d+)/)?.[1];
  const v1 = signature.match(/(?:^|,)\s*v1=([a-fA-F0-9]{64})/)?.[1];
  const requestId = headers["x-request-id"];
  if (
    !ts ||
    !v1 ||
    !requestId ||
    Math.abs(now - Number(ts) * (ts.length <= 10 ? 1000 : 1)) > 300000
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(v1, "hex"));
}

export function aggregateOrders(orders, days = 30, now = Date.now()) {
  const valid = orders.filter(
    (o) =>
      o.createdAt >= now - days * 86400000 &&
      ["approved", "demo_approved"].includes(o.paymentStatus) &&
      o.status !== "cancelled",
  );
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const weekdays = dayNames.map((name) => ({ name, count: 0, total: 0 }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const byRegion = new Map(),
    byProduct = new Map(),
    customers = new Set();
  const daily = [];
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  for (let i = days - 1; i >= 0; i--)
    daily.push({
      date: format.format(new Date(now - i * 86400000)),
      total: 0,
      count: 0,
    });
  for (const o of valid) {
    const local = new Date(o.createdAt - 3 * 3600000);
    weekdays[local.getUTCDay()].count++;
    weekdays[local.getUTCDay()].total += o.total;
    hours[local.getUTCHours()].count++;
    const region = o.deliveryType === "pickup" ? "Retirada" : o.customer.region;
    byRegion.set(region, (byRegion.get(region) || 0) + 1);
    customers.add(o.userId || o.customer.email.toLowerCase());
    const day = daily.find(
      (d) => d.date === format.format(new Date(o.createdAt)),
    );
    if (day) {
      day.count++;
      day.total += o.total;
    }
    for (const item of o.items) {
      const value = byProduct.get(item.id) || {
        id: item.id,
        name: item.name,
        quantity: 0,
        total: 0,
      };
      value.quantity += item.quantity;
      value.total += item.price * item.quantity;
      byProduct.set(item.id, value);
    }
  }
  const revenue = valid.reduce((sum, o) => sum + o.total, 0);
  return {
    days,
    orders: valid.length,
    revenue,
    averageTicket: valid.length ? Math.round(revenue / valid.length) : 0,
    customers: customers.size,
    weekdays,
    hours,
    daily,
    regions: [...byRegion]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    products: [...byProduct.values()].sort((a, b) => b.quantity - a.quantity),
    source: valid.some((o) => o.demo) ? "demo" : "live",
  };
}

export function localInsights(data, question = "") {
  if (!data.orders)
    return "Ainda não há pedidos pagos neste período. As análises aparecem depois das primeiras vendas confirmadas. Experimente ampliar o período.";
  const product = data.products[0],
    region = data.regions[0];
  const day = [...data.weekdays].sort((a, b) => b.count - a.count)[0];
  const hour = [...data.hours].sort((a, b) => b.count - a.count)[0];
  const insights = {
    products: `${product.name} lidera com ${product.quantity} unidades. Considere um destaque para esse produto e acompanhe o efeito sobre as vendas; o histórico não garante o resultado de uma promoção.`,
    days: `${day.name} concentrou ${day.count} de ${data.orders} pedidos (${Math.round((day.count / data.orders) * 100)}%). O horário mais movimentado foi ${hour.hour}h. Planeje o preparo e a equipe nesses horários.`,
    regions: `${region.name} lidera com ${region.count} pedidos, ${Math.round((region.count / data.orders) * 100)}% do total. Avalie uma campanha nessa região e compare o custo de entrega antes de ampliar o raio.`,
  };
  if (/bairro|regi|entrega/i.test(question)) return insights.regions;
  if (/dia|hora|semana|pico/i.test(question)) return insights.days;
  if (/produto|item|burger|vende|vendido/i.test(question))
    return insights.products;
  return `${insights.products}\n\n${insights.days}\n\n${insights.regions}`;
}
