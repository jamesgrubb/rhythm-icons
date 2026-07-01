// =============================================
//  server.js — Backend API (Node / Express)
//  Validates Azure AD JWTs and serves icons.
//
//  Install deps:
//    npm install express cors helmet jwks-rsa jsonwebtoken dotenv pg
// =============================================

require('dotenv').config();
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const jwt     = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const pool    = require("./db/connection");

const app  = express();
const PORT = process.env.PORT || 3001;

// ---- Config (use env vars in production; dev defaults match auth.js) ----
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || "dbd0413f-9515-4bd1-945a-1948b655558b";
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || "19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c";

// Azure may send aud as client ID, Application ID URI, or array
const JWT_AUDIENCE = [AZURE_CLIENT_ID, `api://${AZURE_CLIENT_ID}`];

// Multi-tenant: We'll validate issuer format dynamically based on token's tid claim
// Accept issuers from any Azure AD tenant
const jwksClients = {}; // Cache JWKS clients per tenant

// Dynamic JWKS client per tenant
function getJwksClient(tenantId) {
  if (!jwksClients[tenantId]) {
    const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
    jwksClients[tenantId] = jwksClient({ jwksUri, cache: true, rateLimit: true });
  }
  return jwksClients[tenantId];
}

function getSigningKey(tenantId, header, callback) {
  const client = getJwksClient(tenantId);
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function audienceValid(payload) {
  const aud = payload.aud;
  if (!aud) return false;
  const allowed = new Set(JWT_AUDIENCE);
  if (typeof aud === "string") return allowed.has(aud) || (aud.startsWith("api://") && aud.includes(AZURE_CLIENT_ID));
  if (Array.isArray(aud)) return aud.some((a) => allowed.has(a) || (a.startsWith && a.startsWith("api://") && a.includes(AZURE_CLIENT_ID)));
  return false;
}

const isDev = process.env.NODE_ENV !== "production";
/** Set SKIP_JWT_VERIFY=1 in .env to accept any Bearer token in dev (decode only, no signature check). */
const skipJwtVerify = isDev && (process.env.SKIP_JWT_VERIFY === "1" || process.env.SKIP_JWT_VERIFY === "true");

function send401(res, msg, decodedPayload) {
  const body = { error: "Invalid or expired token" };
  if (isDev && decodedPayload) {
    body.debug = {
      token_aud: decodedPayload.aud,
      token_iss: decodedPayload.iss,
      expected_aud: JWT_AUDIENCE,
      expected_iss: JWT_ISSUERS,
    };
  }
  if (isDev && msg) body.debug_message = msg;
  if (isDev) console.error("[Auth] 401 response:", JSON.stringify(body, null, 2));
  res.status(401).json(body);
}

// ---- Azure AD JWT middleware ----
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = authHeader.slice(7);
  const decoded = jwt.decode(token);

  if (skipJwtVerify && decoded && (decoded.sub || decoded.oid)) {
    console.warn("[Auth] SKIP_JWT_VERIFY: accepting token without signature verification (dev only)");
    req.user = decoded;
    return next();
  }

  // Multi-tenant: Extract tenant ID from token
  const tenantId = decoded?.tid;
  if (!tenantId) {
    console.error("[Auth] No tenant ID (tid) in token");
    return send401(res, "No tenant ID in token", decoded);
  }

  // Validate issuer format (accept any Azure AD tenant)
  const validIssuerFormats = [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://login.microsoftonline.com/${tenantId}/`,
    `https://sts.windows.net/${tenantId}/`,
  ];

  jwt.verify(
    token,
    (header, callback) => getSigningKey(tenantId, header, callback),
    {
      audience: JWT_AUDIENCE,
      issuer: validIssuerFormats,
      algorithms: ["RS256"],
    },
    (err, decodedVerified) => {
      if (err) {
        console.error("[Auth] JWT verify failed:", err.message);
        if (decoded) console.error("[Auth] Token aud:", decoded.aud, "| iss:", decoded.iss, "| tid:", decoded.tid);
        return send401(res, err.message, decoded);
      }
      // Audience already validated by jwt.verify, but double-check with custom logic
      if (!audienceValid(decodedVerified)) {
        console.error("[Auth] Audience not allowed. Token aud:", decodedVerified.aud, "| expected:", JWT_AUDIENCE);
        return send401(res, "Audience not allowed", decodedVerified);
      }
      req.user = decodedVerified;
      next();
    }
  );
}

