# Deploying Spectrum Icon Library on your own Azure tenant

This guide is for an IT / cloud admin standing up the add-in for their own
organisation. The app is a self-contained container: an Express server that
validates Microsoft (Entra ID) tokens, serves a REST API, and serves the built
web front-end. It is **multi-tenant** — it accepts users from any Entra ID
tenant and auto-provisions each organisation on first sign-in.

You need to provide four things: an **Entra ID app registration**, a **Postgres
database**, a **Gemini API key**, and an **HTTPS host** for the container.
Estimated time: ~1 hour.

---

## Architecture at a glance

- **One container** (see `Dockerfile`) runs everything: `node server.js` serves
  the API *and* the built front-end from `/dist`. It also bundles `ghostscript`
  + `pstoedit` for EPS handling.
- **Auth**: MSAL.js in the browser gets a token for the custom API scope
  `Icons.Read`; the server validates it against Entra's JWKS (per-tenant) and
  reads the app role (`admin` / `viewer` / default `user`) from the token.
- **Data**: PostgreSQL. Schema migrations run automatically at boot
  (`NODE_ENV=production`). No manual DB setup beyond creating an empty database.
- **Front-end Azure config** (client/tenant IDs) is **baked into the bundle at
  build time** — the browser can't read runtime env — via the build args
  `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` (see step 4). The server reads the same
  values from runtime env.

---

## Prerequisites

- An Entra ID (Azure AD) tenant with permission to create app registrations and
  assign users to app roles.
- A container host that serves **HTTPS** (mandatory for Office add-ins). Any of:
  Azure App Service for Containers, Azure Container Apps, or Container Instances.
- Azure Database for PostgreSQL (Flexible Server), or any reachable Postgres 14+.
- A Google **Gemini API key** (powers AI icon naming + AI search).
- A custom domain or the platform-provided HTTPS domain for the app. Call it
  `APP_DOMAIN` below (e.g. `icons.contoso.com` or `spectrum-icons.azurewebsites.net`).

---

## Step 1 — Entra ID app registration

Entra admin center → **Identity → Applications → App registrations → New registration**.

1. **Name**: `Spectrum Icon Library`.
2. **Supported account types**: *Accounts in this organizational directory only*
   is fine for internal use. (The code also supports multi-tenant if you ever
   want to.)
3. **Redirect URI** → platform **Single-page application (SPA)**, value:
   `https://APP_DOMAIN/taskpane.html`
4. Register. Copy the **Application (client) ID** and **Directory (tenant) ID** —
   you'll need both.

Then, on that registration:

**a. Add the second SPA redirect** (the sign-in dialog has its own page)
→ **Authentication → Single-page application → Add URI**:
`https://APP_DOMAIN/auth-dialog.html`
(For local dev you may also add `https://localhost:3000/taskpane.html` and
`https://localhost:3000/auth-dialog.html`.)

**b. Expose the API scope** → **Expose an API**:
- **Application ID URI**: accept the default `api://<client-id>`.
- **Add a scope**:
  - Scope name: **`Icons.Read`** (exact, case-sensitive).
  - Who can consent: *Admins and users*.
  - Fill the consent display text, **Enable**.
- **Add a client application**: add the app's **own client ID** and tick the
  `Icons.Read` scope, so the SPA can call its own API without a consent prompt.

**c. Define app roles** → **App roles → Create app role** (create two):

| Display name | Allowed member types | Value (exact) | Description |
|---|---|---|---|
| Admin  | Users/Groups | `admin`  | Manage the library (upload, edit, delete, groups) |
| Viewer | Users/Groups | `viewer` | View and insert icons only |

> Users with **no** role assigned come through as the default `user` role — they
> can insert icons but not manage the library. Assign `admin` only to librarians.

**d. Assign your test users** → this is done on the **Enterprise application**
(same app, different blade): **Identity → Applications → Enterprise applications
→ Spectrum Icon Library → Users and groups → Add user/group** → pick users →
assign **Admin** or **Viewer**.

> Tip: if you turn on *Properties → Assignment required = Yes*, only assigned
> users can sign in at all.

---

## Step 2 — PostgreSQL database

Create an empty database (Azure Database for PostgreSQL Flexible Server is the
easy path). Note the connection string in the form:

