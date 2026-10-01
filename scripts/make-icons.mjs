// Generates the PNG icons index.html links to, from the SVGs in /public.
// Run once after changing the SVGs:  npm run icons   - then commit public/*.png
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const INK = { r: 0x12, g: 0x16, b: 0x1c, alpha: 1 };

async function render(svgName, pngName, width, height) {
  const svg = await readFile(path.join(publicDir, svgName));
  await sharp(svg, { density: 384 })
    .resize(width, height, { fit: "contain", background: INK })
    .png()
    .toFile(path.join(publicDir, pngName));
  console.log(`wrote public/${pngName} (${width}x${height})`);
}

await render("favicon.svg", "favicon-32.png", 32, 32);
await render("favicon.svg", "apple-touch-icon.png", 180, 180);
await render("og-image.svg", "og-image.png", 1200, 630);
