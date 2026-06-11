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

// Require at least one icon-set phrase (quoted = phrase match, OR-grouped)
// so results are stroke-based icon assets, not illustrations. A single
// required phrase proved too narrow (1-result searches); loose keywords too
// broad (chalk-stamp illustrations). The OR group keeps both properties.
const ICON_PHRASES = ['"editable stroke"', '"line icon"', '"outline icon"', '"thin line"'];

function biasQueryTowardIcons(query) {
  const cleaned = query.replace(/"?editable stroke"?/gi, "").trim();
  return `(${ICON_PHRASES.join(" OR ")}) ${cleaned}`.trim();
}

/**
 * Search Shutterstock images (vectors only, biased toward line icon sets).
 * Returns a trimmed result set safe to send to the frontend.
 */
async function searchVectors({ query, page = 1, perPage = 24 }) {
  const data = await apiRequest("/images/search", {
    query: {
      query: biasQueryTowardIcons(query),
      image_type: "vector",
      per_page: perPage,
      page,
      view: "minimal",
      sort: "relevance",
    },
  });

  return {
    page: data.page,
    per_page: data.per_page,
    total_count: data.total_count,
    results: (data.data || []).map((img) => ({
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
