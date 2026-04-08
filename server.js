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

    // Fetch icons for this tenant OR public icons, include tenant and client names
    const result = await pool.query(
      `SELECT i.icon_id as id, i.name, i.category, i.svg, i.is_public,
              t.name as tenant_name,
              c.id as client_id,
              c.name as client_name
       FROM icons i
       LEFT JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.tenant_id = $1 OR i.is_public = true
       ORDER BY c.name NULLS LAST, i.category, i.name`,
      [tenantId]
    );

    const withClients = result.rows.filter(r => r.client_name).length;
    const uniqueClients = [...new Set(result.rows.map(r => r.client_name).filter(Boolean))];
    console.log(`[API] Returning ${result.rows.length} icons, ${withClients} with clients. Unique clients: [${uniqueClients.join(', ')}]`);

    res.json(result.rows);
  } catch (error) {
    console.error('[API] Error fetching icons:', error);
    res.status(500).json({ error: "Failed to fetch icons" });
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

// POST /api/icons — add a new icon (admin only)
app.post("/api/icons", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const { id, name, category, svg, client_id } = req.body;

  console.log('[API] POST /api/icons - Request body:', {
    id,
    name,
    category,
    svg_length: svg?.length,
    client_id,
    client_id_type: typeof client_id,
    client_id_is_empty_string: client_id === ''
  });

  if (!id || !name || !category || !svg) {
    return res.status(400).json({ error: "Missing required fields: id, name, category, svg" });
  }

  // VALIDATE SVG CONTENT
  // 1. Check viewBox is exactly "0 0 24 24"
  const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);
  if (!viewBoxMatch) {
    return res.status(400).json({ error: "SVG must have a viewBox attribute" });
  }
  if (viewBoxMatch[1] !== "0 0 24 24") {
    return res.status(400).json({
      error: `Invalid viewBox "${viewBoxMatch[1]}" - must be "0 0 24 24"`
    });
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

  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(403).json({ error: "No tenant found for user" });
    }

    const result = await pool.query(
      `INSERT INTO icons (tenant_id, icon_id, name, category, svg, client_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, icon_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         svg = EXCLUDED.svg,
         client_id = EXCLUDED.client_id,
         updated_at = CURRENT_TIMESTAMP
       RETURNING (xmax = 0) AS inserted`,
      [tenantId, id, name, category, svg, client_id || null]
    );

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

// PUT /api/icons/:id — update an existing icon (admin only)
app.put("/api/icons/:id", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, category, svg, is_public } = req.body;
  const tenantId = req.user.tenantId;

  try {
    // Verify icon belongs to user's tenant (prevent cross-tenant updates)
    const existing = await pool.query(
      'SELECT id FROM icons WHERE icon_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Icon not found or access denied' });
    }

    // Update icon (only provided fields)
    await pool.query(
      `UPDATE icons
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           svg = COALESCE($3, svg),
           is_public = COALESCE($4, is_public),
           updated_at = NOW()
       WHERE icon_id = $5 AND tenant_id = $6`,
      [name, category, svg, is_public, id, tenantId]
    );

    res.json({ ok: true, message: 'Icon updated successfully' });
  } catch (error) {
    console.error('[API] Error updating icon:', error);
    res.status(500).json({ error: 'Failed to update icon' });
  }
});

// DELETE /api/icons/:id — delete an icon (admin only)
app.delete("/api/icons/:id", requireAuth, ensureTenantExists, extractUserRole, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  try {
    // Verify ownership before deleting
    const result = await pool.query(
      'DELETE FROM icons WHERE icon_id = $1 AND tenant_id = $2 RETURNING id',
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

// Run migrations before starting server (production only)
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    console.log('[Database] Running migrations...');
    const knex = require('knex');
    const knexConfig = require('./db/knexfile');
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
