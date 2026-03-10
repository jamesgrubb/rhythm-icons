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

// ---- Config (use env vars in production) ----
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || "YOUR-TENANT-ID";
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || "YOUR-CLIENT-ID";

const JWKS_URI = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`;

const client = jwksClient({ jwksUri: JWKS_URI, cache: true, rateLimit: true });

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

// ---- Azure AD JWT middleware ----
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = authHeader.slice(7);

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: AZURE_CLIENT_ID,
      issuer: [
        `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`,
        `https://sts.windows.net/${AZURE_TENANT_ID}/`,
      ],
      algorithms: ["RS256"],
    },
    (err, decoded) => {
      if (err) {
        console.error("[Auth] JWT verify failed:", err.message);
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      req.user = decoded;
      next();
    }
  );
}

// ---- Middleware ----
app.use(helmet());
app.use(cors({ origin: ["https://YOUR-DOMAIN", "https://localhost:3000"] }));
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

// GET /api/icons — returns icon list filtered by tenant (auth required)
app.get("/api/icons", requireAuth, async (req, res) => {
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

app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));
