// =============================================
//  scripts/generate-icons.js — render the add-in brand icon PNGs
//  Mark: "Slide with icon" — PowerPoint-orange tile, white 16:9 slide
//  outline with a heart icon + title lines (icons on your slide).
//  Usage: node scripts/generate-icons.js
//  Output: public/icon-{16,32,64,80}.png (served at the domain root,
//  matching the manifest IconUrl / Icon.16x16..80x80 resources).
// =============================================

const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

// Stroke weights are tuned per output size so the mark stays legible when tiny.
function markSvg({ slideStroke, lineStroke }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <rect width="80" height="80" rx="18" fill="#D35230"/>
  <rect x="13" y="22" width="54" height="36" rx="5" fill="none" stroke="#fff" stroke-width="${slideStroke}"/>
  <path d="M23 36 a5 5 0 0 1 7 -0.5 a5 5 0 0 1 7 0.5 q2 2.5 -0.5 5 l-6.5 6 l-6.5 -6 q-2.5 -2.5 -0.5 -5z" fill="#fff"/>
  <line x1="44" y1="34" x2="60" y2="34" stroke="#fff" stroke-width="${lineStroke}" stroke-linecap="round"/>
  <line x1="44" y1="45" x2="55" y2="45" stroke="#fff" stroke-width="${lineStroke}" stroke-linecap="round"/>
</svg>`;
}

const SIZES = [
  { px: 16, slideStroke: 6,   lineStroke: 6 },
  { px: 32, slideStroke: 5,   lineStroke: 5 },
  { px: 64, slideStroke: 4.5, lineStroke: 4.5 },
  { px: 80, slideStroke: 4.5, lineStroke: 4.5 },
];

const outDir = path.join(__dirname, "..", "public");
fs.mkdirSync(outDir, { recursive: true });

for (const { px, slideStroke, lineStroke } of SIZES) {
  const svg = markSvg({ slideStroke, lineStroke });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: px } }).render().asPng();
  const file = path.join(outDir, `icon-${px}.png`);
  fs.writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}