```
postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

That's all — **do not** run any SQL by hand. On first boot the app runs its
migrations (creates every table), and the first time someone signs in their
organisation row is created automatically.

---

## Step 3 — Gemini API key

Create a key at Google AI Studio (`aistudio.google.com`) and keep it for the env
vars below. It's used for AI icon naming and the "Enter = AI search" feature.
(The app still runs without it; those two features just return errors.)

---

## Step 4 — Deploy the container

Point your host at this GitHub repo (it builds from the `Dockerfile`), or build
and push the image yourself.

### Runtime environment variables (set on the host / app service)

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string from step 2 |
| `AZURE_CLIENT_ID` | ✅ | Application (client) ID from step 1 |
| `AZURE_TENANT_ID` | ✅ | Directory (tenant) ID from step 1 |
| `GEMINI_API_KEY` | ✅ | Key from step 3 |
| `NODE_ENV` | ✅ | `production` (the Dockerfile also sets this) |
| `PORT` | auto | Most hosts inject this; the server honours it |
| `GEMINI_MODEL` | optional | Override the default Gemini model id |
| `SHUTTERSTOCK_API_TOKEN`, `SHUTTERSTOCK_SUBSCRIPTION_ID` | optional | Only for the (currently UI-disabled) Shutterstock feature |

> ⚠️ **Never** set `SKIP_JWT_VERIFY` in production — it disables token
> validation and is for local development only.

### Build arguments (the front-end Azure config)

The browser bundle can't read runtime env, so the client/tenant IDs are compiled
in at **build time**. The Dockerfile declares:

```dockerfile
ARG AZURE_CLIENT_ID
ARG AZURE_TENANT_ID
```

- **Railway / most PaaS**: service variables are automatically passed as Docker
  build args, so just setting the env vars above is enough.
- **Manual `docker build`**: pass them explicitly:
  ```bash
  docker build \
    --build-arg AZURE_CLIENT_ID=<client-id> \
    --build-arg AZURE_TENANT_ID=<tenant-id> \
    -t spectrum-icon-library .
  ```
- **Azure App Service / Container Apps building from source**: add
  `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` as build/app settings so they're present
  during the image build. If they aren't set at build time, the bundle falls
  back to the original developer's IDs and sign-in will fail — so double-check
  the built page: `view-source:https://APP_DOMAIN/auth-dialog.html` should show
  **your** client ID.

Deploy, then confirm `https://APP_DOMAIN/taskpane.html` returns 200 and the boot
log shows `[Database] Migrations completed successfully`.

---

## Step 5 — Manifest & distribution

The Office add-in is described by `manifest.production.xml`. Update every URL in
it from the current Railway domain to `https://APP_DOMAIN`, and generate a fresh
GUID for `<Id>` so it doesn't clash with the existing install:

- `IconUrl`, `HighResolutionIconUrl`, all `<bt:Image ...>` (icon PNGs)
- `SourceLocation` (both — taskpane and any commands page)
- The `<AppDomains>` / any absolute URLs

Then distribute to your team via **Microsoft 365 admin center → Settings →
Integrated apps → Upload custom apps** → upload the manifest → assign to the test
users/group. This deploys it centrally (it appears in Word/PowerPoint under
*Insert → Add-ins* for those users) — far cleaner than everyone sideloading. Note
central deployment can take up to ~24h to propagate.

For quick sideload testing before that: **Insert → Add-ins → Upload My Add-in →
select `manifest.production.xml`**.

---

## First run & roles

- The first admin to sign in **auto-creates the organisation** in the database.
- Role comes from the Entra app-role assignment on every request (Entra is the
  source of truth — you can't override it in the DB). To change someone's access,
  change their assignment in the Enterprise app, then have them **sign out and
  back in** so a fresh token is issued.
- Groups (clients) and icons start empty. An admin adds groups via the tab strip
  (**+ New group** / the gear = Manage Groups) and adds icons via **Add Icon**
  (file upload, paste from Illustrator, or a multi-icon sheet).

---

## Optional — migrate the existing icon library

If you want to start with the current library rather than empty, the developer
can hand over a dump of the `icons`, `clients`, and `icon_clients` tables
(`pg_dump -t icons -t clients -t icon_clients`) to `pg_restore` into your new
database **after** first boot (so the schema exists). Icons are stored as
inline SVG, so nothing external needs copying. Ask the developer to prepare this.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Sign-in popup errors immediately | Redirect URIs missing/typo'd, or the built bundle has the wrong client ID (check `view-source` of `auth-dialog.html`). Both `/taskpane.html` and `/auth-dialog.html` must be registered as **SPA** redirects. |
| "Tenant not provisioned" | User is from an Entra tenant the app hasn't seen — normally auto-created; if it persists, the token has no `tid`, or DB writes are failing. Check DB connectivity. |
| Signed in but no admin controls | User isn't assigned the **Admin** app role, or is using a cached token — reassign and sign out/in. |
| `401` on API calls | Audience/scope mismatch — the scope must be exactly `Icons.Read` and the app must be added as an authorised client application (step 1b). |
| AI naming / search fails | `GEMINI_API_KEY` missing or invalid. |
| Ribbon shows the old name/icon | Office caches the manifest at sideload/deploy time — re-add the add-in (or wait for central deployment to refresh). |

---

## Configuration reference (where each value lives)

- **Server** reads `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` from runtime env
  (`server.js`), validating tokens per-tenant against Entra's JWKS.
- **Front-end** gets the same IDs baked in at build time via
  `webpack.config.js` (DefinePlugin + HtmlWebpackPlugin `templateParameters`),
  sourced from the build args in `Dockerfile`. Defaults in `webpack.config.js`
  keep the original dev tenant working if the args are unset.
- **Icon assets** are generated from `design/addin-icon.svg` by
  `node scripts/generate-icons.js` into `public/icon-{16,32,64,80}.png`.
