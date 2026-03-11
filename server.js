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

// Azure may send aud as client ID, Application ID URI, or array; accept common issuer formats
const JWT_AUDIENCE = [AZURE_CLIENT_ID, `api://${AZURE_CLIENT_ID}`];
const JWT_ISSUERS = [
  `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`,
  `https://login.microsoftonline.com/${AZURE_TENANT_ID}/`,
  `https://sts.windows.net/${AZURE_TENANT_ID}/`,
];

const JWKS_URI = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`;

const client = jwksClient({ jwksUri: JWKS_URI, cache: true, rateLimit: true });

function getSigningKey(header, callback) {
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

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUERS,
      algorithms: ["RS256"],
    },
    (err, decodedVerified) => {
      if (err) {
        console.error("[Auth] JWT verify failed:", err.message);
        if (decoded) console.error("[Auth] Token aud:", decoded.aud, "| iss:", decoded.iss);
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

// ---- Middleware ----
app.use(helmet());
app.use(cors({
  origin: [
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
    "https://localhost:3000" // Keep for local development
  ].filter(Boolean)
}));
app.use(express.json());

// ---- Serve static taskpane files ----
app.use(express.static("dist")); // your built frontend goes here

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
app.get("/api/icons", requireAuth, async (req, res) => {
  console.log("[API] GET /api/icons — auth OK, user:", req.user?.sub ?? req.user?.oid);
  try {
    const tenantId = await getTenantId(req.user);

    if (!tenantId) {
      return res.status(403).json({ error: "No tenant found for user" });
    }

    // Fetch icons for this tenant OR public icons
    const result = await pool.query(
      `SELECT icon_id as id, name, category, svg
       FROM icons
       WHERE tenant_id = $1 OR is_public = true
       ORDER BY category, name`,
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[API] Error fetching icons:', error);
    res.status(500).json({ error: "Failed to fetch icons" });
  }
});

// GET /api/icons/:id — fetch a single icon
app.get("/api/icons/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = await getTenantId(req.user);

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

// POST /api/icons — add a new icon (admin only — check roles in req.user)
app.post("/api/icons", requireAuth, async (req, res) => {
  const { id, name, category, svg } = req.body;

  if (!id || !name || !category || !svg) {
    return res.status(400).json({ error: "Missing required fields: id, name, category, svg" });
  }

  try {
    const tenantId = await getTenantId(req.user);

    if (!tenantId) {
      return res.status(403).json({ error: "No tenant found for user" });
    }

    // TODO: Check if user has admin role before allowing insert
    // if (req.user.roles && !req.user.roles.includes('admin')) {
    //   return res.status(403).json({ error: "Admin access required" });
    // }

    await pool.query(
      `INSERT INTO icons (tenant_id, icon_id, name, category, svg)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, id, name, category, svg]
    );

    res.status(201).json({ ok: true, id });
  } catch (error) {
    console.error('[API] Error creating icon:', error);

    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: "Icon ID already exists for this tenant" });
    }

    res.status(500).json({ error: "Failed to create icon" });
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
