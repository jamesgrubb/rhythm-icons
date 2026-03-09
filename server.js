// =============================================
//  server.js — Backend API (Node / Express)
//  Validates Azure AD JWTs and serves icons.
//
//  Install deps:
//    npm install express cors helmet jwks-rsa jsonwebtoken
// =============================================

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const jwt     = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

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

// ---- Icons API ----

// Curated icon library — in production, load from a DB or CMS
const ICONS = [
  // Add your curated icons here. Each entry:
  // { id, name, category, svg }
  // See src/icons/icons.js for the format.
  // Example:
  {
    id: "arrow-right",
    name: "Arrow Right",
    category: "Arrows",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
  },
  // ... add more
];

// GET /api/icons — returns full icon list (auth required)
app.get("/api/icons", requireAuth, (req, res) => {
  // Optional: filter by user's group/role from req.user
  // e.g. only show icons tagged for user's team
  res.json(ICONS);
});

// GET /api/icons/:id — fetch a single icon
app.get("/api/icons/:id", requireAuth, (req, res) => {
  const icon = ICONS.find(i => i.id === req.params.id);
  if (!icon) return res.status(404).json({ error: "Icon not found" });
  res.json(icon);
});

// POST /api/icons — add a new icon (admin only — check roles in req.user)
app.post("/api/icons", requireAuth, (req, res) => {
  const { id, name, category, svg } = req.body;
  if (!id || !name || !category || !svg) {
    return res.status(400).json({ error: "Missing required fields: id, name, category, svg" });
  }
  // In production, persist to DB
  ICONS.push({ id, name, category, svg });
  res.status(201).json({ ok: true, id });
});

app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));
