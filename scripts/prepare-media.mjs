// Preparação reproduzível das fotografias ilustrativas e da marca fornecida.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const target = path.resolve("public/media");
await mkdir(target, { recursive: true });
const heroSource = process.argv[2];
const logoSource = process.argv[3];
if (heroSource) {
  await sharp(heroSource)
    .resize({ width: 1536 })
    .webp({ quality: 87 })
    .toFile(path.join(target, "hero.webp"));
  for (const [name, rect] of [
    ["bacon", { left: 635, top: 105, width: 880, height: 870 }],
    ["double", { left: 620, top: 90, width: 916, height: 900 }],
  ]) {
    await sharp(heroSource)
      .extract(rect)
      .resize(800, 620, { fit: "cover" })
      .webp({ quality: 86 })
      .toFile(path.join(target, `${name}.webp`));
  }
}
if (logoSource)
  await sharp(logoSource)
    .extract({ left: 335, top: 114, width: 151, height: 151 })
    .resize(256)
    .webp({ quality: 95 })
    .toFile(path.join(target, "logo.webp"));
const photos = {
  classic: "1568901346375-23c9450c58cd",
  smash: "1550547660-d9450f859349",
  chicken: "1606755962773-d324e0a13086",
  veggie: "1520072959219-c595dc870360",
  fries: "1630384060421-cb20d0e0649d",
  "loaded-fries": "1573080496219-bb080dd4f877",
  "rustic-fries": "1641898378503-327316fdde77",
  brownie: "1688279432554-16cd6de375ac",
  pudding: "1702728109878-c61a98d80491",
  cookie: "1499636136210-6f4ee915583e",
};
await Promise.all(
  Object.entries(photos).map(async ([name, id]) => {
    const file = path.join(target, `${name}.webp`);
    try {
      await readFile(file);
      return;
    } catch {
      /* Baixar só quando necessário. */
    }
    const response = await fetch(
      `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=85`,
      { signal: AbortSignal.timeout(25000) },
    );
    if (!response.ok) {
      console.error(`Foto ${name}: HTTP ${response.status}`);
      return;
    }
    await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(800, 620, { fit: "cover" })
      .webp({ quality: 84 })
      .toFile(file);
    console.log(`Foto pronta: ${name}`);
  }),
);
for (const [name, color, label, detail] of [
  ["cola", "#c92c29", "Coca-Cola", "ORIGINAL"],
  ["cola-zero", "#181818", "Coca-Cola", "ZERO AÇÚCAR"],
  ["guarana", "#267345", "Guaraná", "ANTARCTICA"],
]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="620"><defs><radialGradient id="bg"><stop stop-color="#e8decb"/><stop offset="1" stop-color="#f5f0e6"/></radialGradient><linearGradient id="can"><stop stop-color="#000" stop-opacity=".55"/><stop offset=".28" stop-color="#fff" stop-opacity=".2"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient><linearGradient id="metal"><stop stop-color="#9a9e9d"/><stop offset=".4" stop-color="#f3f4f1"/><stop offset="1" stop-color="#8d9393"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="800" height="620" fill="url(#bg)"/><ellipse cx="405" cy="535" rx="115" ry="19" opacity=".2" filter="url(#blur)"/><g transform="translate(304 68) rotate(-6 96 240)"><rect x="0" y="20" width="192" height="444" rx="34" fill="${color}"/><rect x="0" y="20" width="192" height="444" rx="34" fill="url(#can)"/><ellipse cx="96" cy="27" rx="91" ry="23" fill="url(#metal)"/><ellipse cx="96" cy="27" rx="78" ry="15" fill="#c4c8c5" stroke="#7d8281" stroke-width="3"/><ellipse cx="96" cy="26" rx="22" ry="10" fill="#878b89"/><rect x="83" y="15" width="25" height="14" rx="7" fill="#d9dcd9"/><text x="96" y="224" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="bold" font-size="${name === "guarana" ? 36 : 33}" fill="white">${label}</text><path d="M25 244 Q100 210 171 250" fill="none" stroke="white" stroke-width="4" opacity=".8"/><text x="96" y="284" text-anchor="middle" font-family="Arial" letter-spacing="2" font-size="13" fill="white">${detail}</text><text x="96" y="407" text-anchor="middle" font-family="Arial" font-size="18" fill="white">350 ml</text><path d="M9 448 Q96 470 183 448 L180 462 Q96 488 12 462Z" fill="url(#metal)"/><g fill="white" opacity=".25"><ellipse cx="21" cy="105" rx="3" ry="5"/><ellipse cx="150" cy="125" rx="4" ry="6"/><ellipse cx="46" cy="342" rx="3" ry="4"/><ellipse cx="169" cy="322" rx="3" ry="5"/><ellipse cx="100" cy="90" rx="3" ry="4"/></g></g></svg>`;
  await sharp(Buffer.from(svg))
    .webp({ quality: 90 })
    .toFile(path.join(target, `${name}.webp`));
}
console.log(
  "Mídia preparada. As embalagens são ilustrações; substitua por fotos oficiais no painel.",
);
