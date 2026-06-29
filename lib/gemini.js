// =============================================
//  lib/gemini.js — Gemini vision: icon detection + naming
//  Uses @google/generative-ai (already a project dependency).
//  Env var: GEMINI_API_KEY
// =============================================

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PNG } = require("pngjs");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// A legitimate icon sheet holds tens of icons; hundreds of detections means
// the asset is an illustration, not an icon set — bail out with a clear error
// instead of flooding the review UI.
const MAX_DETECTIONS = 200;

// Gemini loses spatial precision on extreme aspect ratios (it downscales the
// image, so on a wide sheet each icon is tiny and boxes compress toward a
// corner). Sheets wider/taller than this get split into near-square tiles,
// detected separately, then merged — on a ~square tile boxes are accurate.
const MAX_ASPECT = 1.6;
const TILE_OVERLAP = 0.12; // fraction, so icons on a seam are caught whole

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

const DETECT_PROMPT = `This image is a sheet of line icons (an icon set rendered from a vector file).
Detect EVERY individual icon on the sheet.

Return ONLY a JSON array, no markdown, no commentary. Each element:
{
  "box_2d": [ymin, xmin, ymax, xmax],   // bounding box, integers normalized to 0-1000
  "label": "short-descriptive-name",     // 1-3 lowercase words, hyphen-separated, describing what the icon depicts (e.g. "shield-check", "cloud-upload", "heart")
  "tags": ["keyword", ...]               // 3-6 lowercase single-word search keywords: what it depicts, what it's used for, synonyms (e.g. ["security", "protection", "verified", "safety"])
}

Rules:
- One entry per distinct icon. Do not merge neighboring icons.
- Make each box tight around its icon but include the entire icon stroke.
- Ignore text labels, watermarks, titles, frames, and decorative borders.
- If the sheet contains a single icon, return one entry.`;

// Run Gemini on a single image buffer; returns raw normalized detections.
async function detectInImage(model, buf) {
  const result = await model.generateContent([
    { inlineData: { mimeType: "image/png", data: buf.toString("base64") } },
    DETECT_PROMPT,
  ]);
  return parseJsonArray(result.response.text());
}

// Crop a horizontal slice [x0, x0+w) from a decoded PNG → encoded PNG Buffer.
function cropPngX(png, x0, w) {
  const out = new PNG({ width: w, height: png.height });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y * png.width) + (x0 + x)) << 2;
      const di = ((y * w) + x) << 2;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return PNG.sync.write(out);
}

function normalizeDetections(raw) {
  return raw
    .map((d) => ({ ...d, box_2d: d.box_2d || d.box || d.bbox })) // Gemini varies the key
    .filter((d) => Array.isArray(d.box_2d) && d.box_2d.length === 4 && d.label)
    .map((d) => ({
      box_2d: d.box_2d.map((v) => Math.max(0, Math.min(1000, Math.round(Number(v) || 0)))),
      label: String(d.label).toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "icon",
      tags: (Array.isArray(d.tags) ? d.tags : [])
        .map((t) => String(t).toLowerCase().trim().replace(/[^a-z0-9-]+/g, "").slice(0, 30))
        .filter(Boolean)
        .slice(0, 8),
    }))
    .filter((d) => d.box_2d[2] > d.box_2d[0] && d.box_2d[3] > d.box_2d[1]);
}

// Merge detections from overlapping tiles: drop near-duplicate centers
// (same icon seen on two tile seams).
function dedupeDetections(dets) {
  const out = [];
  for (const d of dets) {
    const cx = (d.box_2d[1] + d.box_2d[3]) / 2;
    const cy = (d.box_2d[0] + d.box_2d[2]) / 2;
    const dup = out.some((e) => {
      const ex = (e.box_2d[1] + e.box_2d[3]) / 2;
      const ey = (e.box_2d[0] + e.box_2d[2]) / 2;
      return Math.abs(ex - cx) < 25 && Math.abs(ey - cy) < 25; // <2.5% of the sheet
    });
    if (!dup) out.push(d);
  }
  return out;
}

/**
 * Detect individual icons in a rendered PNG sheet.
 * Wide/tall sheets are tiled into near-square pieces (Gemini localizes poorly
 * on extreme aspect ratios), detected per tile, and merged into full-image
 * normalized coordinates.
 *
 * @param {Buffer} pngBuffer
 * @param {{width:number,height:number}} [dims] rendered PNG dimensions
 * @returns [{ box_2d:[ymin,xmin,ymax,xmax] 0-1000, label, tags }]
 */
