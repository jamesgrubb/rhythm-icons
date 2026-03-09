# Icon Library — Microsoft Office Add-in

A polished Word & PowerPoint add-in that lets your clients browse a curated icon library and insert icons directly into documents. Secured with **Azure Active Directory (MSAL)** SSO.

---

## Project Structure

```
icon-addin/
├── manifest.xml              # Office Add-in manifest (sideload this)
├── package.json
├── webpack.config.js
├── src/
│   ├── taskpane/
│   │   ├── taskpane.html     # Add-in UI entry point
│   │   ├── taskpane.css      # Styles
│   │   └── taskpane.js       # Main controller
│   ├── auth/
│   │   └── auth.js           # MSAL / Azure AD auth
│   └── icons/
│       └── icons.js          # Icon data + API service layer
├── backend/
│   └── server.js             # Node/Express API (validates JWTs, serves icons)
└── public/
    └── assets/               # icon-16.png, icon-32.png, icon-64.png, icon-80.png
```

---

## Quick Start

### 1. Azure App Registration

1. Go to [Azure Portal → App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps)
2. **New registration**:
   - Name: `Icon Library Add-in`
   - Supported account types: *Single tenant* (or multi-tenant for broader access)
   - Redirect URI: **Single-page application (SPA)** → `https://localhost:3000/taskpane.html`
3. After creation, note down:
   - **Application (client) ID** → `YOUR-AZURE-APP-CLIENT-ID`
   - **Directory (tenant) ID** → `YOUR-AZURE-TENANT-ID`
4. Under **Expose an API**:
   - Set Application ID URI: `api://YOUR-AZURE-APP-CLIENT-ID`
   - Add scope: `Icons.Read` (Admins and users can consent)
5. Under **API Permissions**, add your new scope: `api://YOUR-AZURE-APP-CLIENT-ID/Icons.Read`

### 2. Replace Placeholder Values

Search and replace these strings across the project:

| Placeholder                        | Replace with                          |
|------------------------------------|---------------------------------------|
| `YOUR-AZURE-APP-CLIENT-ID`         | Your Azure client ID (GUID)           |
| `YOUR-AZURE-TENANT-ID`             | Your Azure tenant ID (GUID)           |
| `YOUR-DOMAIN`                      | Your hosted domain (e.g. `icons.yourcompany.com`) |
| `YOUR-GUID-HERE-REPLACE-ME`        | A new GUID (generate at [guidgenerator.com](https://guidgenerator.com)) |

### 3. Install Dependencies

```bash
npm install
```

### 4. Run in Development

```bash
# Start the frontend dev server (HTTPS required by Office)
npm run dev

# In a separate terminal, start the backend
npm run server
```

### 5. Sideload the Add-in

**Word / PowerPoint (Desktop):**
1. Open Word or PowerPoint
2. Insert → Add-ins → Manage My Add-ins → Upload My Add-in
3. Select `manifest.xml`

**Word / PowerPoint (Web):**
1. Open a document in Office on the web
2. Insert → Add-ins → Upload My Add-in
3. Select `manifest.xml`

---

## Adding Your Icons

Edit the `ICONS` array in `backend/server.js` (or replace with a DB query). Each icon must follow this shape:

```js
{
  id:       "my-icon",           // unique kebab-case ID
  name:     "My Icon",           // display name
  category: "Category Name",     // used for the tab filter
  svg:      `<svg viewBox="0 0 24 24" ...>...</svg>`,  // raw inline SVG
}
```

For the frontend sample data (used as fallback / during dev), edit `src/icons/icons.js`.

---

## Deploying to Production

1. **Build the frontend:**
   ```bash
   npm run build
   # Output goes to /dist
   ```
2. **Serve** `/dist` as static files from your domain over HTTPS.
3. **Deploy** `backend/server.js` (e.g. to Azure App Service, Railway, Fly.io).
4. Update all `YOUR-DOMAIN` references in `manifest.xml` to your live domain.
5. **Register the add-in** via [Microsoft AppSource](https://partner.microsoft.com/en-us/dashboard/office/products) or distribute `manifest.xml` to your clients directly.

---

## How Auth Works

```
User clicks "Sign in with Microsoft"
        ↓
MSAL.js opens Azure AD popup (loginPopup)
        ↓
User authenticates with their M365 account
        ↓
MSAL returns an access token with scope Icons.Read
        ↓
Token is sent as Authorization: Bearer <token> on API calls
        ↓
Backend validates JWT signature against Azure AD public keys (JWKS)
        ↓
Icons are returned ✓
```

On subsequent opens, MSAL silently restores the session from `sessionStorage` — no popup needed.

---

## Customisation Ideas

- **Role-based icon sets** — check `req.user.roles` or group memberships in the backend to serve different icon libraries per team/client
- **Colour variants** — add a colour picker to tint the SVG `stroke`/`fill` before insertion
- **Recent icons** — store recently used icon IDs in `Office.context.document.settings`
- **Favourites** — let users star icons, persisted per-user via the API

---

## Tech Stack

| Layer      | Technology |
|------------|-----------|
| Office API | Office.js (Word + PowerPoint) |
| Auth       | MSAL.js 2.x + Azure AD |
| Frontend   | Vanilla JS + CSS (no framework) |
| Bundler    | Webpack 5 |
| Backend    | Node.js + Express |
| JWT validation | jwks-rsa + jsonwebtoken |
