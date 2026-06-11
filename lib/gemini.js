// =============================================
//  lib/gemini.js — Gemini vision: icon detection + naming
//  Uses @google/generative-ai (already a project dependency).
//  Env var: GEMINI_API_KEY
// =============================================

const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// A legitimate icon sheet holds tens of icons; hundreds of detections means
// the asset is an illustration, not an icon set — bail out with a clear error
// instead of flooding the review UI.
const MAX_DETECTIONS = 80;

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
  "label": "short-descriptive-name"      // 1-3 lowercase words, hyphen-separated, describing what the icon depicts (e.g. "shield-check", "cloud-upload", "heart")
}

Rules:
- One entry per distinct icon. Do not merge neighboring icons.
- Make each box tight around its icon but include the entire icon stroke.
- Ignore text labels, watermarks, titles, frames, and decorative borders.
- If the sheet contains a single icon, return one entry.`;

/**
 * Detect individual icons in a rendered PNG sheet.
 * Returns [{ box_2d: [ymin, xmin, ymax, xmax] (0-1000), label }]
 */
async function detectIcons(pngBuffer) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
      // Dense sheets produce long arrays; default cap truncates mid-JSON
      maxOutputTokens: 32768,
    },
  });

  const result = await model.generateContent([
    { inlineData: { mimeType: "image/png", data: pngBuffer.toString("base64") } },
    DETECT_PROMPT,
  ]);

  const text = result.response.text();
  const detections = parseJsonArray(text);

  if (detections.length > MAX_DETECTIONS) {
    throw new Error(
      `Detected ${detections.length} regions — this looks like an illustration, not an icon set. ` +
      `Try assets tagged "line icon set" / "editable stroke".`
    );
  }

  // Validate + clamp
  return detections
    .filter((d) => Array.isArray(d.box_2d) && d.box_2d.length === 4 && d.label)
    .map((d) => ({
      box_2d: d.box_2d.map((v) => Math.max(0, Math.min(1000, Math.round(Number(v) || 0)))),
      label: String(d.label).toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "icon",
    }))
    .filter((d) => d.box_2d[2] > d.box_2d[0] && d.box_2d[3] > d.box_2d[1]);
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

module.exports = { detectIcons };
