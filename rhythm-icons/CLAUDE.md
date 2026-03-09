# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Microsoft Office Add-in for PowerPoint that provides an icon library in a task pane. Users can browse icons and insert them into PowerPoint slides. The project is currently based on the SSO authentication template but should be converted to a simpler task pane add-in focused on icon management and insertion.

**Current State**: SSO template with Azure AD authentication and Microsoft Graph integration
**Target Goal**: Icon library task pane following the [PowerPoint quickstart tutorial](https://learn.microsoft.com/en-us/office/dev/add-ins/quickstarts/powerpoint-quickstart-yo?tabs=jsonmanifest)

## Essential Commands

```bash
# Development
npm start            # Build, start dev server, and sideload add-in in PowerPoint
npm run build:dev    # Build development bundle with source maps
npm run build        # Build production bundle to /dist
npm run dev-server   # Start Node.js HTTPS server on port 3000 (for manual testing)
npm stop             # Stop dev server and uninstall add-in

# Quality & Validation
npm run lint         # Run ESLint on codebase
npm run lint:fix     # Auto-fix ESLint issues
npm run validate     # Validate manifest.xml structure
npm run prettier     # Format code with Prettier

# SSO Configuration (current template, may remove if simplifying)
npm run configure-sso  # Configure SSO settings in manifest.xml
npm run signin       # Sign in to M365 account
npm run signout      # Sign out of M365 account
```

## Architecture Overview

### Current Architecture (SSO Template)

The codebase currently implements SSO authentication with Azure AD and Microsoft Graph integration:

**Frontend Components:**
- `src/taskpane/taskpane.ts` - Main UI entry point (currently shows user profile button)
- `src/helpers/sso-helper.ts` - SSO authentication orchestration
- `src/helpers/fallbackauthdialog.ts` - MSAL.js dialog for fallback authentication
- `src/helpers/middle-tier-calls.ts` - jQuery AJAX calls to backend
- `src/helpers/error-handler.ts` - Error handling for auth failures
- `src/helpers/message-helper.ts` - UI messaging utilities

**Backend Components:**
- `src/middle-tier/app.ts` - Express HTTPS server on port 3000
- `src/middle-tier/ssoauth-helper.ts` - JWT validation and On-Behalf-Of token exchange
- `src/middle-tier/msgraph-helper.ts` - Microsoft Graph API calls

### Target Architecture (Icon Library)

For the icon library add-in, you should simplify to:

**Task Pane UI (src/taskpane/)**
- Display grid/list of icon thumbnails
- Search/filter functionality
- Click handler to insert selected icon into slide

**Icon Insertion Logic**
- Use `PowerPoint.run()` to get active slide
- Insert icons as shapes or images using `slide.shapes.addImage()` or `slide.shapes.addSvgImage()`
- Handle SVG → PNG conversion if needed (Office.js doesn't support inline SVG in all scenarios)

**Icon Data Source**
- **Option 1**: Hardcoded array of icon objects `{id, name, category, svgPath}` in taskpane.ts
- **Option 2**: Fetch from backend API endpoint (keep middle-tier server for icon delivery)
- **Option 3**: Bundle icons as data URLs or base64 in frontend code

**Simplified Flow:**
1. User opens task pane → Icon grid displays
2. User clicks icon → `insertIconIntoSlide(iconData)`
3. `PowerPoint.run()` → `slide.shapes.addImage(base64Data)` or `addSvgImage(svgMarkup)`
4. Icon appears on active slide at default position

### Office.js PowerPoint Integration

Key APIs for icon insertion:

```typescript
// Get context and active slide
PowerPoint.run(async (context) => {
  const slide = context.presentation.slides.getItemAt(0); // or getSelectedSlides()

  // Insert image from base64
  const image = slide.shapes.addImage({
    base64ImageString: base64Data,
    left: 100,
    top: 100,
    width: 200,
    height: 200
  });

  await context.sync();
});
```

**Office.js Initialization:**
- `Office.onReady()` - Checks if host is PowerPoint (`Office.HostType.PowerPoint`)
- `Office.context.document` - Provides document-level operations
- PowerPoint-specific namespace: `Office.context.presentation`

### Project Structure

```
src/
├── taskpane/          # Icon browsing UI (HTML, CSS, TS)
│   ├── taskpane.html  # Icon grid layout
│   ├── taskpane.css   # Icon card styling
│   └── taskpane.ts    # Icon display + insertion logic
├── helpers/           # (Optional) Keep message-helper.ts for errors
├── middle-tier/       # (Optional) Serve icons via API or remove entirely
└── commands/          # Ribbon button commands (Show Task Pane)
```

**Webpack Build:**
- Frontend bundle: `taskpane.ts` → `dist/taskpane.bundle.js`
- Backend bundle: `app.ts` → `dist/middletier.js` (optional for icon API)
- Copies `manifest.xml` and `assets/` to `/dist`

## Configuration Requirements

### For Current SSO Template

**Environment Variables** (.env file):
```
CLIENT_ID={your-azure-app-client-id}
CLIENT_SECRET={your-azure-app-client-secret}
PORT=3000
NODE_ENV=development
SCOPE=User.Read
GRAPH_URL_SEGMENT=/me
```

**Azure AD App Registration** (required for SSO features):
- Application ID URI: `api://localhost:3000/{client-id}` (dev)
- Expose API scope: `access_as_user`
- API permissions: `User.Read` (delegated)
- Client secret stored in .env
- Redirect URI: `https://localhost:3000/fallbackauthdialog.html` (SPA type)

**Code Placeholders to Replace**:
- `src/helpers/fallbackauthdialog.ts:13` - `{application GUID here}` → Azure client ID
- `manifest.xml:86-87` - `{application GUID here}` and Resource URL

### For Simplified Icon Library

If converting to icon-only add-in (no authentication):

1. **Remove Azure AD configuration** - No CLIENT_ID/CLIENT_SECRET needed
2. **Simplify manifest.xml** - Remove `<WebApplicationInfo>` section (lines 85-92)
3. **Update manifest placeholders**:
   - `{PORT}` → `3000` throughout manifest
   - Verify SourceLocation points to `https://localhost:3000/taskpane.html`
4. **No environment variables needed** unless serving icons from backend API

## Transitioning from SSO Template to Icon Library

The current codebase is based on the SSO authentication template. To convert it to an icon library add-in:

### Files to Modify

**1. src/taskpane/taskpane.html**
- Remove user profile UI elements
- Add icon grid container: `<div id="icon-grid"></div>`
- Add search input if desired
- Keep basic Office Fabric UI styles or replace with custom styling

**2. src/taskpane/taskpane.ts**
- Remove `getUserData()` and `writeDataToOfficeDocument()` functions
- Add icon data array or fetch from API
- Implement `displayIcons()` to render icon grid
- Add `insertIconIntoSlide(iconData)` using `PowerPoint.run()`
- Replace button click handler with icon click handlers

**3. src/taskpane/taskpane.css**
- Add icon card/grid styling
- Style hover states and selection
- Add responsive layout for icon gallery

### Files to Remove (Optional)

If removing SSO authentication entirely:
- `src/helpers/sso-helper.ts`
- `src/helpers/fallbackauthdialog.ts` + `.html`
- `src/helpers/error-handler.ts`
- `src/helpers/middle-tier-calls.ts` (unless using backend for icons)
- `src/middle-tier/ssoauth-helper.ts`
- `src/middle-tier/msgraph-helper.ts`

Keep `src/middle-tier/app.ts` if serving icons via API, otherwise remove entirely.

### manifest.xml Changes

- Remove `<WebApplicationInfo>` section (lines 85-92) - not needed without SSO
- Verify `<Permissions>` is `ReadWriteDocument` (allows inserting content)
- Update `<DisplayName>` and `<Description>` to reflect icon library purpose
- Simplify `<AppDomains>` or remove if not calling external APIs

### Minimal Icon Library Example

```typescript
// src/taskpane/taskpane.ts
interface Icon {
  id: string;
  name: string;
  svg: string; // or base64 PNG data
}

const ICONS: Icon[] = [
  { id: 'star', name: 'Star', svg: '<svg>...</svg>' },
  { id: 'heart', name: 'Heart', svg: '<svg>...</svg>' },
];

Office.onReady((info) => {
  if (info.host === Office.HostType.PowerPoint) {
    displayIcons();
  }
});

function displayIcons() {
  const grid = document.getElementById('icon-grid');
  ICONS.forEach(icon => {
    const card = document.createElement('div');
    card.className = 'icon-card';
    card.innerHTML = `${icon.svg}<p>${icon.name}</p>`;
    card.onclick = () => insertIcon(icon);
    grid.appendChild(card);
  });
}

async function insertIcon(icon: Icon) {
  await PowerPoint.run(async (context) => {
    const slide = context.presentation.slides.getItemAt(0);
    // Convert SVG to base64 PNG first, or use pre-converted data
    slide.shapes.addImage({ base64ImageString: icon.svg, left: 100, top: 100 });
    await context.sync();
  });
}
```

## Development Workflow

### Current SSO Template Workflow

1. Configure Azure AD app registration and update .env + manifest.xml
2. Run `npm install` to install dependencies
3. Run `npm start` to build, start HTTPS server, and sideload into PowerPoint
4. PowerPoint opens with add-in in task pane
5. Click "Show Task Pane" → "Get Profile" to test SSO authentication

**Server Details**:
- HTTPS server on port 3000 via `office-addin-dev-certs`
- Static files served from `/dist` (no caching in dev mode)
- Backend serves `/getuserdata` API endpoint
- Webpack builds on `npm start` (via `prestart` script)

### Recommended Icon Library Workflow

For simplified development without SSO:

1. Run `npm install` to install dependencies
2. Run `npm start` to start dev server and open PowerPoint
3. Task pane opens showing icon grid
4. Click an icon to insert it into the active slide
5. Run `npm stop` to stop server and uninstall add-in

**Iterative Development**:
- Modify `src/taskpane/taskpane.ts` for icon logic
- Edit `src/taskpane/taskpane.html` for icon grid layout
- Update `src/taskpane/taskpane.css` for icon styling
- Webpack auto-rebuilds on file changes if using watch mode
- Reload task pane in PowerPoint to see changes

## Common Issues & Troubleshooting

### SSO-Related Issues (Current Template)

**SSO fails with "consent required"**: First-time users need to consent to `access_as_user` scope. Fallback dialog will handle this.

**"User login is required" in fallback dialog**: MSAL.js needs localStorage. Code handles this via `loginRedirect()` before `acquireTokenRedirect()` (fallbackauthdialog.ts:79-86).

**JWT validation fails (403)**: Verify CLIENT_ID in .env matches token's `audience` claim. Check Azure AD Application ID URI format.

**Token expiration (AADSTS500133)**: Code retries OBO exchange once (sso-helper.ts:63) if token expires between Office validation and Azure AD.

### General Development Issues

**Add-in doesn't load in PowerPoint**:
- Verify HTTPS certificate installed (first-time prompt during `npm start`)
- Check manifest.xml SourceLocation matches server URL (`https://localhost:3000/taskpane.html`)
- Enable loopback exemption for Edge WebView if prompted

**"Can't open add-in from localhost"**:
- Grant Edge WebView loopback exemption when prompted (`Y` in terminal)
- Requires administrator privileges

**Changes not reflecting in task pane**:
- Rebuild with `npm run build:dev`
- Reload task pane: Right-click task pane → Reload (or close/reopen PowerPoint)
- Clear Office cache: Delete `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\` (Windows)

**Port 3000 already in use**:
- Kill existing process: `npx kill-port 3000` or `lsof -ti:3000 | xargs kill` (Mac)
- Or change port in package.json config.dev_server_port

**Webpack build fails**:
- Delete `node_modules` and `package-lock.json`, run `npm install` again
- Check Node.js version (requires LTS version)

### Icon Insertion Issues

**Icons not appearing in slide**:
- Verify active slide exists: Check `context.presentation.slides.getCount()`
- Ensure base64 image data is valid (test in browser first)
- Check Office.js API version supports `addImage()` method

**SVG rendering problems**:
- Convert SVG to PNG/JPG before insertion (Office.js has limited SVG support)
- Use Canvas API for conversion or server-side rendering

## Deployment Notes

### For SSO Template (Current)

1. Run `npm run build` to create production bundle in `/dist`
2. Webpack replaces `https://localhost:3000/` with production URL in manifest.xml (webpack.config.js:8)
3. Deploy `/dist/middletier.js` as Node.js backend (Azure App Service, etc.)
4. Deploy `/dist/*.html` and `/dist/assets/` as static HTTPS site
5. Update Azure AD:
   - Redirect URIs to production domain
   - Application ID URI: `api://{your-domain}/{client-id}`
6. Set environment variables in production:
   - CLIENT_ID, CLIENT_SECRET, PORT, NODE_ENV=production

### For Icon Library (Simplified)

1. **Frontend-Only Deployment** (if icons bundled in code):
   - Run `npm run build`
   - Deploy `/dist/*.html`, `/dist/*.js`, `/dist/assets/` to CDN or static host
   - Update manifest.xml SourceLocation to production URL
   - Upload manifest to Microsoft 365 Admin Center or AppSource

2. **With Backend API** (if serving icons from server):
   - Deploy middle-tier as Node.js app
   - Configure CORS to allow Office Online origins
   - Update API endpoints in taskpane.ts to production URLs

**Manifest Deployment**:
- **Centralized**: Upload to Microsoft 365 Admin Center for organization-wide deployment
- **AppSource**: Submit to marketplace for public distribution
- **Sideloading**: Share manifest.xml file directly with users (dev/testing only)

**Production Checklist**:
- [ ] Replace localhost URLs in manifest.xml
- [ ] Update webpack.config.js:8 `urlProd` to your domain
- [ ] Test on Office on the web (different runtime than desktop)
- [ ] Verify HTTPS everywhere (required for Office Add-ins)
- [ ] Remove SSO components if not needed (reduce bundle size)
- [ ] Minify icon assets and enable gzip compression
