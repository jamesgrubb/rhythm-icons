# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Microsoft Office Add-in (Word & PowerPoint) that provides a curated icon library with Azure Active Directory authentication. It's a full-stack application with a vanilla JavaScript frontend bundled with Webpack and a Node.js/Express backend.

## Essential Commands

```bash
# Development
npm run dev        # Start webpack dev server on https://localhost:3000
npm run server     # Start backend API server (run in separate terminal)
npm install        # Install all dependencies

# Production
npm run build      # Build frontend to /dist folder
npm run lint       # Run ESLint on src/**/*.js
```

## Architecture & Key Components

### Authentication Flow
The add-in uses **MSAL.js 2.x** (Microsoft Authentication Library) with a popup flow:
1. User clicks "Sign in with Microsoft" → `signIn()` in `auth.js`
2. MSAL opens Azure AD popup for authentication
3. Access token returned with scope `Icons.Read` (custom API scope)
4. Token sent as `Authorization: Bearer <token>` on API requests
5. Backend validates JWT using JWKS (JSON Web Key Set) from Azure AD

Session persistence: MSAL stores tokens in `sessionStorage` and attempts silent token renewal via `acquireTokenSilent()` before falling back to popup.

### Core Files Structure

The project has a **flat structure** (no src/ folder for some files):
- Root level: `manifest.xml`, `webpack.config.js`, `package.json`, individual source files (`auth.js`, `icons.js`, `taskpane.js`, `server.js`)
- Frontend entry point defined in webpack: `["./src/taskpane/taskpane.js", "./src/auth/auth.js", "./src/icons/icons.js"]`
- Backend: Standalone `server.js` at root (or may be in `backend/` - check actual structure)

**Note:** The actual file structure appears to have files at root level (auth.js, icons.js, taskpane.js) rather than in src/ subdirectories as described in README. Always verify actual file locations.

### Office.js Integration

**Word insertion** (`insertIntoWord`):
- Converts SVG to PNG via Canvas API (Office doesn't support inline SVG)
- Uses `Word.run()` context and `range.insertInlinePictureFromBase64()`
- Targets current selection or cursor position

**PowerPoint insertion** (`insertIntoPowerPoint`):
- Similar PNG conversion process
- Uses `PowerPoint.run()` and `slide.shapes.addImage()`
- Currently inserts on first slide (`getItemAt(0)`) - may need adjustment for active slide

### Icon Data Management

Two icon sources:
1. **`SAMPLE_ICONS`** in `icons.js`: Hardcoded fallback data used during development
2. **Backend API** (`/api/icons`): Production icon source from `server.js`

`fetchIconsFromAPI()` attempts API fetch first, falls back to `SAMPLE_ICONS` on failure.

Icon shape: `{ id: string, name: string, category: string, svg: string }`

### JWT Validation (Backend)

`server.js` uses `jwks-rsa` + `jsonwebtoken`:
- Fetches Azure AD public keys from JWKS endpoint
- Validates token signature, audience (`AZURE_CLIENT_ID`), and issuer
- `requireAuth` middleware protects `/api/icons` routes
- Decoded user available as `req.user` in protected routes

## Configuration Requirements

Before running, replace these placeholders throughout the codebase:

| Placeholder | Location | Description |
|-------------|----------|-------------|
| `YOUR-AZURE-APP-CLIENT-ID` | `auth.js`, `server.js`, `manifest.xml` | Azure App Registration Client ID (GUID) |
| `YOUR-AZURE-TENANT-ID` | `auth.js`, `server.js` | Azure Tenant ID (GUID) |
| `YOUR-DOMAIN` | `manifest.xml`, `server.js` CORS, `icons.js` | Production domain (e.g., icons.yourcompany.com) |
| `YOUR-GUID-HERE-REPLACE-ME` | `manifest.xml` line 9 | Unique add-in GUID (generate at guidgenerator.com) |

**Azure AD Setup:**
- Application ID URI must be: `api://YOUR-AZURE-APP-CLIENT-ID`
- Create custom scope: `Icons.Read`
- Redirect URI type: Single-page application (SPA)
- Redirect URI value: `https://localhost:3000/taskpane.html` (dev) + production URL

## Development Workflow

1. Start both servers concurrently:
   ```bash
   npm run dev        # Terminal 1: Frontend (webpack-dev-server)
   npm run server     # Terminal 2: Backend API
   ```

2. Sideload the add-in:
   - Word/PowerPoint Desktop: Insert → Add-ins → Manage My Add-ins → Upload My Add-in → Select `manifest.xml`
   - Office on Web: Insert → Add-ins → Upload My Add-in → Select `manifest.xml`

3. The dev server runs on **HTTPS by default** (required by Office Add-ins API)

## Webpack Configuration

- Entry bundles: `auth.js`, `icons.js`, and `taskpane.js` into single `taskpane.bundle.js`
- Output: `/dist` folder (cleaned on each build)
- Copies `manifest.xml` and `public/assets/` to dist
- Dev server: port 3000, HTTPS enabled, CORS headers for Office.js

## Backend API Endpoints

All require `Authorization: Bearer <token>` header:

- `GET /api/icons` - Returns full icon array (filtered by user role possible via `req.user`)
- `GET /api/icons/:id` - Fetch single icon by ID
- `POST /api/icons` - Add new icon (admin only - add role checking)

Static files served from `/dist` in production.

## Adding Icons

**Development:** Edit `SAMPLE_ICONS` array in `icons.js`

**Production:** Modify `ICONS` array in `server.js` or connect to database

Each icon requires:
```javascript
{
  id: "unique-kebab-case-id",
  name: "Display Name",
  category: "Category Name",  // Used for tab filtering
  svg: `<svg viewBox="0 0 24 24" ...>...</svg>`  // Raw inline SVG
}
```

## Deployment Checklist

1. Run `npm run build` to create production bundle in `/dist`
2. Update all placeholder values (see Configuration Requirements)
3. Deploy `/dist` as static files over HTTPS
4. Deploy `server.js` backend (Azure App Service, Railway, Fly.io, etc.)
5. Update `manifest.xml` URLs to production domain
6. Set environment variables for backend:
   - `AZURE_TENANT_ID`
   - `AZURE_CLIENT_ID`
   - `PORT` (optional, defaults to 3000)
7. Update CORS origins in `server.js` to match production domain
