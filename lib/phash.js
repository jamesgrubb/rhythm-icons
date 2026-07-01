// =============================================
//  lib/phash.js — perceptual (average) hash for icons
//  Renders an SVG to a small bitmap and derives a 64-bit shape signature so
//  visually-identical icons match regardless of name or SVG code.
// =============================================

const { Resvg } = require("@resvg/resvg-js");

// 64-char "0/1" average-hash string, or null if it can't be rendered.
function computePhash(svg) {
  if (!svg || typeof svg !== "string") return null;
  const R = 32; // render resolution (downsampled to 8x8 below)
  let render = svg
    .replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, "")
    .replace(/<svg\b/i, `<svg width="${R}" height="${R}"`);
  if (!/xmlns\s*=/.test(render)) render = render.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');

  let img;
  try { img = new Resvg(render, { background: "white" }).render(); }
  catch { return null; }

  const px = img.pixels, w = img.width, h = img.height;
  if (!px || !w || !h) return null;

  // Downsample to an 8x8 grid of average luminance
  const size = 8;
  const sum = new Array(size * size).fill(0);
  const cnt = new Array(size * size).fill(0);
  for (let y = 0; y < h; y++) {
    const gy = Math.min(size - 1, (y * size / h) | 0);
    for (let x = 0; x < w; x++) {
      const gx = Math.min(size - 1, (x * size / w) | 0);
      const i = (y * w + x) * 4;
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const idx = gy * size + gx;
      sum[idx] += lum; cnt[idx]++;
    }
  }
  const cell = sum.map((s, i) => (cnt[i] ? s / cnt[i] : 255));
  const avg = cell.reduce((a, b) => a + b, 0) / cell.length;
  // dark (ink) cells = 1
  return cell.map((g) => (g < avg ? "1" : "0")).join("");
}

// Hamming distance between two equal-length hash strings (Infinity if invalid).
function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

// Distance at/below which two icons are treated as the same artwork.
const DUP_THRESHOLD = 6;

module.exports = { computePhash, hamming, DUP_THRESHOLD };