// ---- Tenant Auto-Provisioning Middleware ----
async function ensureTenantExists(req, res, next) {
  const azureTenantId = req.user.tid; // Azure AD tenant ID from JWT
  const tenantName = req.user.tenant_ctry || req.user.name || azureTenantId; // Use org name if available

  if (!azureTenantId) {
    console.error("[Tenant] No tenant ID in JWT token");
    return res.status(400).json({ error: "Invalid token: missing tenant ID" });
  }

  try {
    // Check if tenant exists
    const existing = await pool.query(
      'SELECT id FROM tenants WHERE azure_tenant_id = $1',
      [azureTenantId]
    );

    if (existing.rows.length === 0) {
      // Create new tenant
      await pool.query(
        'INSERT INTO tenants (azure_tenant_id, name, created_at) VALUES ($1, $2, NOW())',
        [azureTenantId, tenantName]
      );
      console.log('[Tenant] Auto-provisioned new tenant:', azureTenantId, '-', tenantName);
    }

    next();
  } catch (error) {
    console.error('[Tenant] Error provisioning tenant:', error);
    // Don't fail the request - log error and continue
    // Fallback to default tenant will happen in getTenantId()
    next();
  }
}

// ---- Role Extraction Middleware ----
async function extractUserRole(req, res, next) {
  const azureUserId = req.user.oid; // Azure AD Object ID (unique user identifier)
  const azureTenantId = req.user.tid; // Azure AD Tenant ID
  const email = req.user.email || req.user.preferred_username || req.user.unique_name;
  const name = req.user.name || email;

  // Extract app roles from JWT (assigned via Azure AD)
  const appRoles = req.user.roles || [];
  console.log('[Role] User roles from Azure AD:', appRoles);

  // Determine role: admin > viewer > user (default)
  const roleFromAzure = appRoles.includes('admin') ? 'admin'
                      : appRoles.includes('viewer') ? 'viewer'
                      : 'user';

  try {
    // Get tenant ID from database
    const tenantResult = await pool.query(
      'SELECT id FROM tenants WHERE azure_tenant_id = $1',
      [azureTenantId]
    );

    if (tenantResult.rows.length === 0) {
      console.error('[Role] Tenant not found:', azureTenantId);
      return res.status(403).json({ error: 'Tenant not provisioned' });
    }

    const tenantId = tenantResult.rows[0].id;

    // Look up or auto-provision user
    let userResult = await pool.query(
      'SELECT role, id FROM users WHERE azure_user_id = $1',
      [azureUserId]
    );

    if (userResult.rows.length === 0) {
      // Auto-provision user with role from Azure AD
      console.log('[Role] Auto-provisioning user:', email, 'with role:', roleFromAzure);
      await pool.query(
        `INSERT INTO users (tenant_id, azure_user_id, email, name, role, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [tenantId, azureUserId, email, name, roleFromAzure]
      );
      req.user.dbRole = roleFromAzure;
      req.user.userId = null; // Will be set on next request
    } else {
      // User exists - sync role from Azure AD (Azure AD is source of truth)
      const dbRole = userResult.rows[0].role;
      req.user.userId = userResult.rows[0].id;

      if (dbRole !== roleFromAzure) {
        console.log('[Role] Syncing role for', email, 'from DB:', dbRole, 'to Azure AD:', roleFromAzure);
        await pool.query(
          'UPDATE users SET role = $1 WHERE azure_user_id = $2',
          [roleFromAzure, azureUserId]
        );
      }

      req.user.dbRole = roleFromAzure; // Always use Azure AD role as source of truth
      console.log('[Role] User authenticated:', email, 'with role:', req.user.dbRole);
    }

    req.user.tenantId = tenantId;
    next();
  } catch (error) {
    console.error('[Role] Error extracting user role:', error);
    res.status(500).json({ error: 'Failed to determine user permissions' });
  }
}

// ---- Authorization Middleware ----
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user.dbRole) {
      return res.status(403).json({ error: 'No role assigned' });
    }

    if (!allowedRoles.includes(req.user.dbRole)) {
      console.warn(`[Auth] Access denied: user role '${req.user.dbRole}' not in allowed roles:`, allowedRoles);
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.dbRole
      });
    }

    next();
  };
}

// ---- Middleware ----
// Configure helmet with Office Add-in compatible CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Office Add-ins may use inline scripts
        "https://appsforoffice.microsoft.com", // Office.js
        "https://alcdn.msauth.net", // MSAL.js
      ],
      connectSrc: [
        "'self'",
        "https://login.microsoftonline.com", // Azure AD authentication
        "https://*.login.microsoftonline.com",
      ],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Google Fonts
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"], // Google Fonts
      frameSrc: ["'self'", "https://login.microsoftonline.com", "https://*.oaspapps.com"], // Office telemetry
      frameAncestors: ["*"], // Allow Office to embed the taskpane
    },
  },
}));
app.use(cors({
  origin: [
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
    "https://localhost:3000" // Keep for local development
  ].filter(Boolean)
}));
app.use(express.json());

// ---- Serve static files ----
app.use(express.static("dist")); // Built frontend (webpack output)
app.use(express.static("public")); // Legal pages and support content

// ---- Legal page routes (allow URLs without .html extension) ----
app.get("/privacy", (req, res) => res.sendFile(__dirname + "/public/privacy.html"));
app.get("/terms", (req, res) => res.sendFile(__dirname + "/public/terms.html"));
app.get("/support", (req, res) => res.sendFile(__dirname + "/public/support.html"));

// ---- Manifest download route ----
app.get("/manifest.xml", (req, res) => {
  res.set("Content-Type", "application/xml");
  res.sendFile(__dirname + "/public/manifest.xml");
});

// ---- Helper: Get tenant ID from user ----
// In a real app, you'd look up the user's tenant_id from the users table
// For now, we'll use a default tenant or extract from Azure AD claims
async function getTenantId(user) {
  // Option 1: Use Azure AD tenant ID to map to our tenant
  const azureTenantId = user.tid; // Azure AD tenant ID from JWT

  try {
    const result = await pool.query(
      'SELECT id FROM tenants WHERE azure_tenant_id = $1 LIMIT 1',
      [azureTenantId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Option 2: Fall back to default tenant if no match
    const defaultTenant = await pool.query(
      'SELECT id FROM tenants WHERE name = $1 LIMIT 1',
      ['Default Organization']
    );

    return defaultTenant.rows[0]?.id || null;
  } catch (error) {
    console.error('[Database] Error getting tenant ID:', error);
    return null;
  }
}

// ---- Icons API ----

// GET /api/icons — returns icon list filtered by tenant
app.get("/api/icons", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin', 'user', 'viewer'), async (req, res) => {
  console.log("[API] GET /api/icons — auth OK, user:", req.user?.sub ?? req.user?.oid, "role:", req.user.dbRole);
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(403).json({ error: "No tenant found for user" });
    }

    // Fetch icons for this tenant OR public icons, aggregating their assigned
    // groups (clients) into a `clients` array (many-to-many via icon_clients).
    const result = await pool.query(
      `SELECT i.icon_id as id, i.id as uuid, i.name, i.category, i.svg, i.tags, i.is_public,
              t.name as tenant_name,
              COALESCE(
                json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY c.name)
                  FILTER (WHERE c.id IS NOT NULL),
                '[]'
              ) AS clients
       FROM icons i
       LEFT JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN icon_clients ic ON ic.icon_id = i.id
       LEFT JOIN clients c ON c.id = ic.client_id
       WHERE i.tenant_id = $1 OR i.is_public = true
       GROUP BY i.id, t.name
       ORDER BY i.category, i.name`,
      [tenantId]
    );

    const withClients = result.rows.filter(r => (r.clients || []).length > 0).length;
    console.log(`[API] Returning ${result.rows.length} icons, ${withClients} assigned to one+ groups`);

    res.json(result.rows);
  } catch (error) {
    console.error('[API] Error fetching icons:', error);
    res.status(500).json({ error: "Failed to fetch icons" });
  }
});

// POST /api/icons/ai-search — natural-language search over the library.
// Gemini maps the query to icon ids by meaning (synonyms, concepts), not
// literal text. Catalog is small, so it ships whole in one prompt.
app.post("/api/icons/ai-search", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin', 'user', 'viewer'), async (req, res) => {
  const query = String(req.body?.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Missing required field: query" });
  }

  try {
    const result = await pool.query(
      `SELECT icon_id as id, name, category, tags
       FROM icons
       WHERE tenant_id = $1 OR is_public = true`,
      [req.user.tenantId]
    );

    const gemini = require("./lib/gemini");
    const ids = await gemini.matchIcons(query, result.rows);
    console.log(`[AI Search] "${query}" → ${ids.length}/${result.rows.length} icons (${req.user.dbRole})`);
    res.json({ ids });
  } catch (error) {
    console.error('[AI Search] Error:', error.message);
    const status = error.message.includes("not configured") ? 503 : 500;
    res.status(status).json({ error: "AI search failed", detail: error.message });
  }
});

// GET /api/icons/:id — fetch a single icon
app.get("/api/icons/:id", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin', 'user', 'viewer'), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(403).json({ error: "No tenant found for user" });
    }

    const result = await pool.query(
      `SELECT icon_id as id, name, category, svg
       FROM icons
       WHERE icon_id = $1 AND (tenant_id = $2 OR is_public = true)
       LIMIT 1`,
      [req.params.id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Icon not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[API] Error fetching icon:', error);
    res.status(500).json({ error: "Failed to fetch icon" });
  }
});

// ---- Stroke weight validation ----
// Icons must be stroke-based (so they recolour with the PowerPoint theme), but
// the weight is intentionally NOT forced to a fixed value: ingested icons
// preserve their source line weight (often thin for dense icons), and the
// insert path renders each at its own weight. So we only require that a
// positive stroke-width is declared and isn't absurdly large.
function checkStrokeWeight(svg) {
  const widths = [];
  for (const m of svg.matchAll(/stroke-width=["']([^"']+)["']/g)) {
    const w = parseFloat(m[1]);
    if (!isNaN(w)) widths.push(w);
  }
  for (const m of svg.matchAll(/stroke-width:\s*([\d.]+)/g)) {
    const w = parseFloat(m[1]);
    if (!isNaN(w)) widths.push(w);
  }

  if (widths.length === 0 || !widths.some(w => w > 0)) {
    return {
      ok: false,
      error: 'SVG has no positive stroke-width - icons must be stroke-based (e.g. stroke-width="2") so they recolour with the document theme'
    };
  }

  // Sanity bound only: a stroke-width far larger than the 24-unit viewBox means
  // the icon is malformed (e.g. an un-scaled raw coordinate slipped through).
  const tooThick = widths.filter(w => w > 24);
  if (tooThick.length > 0) {
    return { ok: false, error: `Stroke weight implausibly large (${tooThick.join(", ")}) for a 24-unit icon` };
  }

  return { ok: true };
}

// POST /api/icons — add a new icon (admin only)
app.post("/api/icons", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const { id, name, category, svg, client_id, client_ids, tags } = req.body;

  if (!id || !name || !svg) {
    return res.status(400).json({ error: "Missing required fields: id, name, svg" });
  }

  // Group assignment: accept client_ids[] (multi) or legacy client_id (single)
  const groupIds = [...new Set(
    (Array.isArray(client_ids) ? client_ids : (client_id ? [client_id] : []))
      .filter(Boolean).map(String)
  )];

  // Sanitize tags: lowercase single words, capped in count and length
  const cleanTags = (Array.isArray(tags) ? tags : [])
    .map(t => String(t).toLowerCase().trim().replace(/[^a-z0-9-]+/g, "").slice(0, 30))
    .filter(Boolean)
    .slice(0, 12);

  // VALIDATE SVG CONTENT
  // 1. Require a viewBox (any dimensions — icons display and insert correctly at
  //    any viewBox; sheet, upload, and paste sources vary in size).
  const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);
  if (!viewBoxMatch) {
    return res.status(400).json({ error: "SVG must have a viewBox attribute" });
  }

  // 2. Check for fill attributes (stroke-based icons only)
  const fillMatches = svg.match(/fill=["']([^"']*)["']/g) || svg.match(/fill:\s*([^;}\s]+)/g);
  const hasInvalidFill = fillMatches && fillMatches.some(match =>
    !match.includes('none') && !match.includes('fill:none')
  );

  if (hasInvalidFill) {
    return res.status(400).json({
      error: "SVG contains fill attributes - only stroke-based icons allowed"
    });
  }

  // 3. Check stroke weight renders in line with the library convention (2 ± 0.5).
  // Ingested icons carry a scale() transform with a compensated stroke-width,
  // so the effective width is stroke-width × scale.
  const strokeCheck = checkStrokeWeight(svg);
  if (!strokeCheck.ok) {
    return res.status(400).json({ error: strokeCheck.error });
  }

  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(403).json({ error: "No tenant found for user" });
    }

    const result = await pool.query(
      `INSERT INTO icons (tenant_id, icon_id, name, category, svg, client_id, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, icon_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         svg = EXCLUDED.svg,
         client_id = EXCLUDED.client_id,
         tags = EXCLUDED.tags,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, (xmax = 0) AS inserted`,
      [tenantId, id, name, category || 'Uncategorized', svg, groupIds[0] || null, JSON.stringify(cleanTags)]
    );

    // Replace this icon's group assignments (validate the groups belong to tenant)
    const iconUuid = result.rows[0].id;
    await pool.query('DELETE FROM icon_clients WHERE icon_id = $1', [iconUuid]);
    if (groupIds.length) {
      await pool.query(
        `INSERT INTO icon_clients (icon_id, client_id)
         SELECT $1, c.id FROM clients c
         WHERE c.tenant_id = $2 AND c.id = ANY($3::uuid[])
         ON CONFLICT DO NOTHING`,
        [iconUuid, tenantId, groupIds]
      );
    }

    const wasInserted = result.rows[0].inserted;
    const action = wasInserted ? 'created' : 'updated';

    console.log(`[API] Icon ${action} by admin:`, req.user.email, '- Icon ID:', id, '- Client ID:', client_id || 'none');
    res.status(wasInserted ? 201 : 200).json({ ok: true, id, action });
  } catch (error) {
    console.error('[API] Error creating/updating icon:', error);
    res.status(500).json({ error: "Failed to create/update icon" });
  }
});

// GET /api/user/profile — get current user's profile and role
app.get("/api/user/profile", requireAuth, ensureTenantExists, extractUserRole, async (req, res) => {
  try {
    const tenantResult = await pool.query(
      'SELECT name FROM tenants WHERE id = $1',
      [req.user.tenantId]
    );

    res.json({
      name: req.user.name,
      email: req.user.email || req.user.preferred_username || req.user.unique_name,
      role: req.user.dbRole,
      tenant: {
        id: req.user.tenantId,
        name: tenantResult.rows[0]?.name || 'Unknown'
      }
    });
  } catch (error) {
    console.error('[API] Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// =============================================
// CLIENT MANAGEMENT ENDPOINTS
// =============================================

// GET /api/clients — get all clients for current tenant
app.get("/api/clients", requireAuth, ensureTenantExists, extractUserRole, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(403).json({ error: "No tenant found for user" });
    }

    const result = await pool.query(
      `SELECT id, name, created_at
       FROM clients
       WHERE tenant_id = $1
       ORDER BY name`,
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[API] Error fetching clients:', error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// POST /api/clients — create a new client (admin only)
app.post("/api/clients", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Client name is required" });
  }

  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(403).json({ error: "No tenant found for user" });
    }

    const result = await pool.query(
      `INSERT INTO clients (tenant_id, name)
       VALUES ($1, $2)
       RETURNING id, name, created_at`,
      [tenantId, name.trim()]
    );

    console.log('[API] Client created by admin:', req.user.email, '- Client:', name);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[API] Error creating client:', error);

    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: "Client name already exists for this tenant" });
    }

    res.status(500).json({ error: "Failed to create client" });
  }
});

// DELETE /api/clients/:id — delete a client (admin only)
app.delete("/api/clients/:id", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  try {
    // Verify client belongs to user's tenant
    const result = await pool.query(
      'DELETE FROM clients WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    console.log('[API] Client deleted by admin:', req.user.email, '- Client ID:', id);
    res.json({ ok: true, id });
  } catch (error) {
    console.error('[API] Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// =============================================
// SHUTTERSTOCK INTEGRATION ENDPOINTS
// Search is open to all signed-in roles; licensing/ingest stays admin-only
// =============================================
const shutterstock = require("./lib/shutterstock");
const ingestJobs = require("./lib/jobs");

// GET /api/shutterstock/search?query=&page= — proxy Shutterstock vector search
app.get("/api/shutterstock/search", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin', 'user', 'viewer'), async (req, res) => {
  const { query, page } = req.query;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Missing required parameter: query" });
  }

  try {
    const results = await shutterstock.searchVectors({
      query: query.trim(),
      page: Math.max(1, parseInt(page, 10) || 1),
    });
    console.log(`[Shutterstock] Search "${query}" page ${page || 1} → ${results.results.length} results (${req.user.dbRole}: ${req.user.email})`);
    res.json(results);
  } catch (error) {
    console.error('[Shutterstock] Search error:', error.message);
    const status = error.message.includes("not configured") ? 503 : (error.status === 401 ? 502 : 500);
    res.status(status).json({ error: "Shutterstock search failed", detail: error.message });
  }
});

// POST /api/shutterstock/ingest — license an image and start the ingestion pipeline
app.post("/api/shutterstock/ingest", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const { image_id } = req.body;

  if (!image_id) {
    return res.status(400).json({ error: "Missing required field: image_id" });
  }

  try {
    const job = await ingestJobs.createIngestJob({
      tenantId: req.user.tenantId,
      imageId: String(image_id),
      createdBy: req.user.email || req.user.preferred_username,
    });
    console.log(`[Shutterstock] Ingest job ${job.id} created for image ${image_id} by ${req.user.email}`);
    res.status(202).json({ job_id: job.id, status: job.status });
  } catch (error) {
    console.error('[Shutterstock] Ingest error:', error.message);
    res.status(500).json({ error: "Failed to start ingestion", detail: error.message });
  }
});

// POST /api/shutterstock/upload — ingest a manually-uploaded sheet.
// Accepts an EPS (heuristic segmentation) OR — preferred for accurate, complete
// icons — an original grouped SVG (Illustrator "Save As SVG"), which segments
// by its real icon groups. Body is the raw file bytes; filename in X-Filename.
app.post(
  "/api/shutterstock/upload",
  requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'),
  express.raw({ type: () => true, limit: "30mb" }),
  async (req, res) => {
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({ error: "Empty upload body" });
    }

    const headStr = buffer.subarray(0, 512).toString("latin1");
    const head = buffer.subarray(0, 4);
    const isEps = headStr.startsWith("%!PS") || headStr.startsWith("%PDF")
      || (head[0] === 0xc5 && head[1] === 0xd0 && head[2] === 0xd3 && head[3] === 0xc6);
    const isSvg = /<svg[\s>]/i.test(headStr) || (/^\s*<\?xml/i.test(headStr) && buffer.toString("latin1").includes("<svg"));
    if (!isEps && !isSvg) {
      return res.status(400).json({ error: "File must be an EPS or SVG — upload the .eps or (better) the original .svg" });
    }

    try {
      const filename = decodeURIComponent(req.get("X-Filename") || (isSvg ? "upload.svg" : "upload.eps")).slice(0, 200);
      const job = await ingestJobs.createUploadJob({
        tenantId: req.user.tenantId,
        buffer,
        filename,
        createdBy: req.user.email || req.user.preferred_username,
      });
      console.log(`[Shutterstock] Upload job ${job.id} created for "${filename}" (${isSvg ? "SVG" : "EPS"}, ${(buffer.length / 1024).toFixed(0)} KB)`);
      res.status(202).json({ job_id: job.id, status: job.status });
    } catch (error) {
      console.error('[Shutterstock] Upload error:', error.message);
      res.status(500).json({ error: "Failed to start upload ingestion", detail: error.message });
    }
  }
);

// GET /api/shutterstock/jobs/:id — poll job status (tenant-scoped)
app.get("/api/shutterstock/jobs/:id", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  try {
    const job = await ingestJobs.getJob(req.params.id, req.user.tenantId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
  } catch (error) {
    console.error('[Shutterstock] Job fetch error:', error.message);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

// POST /api/shutterstock/jobs/:id/complete — mark a reviewed job as done
app.post("/api/shutterstock/jobs/:id/complete", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  try {
    await ingestJobs.markJobDone(req.params.id, req.user.tenantId);
    res.json({ ok: true });
  } catch (error) {
    console.error('[Shutterstock] Job complete error:', error.message);
    res.status(500).json({ error: "Failed to update job" });
  }
});

// PUT /api/icons/:id — update an existing icon (admin only)
app.put("/api/icons/:id", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, category, svg, is_public, client_id, client_ids } = req.body;
  const tenantId = req.user.tenantId;

  // Group assignment: accept client_ids[] (multi) or legacy client_id (single)
  const groupIds = [...new Set(
    (Array.isArray(client_ids) ? client_ids : (client_id ? [client_id] : []))
      .filter(Boolean).map(String)
  )];

  try {
    // Verify icon belongs to user's tenant (prevent cross-tenant updates)
    const existing = await pool.query(
      'SELECT id FROM icons WHERE icon_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Icon not found or access denied' });
    }
    const iconUuid = existing.rows[0].id;

    await pool.query(
      `UPDATE icons
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           svg = COALESCE($3, svg),
           is_public = COALESCE($4, is_public),
           client_id = $5,
           updated_at = NOW()
       WHERE icon_id = $6 AND tenant_id = $7`,
      [name, category, svg, is_public, groupIds[0] || null, id, tenantId]
    );

    // Replace group assignments
    await pool.query('DELETE FROM icon_clients WHERE icon_id = $1', [iconUuid]);
    if (groupIds.length) {
      await pool.query(
        `INSERT INTO icon_clients (icon_id, client_id)
         SELECT $1, c.id FROM clients c
         WHERE c.tenant_id = $2 AND c.id = ANY($3::uuid[])
         ON CONFLICT DO NOTHING`,
        [iconUuid, tenantId, groupIds]
      );
    }

    console.log(`[API] Icon updated: ${id} - groups: ${groupIds.length}`);
    res.json({ ok: true, message: 'Icon updated successfully' });
  } catch (error) {
    console.error('[API] Error updating icon:', error);
    res.status(500).json({ error: 'Failed to update icon' });
  }
});

// DELETE /api/icons/:id — delete an icon (admin only)
app.delete("/api/icons/:id", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const { id } = req.params; // globally-unique icon uuid
  const tenantId = req.user.tenantId;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid icon id' });
  }

  try {
    // Admins may delete their own tenant's icons or shared (public/seeded) icons
    const result = await pool.query(
      'DELETE FROM icons WHERE id = $1::uuid AND (tenant_id = $2 OR is_public = true) RETURNING id',
      [id, tenantId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Icon not found or access denied' });
    }

    res.json({ ok: true, message: 'Icon deleted successfully' });
  } catch (error) {
    console.error('[API] Error deleting icon:', error);
    res.status(500).json({ error: 'Failed to delete icon' });
  }
});

// POST /api/icons/bulk-delete — delete multiple icons by icon_id (admin only)
app.post("/api/icons/bulk-delete", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const tenantId = req.user.tenantId;
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Provide a non-empty 'ids' array" });
  }
  // ids are globally-unique icon uuids
  const uuids = [...new Set(ids.map(String))].filter(x => /^[0-9a-f-]{36}$/i.test(x));
  if (uuids.length === 0) {
    return res.status(400).json({ error: "No valid icon ids" });
  }

  try {
    // Admins may delete their own tenant's icons or shared (public/seeded) icons;
    // icon_clients rows cascade via the icons.id FK.
    const result = await pool.query(
      'DELETE FROM icons WHERE id = ANY($2::uuid[]) AND (tenant_id = $1 OR is_public = true) RETURNING id',
      [tenantId, uuids]
    );

    console.log('[API] Bulk delete by admin:', req.user.email, '-', result.rowCount, 'icons');
    res.json({ ok: true, deleted: result.rowCount });
  } catch (error) {
    console.error('[API] Error bulk-deleting icons:', error);
    res.status(500).json({ error: 'Failed to delete icons' });
  }
});

// POST /api/icons/name-svg — auto-name a single SVG via Gemini (admin only),
// the same naming used when segmenting sheets. Returns { name, tags }.
app.post("/api/icons/name-svg", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const { svg } = req.body;
  if (!svg || typeof svg !== 'string' || !/<svg[\s>]/i.test(svg)) {
    return res.status(400).json({ error: "Provide SVG markup" });
  }
  try {
    const gemini = require("./lib/gemini");
    const { Resvg } = require("@resvg/resvg-js");

    // Render to a small PNG (drop any existing width/height so 96x96 applies)
    let render = svg.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, '')
                    .replace(/<svg\b/i, '<svg width="96" height="96"');
    let png;
    try {
      png = new Resvg(render, { background: "white" }).render().asPng();
    } catch (e) {
      return res.status(400).json({ error: "Could not render SVG" });
    }

    const names = await gemini.nameIconsOrdered([png]);
    const meta = names && names[0];
    res.json({ name: (meta && meta.label) || null, tags: (meta && meta.tags) || [] });
  } catch (error) {
    console.error("[API] name-svg error:", error.message);
    res.status(500).json({ error: "Failed to name icon" });
  }
});

// Run migrations before starting server (production only)
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    console.log('[Database] Running migrations...');
    const knex = require('knex');
    // knexfile exports per-environment configs; knex() needs exactly one
    const knexConfig = require('./db/knexfile').production;
    const db = knex(knexConfig);

    try {
      await db.migrate.latest();
      console.log('[Database] Migrations completed successfully');
      await db.destroy();
    } catch (err) {
      console.error('[Database] Migration failed:', err);
      process.exit(1);
    }
  }

  // Fail any ingest jobs orphaned by a previous shutdown (in-process worker)
  await ingestJobs.failStaleJobs();

  app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
    console.log(`[Server] JWT audience: ${AZURE_CLIENT_ID} | api://${AZURE_CLIENT_ID}`);
    if (skipJwtVerify) console.warn("[Server] SKIP_JWT_VERIFY is ON — token signature not validated (dev only)");
  });
}

startServer().catch(err => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
