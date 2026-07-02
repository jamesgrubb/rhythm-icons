// =============================================
//  scripts/generate-icons.js — render the add-in brand icon PNGs
//  Source of truth: design/addin-icon.svg (edit in Illustrator, re-run this).
//  Usage: node scripts/generate-icons.js
//  Output: public/icon-{16,32,64,80}.png (served at the domain root,
//  matching the manifest IconUrl / Icon.16x16..80x80 resources).
// =============================================

const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const SRC = path.join(__dirname, "..", "design", "addin-icon.svg");

// Stroke weights are bumped at small sizes so the mark stays legible on the
// ribbon (a 4.5 stroke on the 80-unit artboard is <1px when rendered at 16px).
const SIZES = [
  { px: 16, strokeWidth: 6.5 },
  { px: 32, strokeWidth: 5.5 },
  { px: 64, strokeWidth: 4.5 },
  { px: 80, strokeWidth: 4.5 },
];

const master = fs.readFileSync(SRC, "utf8");
const outDir = path.join(__dirname, "..", "public");
fs.mkdirSync(outDir, { recursive: true });

for (const { px, strokeWidth } of SIZES) {
  const svg = master
    .replace(/stroke-width:\s*[\d.]+px/g, `stroke-width: ${strokeWidth}px`)
    .replace(/stroke-width\s*=\s*"[\d.]+"/g, `stroke-width="${strokeWidth}"`);
  const png = new Resvg(svg, { fitTo: { mode: "width", value: px } }).render().asPng();
  const file = path.join(outDir, `icon-${px}.png`);
  fs.writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}
