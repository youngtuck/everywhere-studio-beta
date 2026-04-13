import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sizes = [192, 512];

sizes.forEach((size) => {
  const r = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.44);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d4a52e"/>
      <stop offset="100%" style="stop-color:#C8961A"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" 
        font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-weight="800" 
        font-size="${fontSize}" fill="white" letter-spacing="-0.02em">E</text>
</svg>`;
  fs.writeFileSync(path.join(dir, `icon-${size}.svg`), svg);
});

console.log("Icon SVGs generated in public/icons/");

try {
  const sharp = (await import("sharp")).default;
  await Promise.all(
    sizes.map(async (size) => {
      const svgPath = path.join(dir, `icon-${size}.svg`);
      const pngPath = path.join(dir, `icon-${size}.png`);
      await sharp(svgPath).resize(size, size).png().toFile(pngPath);
      console.log(`Generated ${pngPath}`);
    })
  );
} catch (e) {
  const isMissingSharp =
    e.code === "MODULE_NOT_FOUND" || e.code === "ERR_MODULE_NOT_FOUND";
  if (isMissingSharp) {
    console.log(
      "sharp not installed, using SVG icons only. Run: npm install sharp --save-dev"
    );
  } else {
    console.error("PNG generation failed:", e.message);
  }
}
