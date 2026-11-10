import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDeliveryApp } from "./api.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const dev = process.argv.includes("--dev");
const production = process.env.NODE_ENV === "production";
const demo = process.env.DELIVERY_DEMO !== "false" && !production;
const port = Number(process.env.PORT || 4174),
  host = process.env.HOST || "127.0.0.1";
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("PORT inválida.");
if (demo && !["127.0.0.1", "localhost", "::1"].includes(host))
  throw new Error("Demonstração deve usar HOST=127.0.0.1.");
const publicUrl = process.env.PUBLIC_URL || `http://127.0.0.1:${port}`;
const dataDir = path.resolve(
  root,
  process.env.DELIVERY_DATA_DIR || ".delivery",
  demo ? "demo" : "live",
);
const mediaDir = path.join(dataDir, "media");
await mkdir(dataDir, { recursive: true });
let adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  if (!demo)
    throw new Error(
      "Defina ADMIN_PASSWORD no servidor antes de iniciar em produção.",
    );
  const passwordFile = path.join(dataDir, "admin-password.txt");
  adminPassword = await readFile(passwordFile, "utf8").catch(() => "");
  if (!adminPassword) {
    adminPassword = randomBytes(18).toString("base64url");
    await writeFile(passwordFile, adminPassword, { flag: "wx", mode: 0o600 });
  }
}
if (adminPassword.length < 12)
  throw new Error("ADMIN_PASSWORD deve ter ao menos 12 caracteres.");
const app = createDeliveryApp({
  demo,
  production,
  publicUrl,
  dataDir,
  mediaDir,
  adminEmail: process.env.ADMIN_EMAIL || "admin@perfectlanches.com.br",
  adminPassword,
  pixProvider: process.env.PIX_PROVIDER || (demo ? "demo" : "mercadopago"),
  mpToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
  pixKey: process.env.PIX_KEY,
  pixMerchant: process.env.PIX_MERCHANT_NAME,
  pixCity: process.env.PIX_MERCHANT_CITY,
  aiKey: process.env.OPENAI_API_KEY,
  aiModel: process.env.OPENAI_MODEL,
});
let vite = null;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
};
const staticRoot = path.join(root, "dist");

async function serveFile(request, response, file, immutable = false) {
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return false;
  response.setHeader(
    "Content-Type",
    mime[path.extname(file)] || "application/octet-stream",
  );
  response.setHeader(
    "Cache-Control",
    immutable ? "public,max-age=31536000,immutable" : "public,max-age=3600",
  );
  response.setHeader("Accept-Ranges", "bytes");
  let start = 0,
    end = info.size - 1;
  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (
      !match ||
      Number(match[1]) >= info.size ||
      (match[2] && Number(match[2]) < Number(match[1]))
    ) {
      response.writeHead(416, { "Content-Range": `bytes */${info.size}` });
      response.end();
      return true;
    }
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), end) : end;
    response.statusCode = 206;
    response.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
  }
  response.setHeader("Content-Length", end - start + 1);
  if (request.method === "HEAD") response.end();
  else
    createReadStream(file, { start, end })
      .on("error", () => response.destroy())
      .pipe(response);
  return true;
}

const server = createServer(async (request, response) => {
  const allowedWs = new URL(publicUrl).origin.replace(/^http/, "ws");
  response.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'${dev ? " 'unsafe-inline'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'${dev ? ` ${allowedWs}` : ""}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
  );
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (new URL(publicUrl).protocol === "https:")
    response.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  try {
    const url = new URL(request.url, publicUrl);
    if (await app.handle(request, response)) return;
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    if (
      pathname.includes("\\") ||
      pathname.includes("\0") ||
      pathname
        .split("/")
        .some(
          (p) =>
            p === ".." ||
            (p.startsWith(".") && !(dev && [".vite", ".pnpm"].includes(p))),
        )
    ) {
      response.writeHead(404);
      response.end("Não encontrado");
      return;
    }
    if (pathname === "/robots.txt") {
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.end(
        demo
          ? "User-agent: *\nDisallow: /\n"
          : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /conta\nDisallow: /api/\nSitemap: ${new URL(publicUrl).origin}/sitemap.xml\n`,
      );
      return;
    }
    if (pathname === "/sitemap.xml") {
      response.setHeader("Content-Type", "application/xml");
      response.end(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${new URL(publicUrl).origin}/</loc></url></urlset>`,
      );
      return;
    }
    if (/^\/media\/[a-zA-Z0-9_-]+\.(webp|png|jpe?g|mp4|webm|woff2)$/.test(pathname)) {
      if (
        await serveFile(
          request,
          response,
          path.join(mediaDir, path.basename(pathname)),
          true,
        )
      )
        return;
      if (
        await serveFile(request, response, path.join(root, "public", pathname))
      )
        return;
    }
    if (vite && !["/", "/conta", "/admin", "/privacidade"].includes(pathname)) {
      await new Promise((resolve) =>
        vite.middlewares(request, response, resolve),
      );
      if (response.writableEnded) return;
    }
    if (!vite && pathname.startsWith("/assets/")) {
      if (
        await serveFile(
          request,
          response,
          path.join(staticRoot, pathname),
          true,
        )
      )
        return;
    }
    if (!["/", "/conta", "/admin", "/privacidade"].includes(pathname)) {
      response.writeHead(404);
      response.end("Página não encontrada.");
      return;
    }
    let html = await readFile(
      path.join(root, dev ? "index.html" : "dist/index.html"),
      "utf8",
    );
    const pageTitle =
      pathname === "/admin"
        ? "Administração | Perfect Lanches"
        : pathname === "/conta"
          ? "Minha conta | Perfect Lanches"
          : pathname === "/privacidade"
            ? "Privacidade | Perfect Lanches"
            : "Perfect Lanches | Delivery em Fortaleza";
    html = html.replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`);
    if (!demo && pathname === "/")
      html = html.replace(
        'content="noindex, nofollow"',
        'content="index, follow"',
      );
    if (pathname === "/")
      html = html.replace(
        "</head>",
        `<link rel="canonical" href="${new URL(publicUrl).origin}/" /></head>`,
      );
    if (dev) html = await vite.transformIndexHtml(request.url, html);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    if (demo || pathname !== "/")
      response.setHeader("X-Robots-Tag", "noindex, nofollow");
    response.end(request.method === "HEAD" ? undefined : html);
  } catch (error) {
    if (dev) vite?.ssrFixStacktrace(error);
    console.error("Falha ao servir página:", error.message);
    if (!response.headersSent)
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(
      "Não foi possível abrir a página. Confira o build e tente novamente.",
    );
  }
});
if (dev)
  vite = await (
    await import("vite")
  ).createServer({
    root,
    server: { middlewareMode: true, ws: { server } },
    appType: "custom",
  });
server.requestTimeout = 45000;
server.headersTimeout = 15000;
server.listen(port, host, () =>
  console.log(
    `Perfect Lanches: ${publicUrl}\n${demo ? "Demonstração local: Pix sem cobrança real. Painel com acesso demonstrativo." : "Operação com dados reais. Mantenha backup do diretório de dados."}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await vite?.close();
      app.close();
      process.exit(0);
    }),
  );
