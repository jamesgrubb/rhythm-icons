// =============================================
//  lib/shutterstock.js — Shutterstock API client
//  Backend-only: token never reaches the frontend.
//
//  Env vars:
//    SHUTTERSTOCK_API_TOKEN        (required) Bearer token
//    SHUTTERSTOCK_SUBSCRIPTION_ID  (optional) required by some plans for licensing
// =============================================

const API_BASE = "https://api.shutterstock.com/v2";

function getToken() {
  const token = process.env.SHUTTERSTOCK_API_TOKEN;
  if (!token) {
    throw new Error("SHUTTERSTOCK_API_TOKEN is not configured");
  }
  return token;
}

async function apiRequest(path, { method = "GET", query, body } = {}) {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const message = json?.message || json?.errors?.[0]?.message || `HTTP ${res.status}`;
    const error = new Error(`Shutterstock API error (${res.status}): ${message}`);
    error.status = res.status;
    error.body = json;
    throw error;
  }

  return json;
}

// Bias the query toward stroke-based icon assets, then filter the response
// down to icon *sheets* (multi-icon sets) — one license yields many icons.
//
// Empirically (tested against the live API): the API matches contributor
// TAGS, not the descriptions the website indexes, so phrase operators like
// "editable stroke" massively under-match (2 hits where the website shows
// thousands). What works: simple tag words + popularity sort + metadata
// filtering of the over-fetched response.
const SHEET_ICON = /\bicons?\b/i;
const SHEET_SETWORD = /\b(set|sets|collection|pack|bundle)\b/i;
// Styles that can't be ingested as stroke icons, plus illustration-set spam
const SHEET_EXCLUDE = /(sketch|chalk|doodle|hand\s*drawn|grunge|stamp|watercolor|lettering|calligraphy|slogan|drawn\s+in|seamless|pattern|abstract\s+concept|illustration\s+set|logo|silhouette|typography)/i;

function biasQueryTowardIcons(query) {
  const cleaned = query
    .replace(/"?editable stroke"?/gi, "")
    .replace(/\b(line )?icons?\b/gi, "")
    .trim();
  return `${cleaned} line icons`.trim();
}

function looksLikeSheet(description) {
  const d = description || "";
  return SHEET_ICON.test(d) && SHEET_SETWORD.test(d) && !SHEET_EXCLUDE.test(d);
}

/**
 * Search Shutterstock images (vectors only, filtered to icon sheets).
 * Over-fetches each API page (100) and returns only sheet-like results,
 * so a returned "page" is one API page after filtering.
 */
async function searchVectors({ query, page = 1, perPage = 24 }) {
  const API_PAGE_SIZE = 100; // over-fetch; sheet filter keeps a fraction

  const fetchPage = (p) =>
    apiRequest("/images/search", {
      query: {
        query: biasQueryTowardIcons(query),
        image_type: "vector",
        per_page: API_PAGE_SIZE,
        page: p,
        view: "minimal",
        sort: "popular", // popularity surfaces the big icon sets, like the website
      },
    });

  let data = await fetchPage(page);
  let sheets = (data.data || []).filter((img) => looksLikeSheet(img.description));

  // A page can filter to nothing while later pages still hold sheets —
  // look one API page ahead before reporting an empty result.
  if (sheets.length === 0 && (data.total_count || 0) > page * API_PAGE_SIZE) {
    data = await fetchPage(page + 1);
    sheets = (data.data || []).filter((img) => looksLikeSheet(img.description));
  }

  const apiPages = Math.max(1, Math.ceil((data.total_count || 0) / API_PAGE_SIZE));

  return {
    page,
    per_page: perPage,
    // One frontend page == one API page post-filter; report a total that
    // makes the pager's page count equal the number of API pages.
    total_count: apiPages * perPage,
    results: sheets.slice(0, perPage).map((img) => ({
      id: img.id,
      description: img.description || "",
      image_type: img.image_type, // "vector"
      preview_url:
        img.assets?.huge_thumb?.url ||
        img.assets?.large_thumb?.url ||
        img.assets?.preview?.url ||
        null,
    })),
  };
}

/**
 * Check whether this account already holds a license for an image
 * (avoids spending a second credit).
 * Returns the existing license download info or null.
 */
async function findExistingLicense(imageId) {
  try {
    const data = await apiRequest("/images/licenses", {
      query: { image_id: imageId, per_page: 1 },
    });
    const license = (data.data || [])[0];
    return license || null;
  } catch (err) {
    // A 404/permission issue here should not block licensing — log and continue
    console.warn("[Shutterstock] License lookup failed:", err.message);
    return null;
  }
}

/**
 * License an image (consumes a plan credit) and return { downloadUrl, licenseId }.
 * If a license already exists, re-requests its download URL instead of re-licensing.
 */
async function licenseVector(imageId) {
  const existing = await findExistingLicense(imageId);

  if (existing?.id) {
    // Re-download from the existing license (no credit spend)
    const dl = await apiRequest(`/images/licenses/${existing.id}/downloads`, {
      method: "POST",
      body: {},
    });
    if (dl?.url) {
      console.log("[Shutterstock] Reusing existing license:", existing.id, "for image", imageId);
      return { downloadUrl: dl.url, licenseId: existing.id, reused: true };
    }
  }

  const body = {
    images: [
      {
        image_id: imageId,
        size: "vector",
        ...(process.env.SHUTTERSTOCK_SUBSCRIPTION_ID
          ? { subscription_id: process.env.SHUTTERSTOCK_SUBSCRIPTION_ID }
          : {}),
      },
    ],
  };

  const data = await apiRequest("/images/licenses", { method: "POST", body });
  const result = (data.data || [])[0];

  if (result?.error) {
    throw new Error(`Shutterstock licensing failed: ${result.error}`);
  }
  if (!result?.download?.url) {
    throw new Error("Shutterstock licensing succeeded but no download URL returned");
  }

  console.log("[Shutterstock] Licensed image", imageId, "license:", result.license_id);
  return { downloadUrl: result.download.url, licenseId: result.license_id, reused: false };
}

/**
 * Download the licensed EPS file to a Buffer.
 */
async function downloadAsset(downloadUrl) {
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Asset download failed: HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { searchVectors, findExistingLicense, licenseVector, downloadAsset };
