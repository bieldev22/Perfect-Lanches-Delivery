import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";
import menu from "./menu.json" with { type: "json" };
import { regions } from "./domain.mjs";

export function passwordHash(password, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function openDatabase(directory, { demo, adminEmail, adminPassword }) {
  if (directory !== ":memory:") mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(
    directory === ":memory:"
      ? directory
      : path.join(directory, "perfect.sqlite"),
  );
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', profile TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS orders (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, user_id TEXT REFERENCES users(id), guest_id TEXT NOT NULL, idempotency TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS orders_guest ON orders(guest_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS orders_date ON orders(created_at DESC);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at INTEGER NOT NULL);`);
  const insertProduct = db.prepare(
    "INSERT OR IGNORE INTO products (id,data) VALUES (?,?)",
  );
  for (const p of menu) insertProduct.run(p.id, JSON.stringify(p));
  db.prepare("INSERT OR IGNORE INTO settings(id,data) VALUES (?,?)").run(
    "store",
    JSON.stringify({
      name: "Perfect Lanches",
      tagline: "O lanche perfeito para você.",
      isOpen: true,
      deliveryMinutes: "35–50",
      minimumOrder: 2000,
      hours: "Todos os dias, 18h às 23h",
      pickupAddress: "Aldeota, Fortaleza — endereço a confirmar",
      regions,
    }),
  );
  if (!db.prepare("SELECT id FROM users WHERE role='admin'").get()) {
    db.prepare(
      "INSERT INTO users (id,email,name,password,role,created_at) VALUES (?,?,?,?,?,?)",
    ).run(
      randomUUID(),
      adminEmail,
      "Admin Perfect",
      passwordHash(adminPassword),
      "admin",
      Date.now(),
    );
  }
  const readOrders = () =>
    db
      .prepare("SELECT data FROM orders ORDER BY created_at DESC")
      .all()
      .map((row) => JSON.parse(row.data));
  if (demo && !db.prepare("SELECT id FROM orders LIMIT 1").get()) {
    // Registros sintéticos, isolados na base de demonstração.
    const names = [
      "Ana Exemplo",
      "Bruno Exemplo",
      "Clara Exemplo",
      "Diego Exemplo",
      "Elisa Exemplo",
      "Felipe Exemplo",
      "Gabriela Exemplo",
      "Hugo Exemplo",
    ];
    for (let day = 29; day >= 0; day--) {
      const date = new Date(Date.now() - day * 86400000);
      const weekday = new Date(date.getTime() - 3 * 3600000).getUTCDay();
      const count = [8, 3, 4, 4, 6, 12, 15][weekday];
      for (let i = 0; i < count; i++) {
        const customerIndex = (day + i) % names.length;
        const product = menu[(day + i * 3) % 6],
          side = menu[6 + (i % 3)],
          drink = menu[9 + (i % 3)];
        const items = [product, ...(i % 3 ? [side] : []), drink].map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image,
          quantity: i % 5 === 0 ? 2 : 1,
          note: "",
        }));
        const subtotal = items.reduce(
          (sum, p) => sum + p.price * p.quantity,
          0,
        );
        const region = regions[i % 3 === 0 ? 0 : (day + i) % regions.length];
        date.setHours(18 + (i % 5), (i * 13) % 60, 0, 0);
        const createdAt = Math.min(
          date.getTime(),
          Date.now() - (i + 1) * 60000,
        );
        const id = randomUUID();
        const number = `PL${Number(db.prepare("SELECT COALESCE(MAX(seq),0) AS n FROM orders").get().n) + 1001}`;
        const order = {
          id,
          number,
          userId: null,
          createdAt,
          status: "delivered",
          paymentStatus: "demo_approved",
          paymentMode: "demo",
          demo: true,
          items,
          subtotal,
          deliveryFee: region.fee,
          total: subtotal + region.fee,
          deliveryType: "delivery",
          note: "",
          customer: {
            name: names[customerIndex],
            email: `cliente${customerIndex}@exemplo.invalid`,
            phone: "85900000000",
            region: region.name,
            street: "Rua de demonstração",
            number: "123",
            complement: "",
          },
          timeline: [{ status: "delivered", at: createdAt + 2500000 }],
        };
        db.prepare(
          "INSERT INTO orders(id,user_id,guest_id,idempotency,created_at,data) VALUES (?,?,?,?,?,?)",
        ).run(id, null, "seed", id, createdAt, JSON.stringify(order));
      }
    }
  }
  if (demo) {
    for (const row of db
      .prepare("SELECT seq,id,data FROM orders WHERE guest_id='seed'")
      .all()) {
      const order = JSON.parse(row.data),
        number = `PL${Number(row.seq) + 1000}`;
      if (order.number !== number) {
        order.number = number;
        db.prepare("UPDATE orders SET data=? WHERE id=?").run(
          JSON.stringify(order),
          row.id,
        );
      }
    }
  }
  return {
    db,
    readOrders,
    products: () =>
      db
        .prepare("SELECT data FROM products ORDER BY rowid")
        .all()
        .map((r) => JSON.parse(r.data)),
    store: () =>
      JSON.parse(
        db.prepare("SELECT data FROM settings WHERE id='store'").get().data,
      ),
    getOrder: (id) => {
      const row = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
      return row ? { ...row, order: JSON.parse(row.data) } : null;
    },
    saveOrder: (order) =>
      db
        .prepare("UPDATE orders SET data=? WHERE id=?")
        .run(JSON.stringify(order), order.id),
    audit: (actor, action, target) =>
      db
        .prepare(
          "INSERT INTO audit(actor,action,target,created_at) VALUES (?,?,?,?)",
        )
        .run(actor, action, target, Date.now()),
    close: () => db.close(),
  };
}
