import { writeFile, mkdir } from "node:fs/promises";
await mkdir("public/media", { recursive: true });
for (const [family, name] of [
  ["Outfit:wght@100..900", "outfit"],
  ["DM+Sans:wght@100..1000", "dm-sans"],
]) {
  const response = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}&display=swap`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    },
  );
  if (!response.ok) throw new Error(`Fonte ${name}: ${response.status}`);
  const css = await response.text(),
    urls = [...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)];
  if (!urls.length) throw new Error(`Fonte ${name}: nenhum arquivo WOFF2`);
  const binary = await fetch(urls.at(-1)[1]);
  await writeFile(
    `public/media/${name}.woff2`,
    Buffer.from(await binary.arrayBuffer()),
  );
  console.log(`Fonte local: ${name}`);
}