async function detectIcons(pngBuffer, dims) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 65536 },
  });

  const width = dims && dims.width;
  const height = dims && dims.height;
  const aspect = width && height ? width / height : 1;

  let detections;
  if (!width || !height || aspect <= MAX_ASPECT) {
    // Single pass (square-ish sheet, or dimensions unknown)
    detections = normalizeDetections(await detectInImage(model, pngBuffer));
  } else {
    // Wide sheet → tile horizontally into ~square overlapping pieces
    const png = PNG.sync.read(pngBuffer);
    const nTiles = Math.max(2, Math.round(aspect));
    const base = Math.ceil(width / nTiles);
    const ov = Math.round(base * TILE_OVERLAP);
    const merged = [];
    for (let t = 0; t < nTiles; t++) {
      const x0 = Math.max(0, t * base - ov);
      const x1 = Math.min(width, (t + 1) * base + ov);
      const tw = x1 - x0;
      const tileBuf = cropPngX(png, x0, tw);
      const raw = normalizeDetections(await detectInImage(model, tileBuf));
      // tile-local (0-1000 over tw) → full-image (0-1000 over width)
      for (const d of raw) {
        const [ymin, xmin, ymax, xmax] = d.box_2d;
        merged.push({
          ...d,
          box_2d: [
            ymin,
            Math.round((x0 + (xmin / 1000) * tw) / width * 1000),
            ymax,
            Math.round((x0 + (xmax / 1000) * tw) / width * 1000),
          ],
        });
      }
      console.log(`[Gemini] tile ${t + 1}/${nTiles}: ${raw.length} icons`);
    }
    detections = dedupeDetections(merged);
    console.log(`[Gemini] tiled detect: ${merged.length} raw → ${detections.length} after dedupe`);
  }

  if (detections.length > MAX_DETECTIONS) {
    throw new Error(
      `Detected ${detections.length} regions — this looks like an illustration, not an icon set. ` +
      `Try assets tagged "line icon set" / "editable stroke".`
    );
  }
  return detections;
}

const LAYOUT_PROMPT = `This image is a Shutterstock vector preview: a set of line icons, usually with a branding/title panel and marketing text (e.g. a coloured panel reading "DATA STATISTICS / 40 Editable Line Icons", a sample icon, watermarks, footers).

Return ONLY JSON, no markdown:
{
  "icon_grid": [ymin, xmin, ymax, xmax],   // tight box (integers 0-1000) around ONLY the area containing the actual reusable icons — EXCLUDE the branding/title panel and any marketing text
  "panels": [[ymin,xmin,ymax,xmax], ...],  // boxes around branding/title panels, sample-icon callouts, watermarks, footers, headings — everything that is NOT a reusable icon
  "icon_count": <integer>                    // how many individual reusable icons are in icon_grid
}

Be generous with "panels" (anything that's clearly marketing/branding, not a catalogue icon) and accurate with icon_grid bounds.`;

/**
 * One coarse vision pass: where the real icons are vs branding/panels, and
 * how many icons. Gemini is reliable at this gross layout reasoning even on
 * wide sheets (unlike precise per-icon boxes). Used to discard surplus
 * graphics and calibrate segmentation.
 * @returns { iconGrid:[ymin,xmin,ymax,xmax]|null, panels:[[...]], iconCount:number|null }
 */
async function analyzeLayout(pngBuffer) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 2048 },
  });
  let parsed = {};
  try {
    const r = await model.generateContent([
      { inlineData: { mimeType: "image/png", data: pngBuffer.toString("base64") } },
      LAYOUT_PROMPT,
    ]);
    parsed = JSON.parse(r.response.text().replace(/```(?:json)?/g, "").trim());
  } catch (e) {
    console.warn("[Gemini] layout pass failed (continuing without):", e.message);
  }
  const box = (b) => (Array.isArray(b) && b.length === 4 ? b.map((v) => Math.max(0, Math.min(1000, Math.round(Number(v) || 0)))) : null);
  return {
    iconGrid: box(parsed.icon_grid),
    panels: (Array.isArray(parsed.panels) ? parsed.panels : []).map(box).filter(Boolean),
    iconCount: Number.isFinite(parsed.icon_count) ? parsed.icon_count : null,
  };
}

function parseJsonArray(text) {
  // Strip accidental markdown fences and find the array
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        /* fall through */
      }
    }
    // Truncated mid-array (token cap hit): salvage the complete objects
    if (start !== -1) {
      const lastComplete = cleaned.lastIndexOf("}");
      if (lastComplete > start) {
        try {
          const parsed = JSON.parse(cleaned.slice(start, lastComplete + 1) + "]");
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.warn(`[Gemini] Response truncated — salvaged ${parsed.length} detections`);
            return parsed;
          }
        } catch {
          /* fall through */
        }
      }
    }
    throw new Error(`Gemini returned unparseable JSON: ${cleaned.slice(0, 200)}`);
  }
}

/**
 * Natural-language icon search: given a user query and the library catalog,
 * return matching icon ids ranked by relevance. The catalog is small
 * (curated library), so the whole thing fits in one prompt — no embeddings.
 *
 * @param {string} query   e.g. "something showing a deadline"
 * @param {Array}  icons   [{ id, name, category, tags: [] }]
 * @returns {string[]} matching ids, best first (possibly empty)
 */
async function matchIcons(query, icons) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
      maxOutputTokens: 2048,
    },
  });

  const catalog = icons.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category || undefined,
    tags: (i.tags || []).length ? i.tags : undefined,
  }));

  const prompt = `You match icons to a user's search intent.

User search: "${String(query).slice(0, 200)}"

Icon catalog (JSON):
${JSON.stringify(catalog)}

Return ONLY JSON: {"ids": ["id1", "id2", ...]}
- ids of icons that match the user's intent, best match first
- match on meaning, purpose, synonyms and concepts — not just literal words
  (e.g. "deadline" matches clock, calendar, hourglass icons)
- include only genuinely relevant icons; an empty list is a valid answer`;

  const result = await model.generateContent(prompt);
  let parsed;
  try {
    parsed = JSON.parse(result.response.text().replace(/```(?:json)?/g, "").trim());
  } catch {
    throw new Error("Gemini returned unparseable JSON for icon search");
  }

  const known = new Set(icons.map((i) => i.id));
  return (Array.isArray(parsed?.ids) ? parsed.ids : [])
    .map(String)
    .filter((id) => known.has(id));
}

module.exports = { detectIcons, analyzeLayout, matchIcons };
