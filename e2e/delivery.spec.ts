import { test, expect } from "@playwright/test";

test("cardápio desktop: filtros, busca, prévia em vídeo e foto", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Seu dia mereceum lancheperfeito.",
  );
  await expect(page.locator(".product-card")).toHaveCount(15);
  await expect(page.locator(".hero-photo")).toBeVisible();
  await page.screenshot({
    path: ".reference/desktop-full.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Doces", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(3);
  await page.getByRole("textbox", { name: "Buscar produtos" }).fill("pudim");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Buscar produtos" })
    .fill("zzzinexistente");
  await expect(
    page.getByRole("heading", { name: "Esse sabor ainda não está por aqui" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver todo o cardápio" }).click();
  await page
    .getByRole("button", {
      name: "Ver detalhes de Perfect Classic",
      exact: true,
    })
    .hover();
  await expect(
    page.locator(".product-card").first().locator("video"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".product-card")
        .first()
        .locator("video")
        .evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole("button", {
      name: "Ver detalhes de Perfect Classic",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("O que faz esse sabor")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("compra, Pix demonstrativo, acompanhamento, cadastro e gestão do pedido", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Adicionar Perfect Classic ao carrinho",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: /Abrir sacola com 1 itens/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Continuar pedido" }).click();
  await expect(
    page.getByRole("heading", { name: "Quase na sua mesa." }),
  ).toBeVisible();
  await page.getByLabel("Nome completo").fill("Cliente do Teste Visual");
  await page.getByLabel("WhatsApp com DDD").fill("85999999999");
  const email = `visual-${Date.now()}@exemplo.invalid`;
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Bairro", { exact: true }).selectOption("Aldeota");
  await page.getByLabel("Rua ou avenida").fill("Rua de Demonstração");
  await page.getByLabel("Número", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Gerar Pix do pedido" }).click();
  await expect(
    page.getByText("DEMONSTRAÇÃO · SEM COBRANÇA", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".payment-total")).toHaveText("R$ 29,90");
  await expect(page.locator(".qr-code")).toBeVisible();
  await page.screenshot({ path: ".reference/pix.png", fullPage: false });
  await page
    .getByRole("button", { name: "Simular pagamento aprovado" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Agora é com a gente!" }),
  ).toBeVisible();
  const orderNumber = (await page
    .locator(".payment-header .eyebrow")
    .textContent())!.replace("PEDIDO #", "");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.goto("/conta");
  await expect(
    page.getByRole("button", { name: new RegExp(`Pedido #${orderNumber}`) }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.getByLabel("Seu nome").fill("Cliente do Teste Visual");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page
    .getByLabel("Senha", { exact: true })
    .fill("Senha-teste-visual-2026");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Olá, Cliente." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: new RegExp(`Pedido #${orderNumber}`) }),
  ).toBeVisible();
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const admin = await adminContext.newPage();
  await admin.goto("http://127.0.0.1:4188/admin");
  await admin
    .getByRole("button", { name: "Explorar demonstração local" })
    .click();
  await expect(
    admin.getByRole("heading", { name: "Um olhar para o seu negócio." }),
  ).toBeVisible();
  await admin.screenshot({
    path: ".reference/admin-desktop.png",
    fullPage: true,
  });
  await admin.getByRole("button", { name: "Pedidos", exact: true }).click();
  await admin
    .getByRole("textbox", { name: "Buscar pedido ou cliente" })
    .fill(orderNumber);
  await admin
    .getByRole("button", { name: `Detalhes do pedido ${orderNumber}` })
    .click();
  await admin.getByRole("button", { name: "Iniciar preparo" }).click();
  await expect(
    admin.getByRole("dialog").getByText("Em preparo", { exact: true }),
  ).toBeVisible();
  await admin.getByRole("button", { name: "Enviar para entrega" }).click();
  await admin.getByRole("button", { name: "Marcar como entregue" }).click();
  await expect(
    admin.getByRole("dialog").getByText("Entregue", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: new RegExp(`Pedido #${orderNumber}`) }),
  ).toContainText("Entregue");
  await admin.getByRole("button", { name: "Fechar", exact: true }).click();
  await admin.getByRole("button", { name: "Inteligência da loja" }).click();
  await admin
    .getByRole("button", { name: "Quais regiões mais pedem?" })
    .click();
  await expect(admin.locator(".ai-answer")).toContainText(
    "Análise calculada localmente",
  );
  await expect(admin.locator(".ai-answer")).toContainText("Aldeota");
  await admin.screenshot({
    path: ".reference/admin-insights.png",
    fullPage: true,
  });
  await admin.getByRole("button", { name: "Cardápio", exact: true }).click();
  await admin
    .locator(".admin-product-card")
    .first()
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await admin.getByLabel("Preço (R$)").fill("25.90");
  await admin
    .getByLabel("Descrição", { exact: true })
    .fill("Descrição atualizada durante a verificação visual.");
  await admin
    .locator('input[type="file"]')
    .first()
    .setInputFiles("public/media/chicken.webp");
  await expect(admin.locator(".editor-media > img")).toHaveAttribute(
    "src",
    /\/media\/[a-f0-9-]{36}\.webp$/,
  );
  await admin.getByRole("button", { name: "Salvar produto" }).click();
  await expect(
    admin.getByText("Produto salvo e cardápio atualizado."),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".product-card").first()).toContainText("R$ 25,90");
  await adminContext.close();
});

test("celular: cardápio, sacola e administração sem transbordamento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".product-card")).toHaveCount(15);
  await page.screenshot({ path: ".reference/mobile-full.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", {
      name: "Adicionar Double Perfect ao carrinho",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: /Ver minha sacola/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    path: ".reference/mobile-cart.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.goto("/admin");
  await page
    .getByRole("button", { name: "Explorar demonstração local" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Um olhar para o seu negócio." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".reference/admin-mobile.png",
    fullPage: true,
  });
});
