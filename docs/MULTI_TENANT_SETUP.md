# Multi-Tenant Office Add-in Distribution Plan

## Goal
Enable private distribution of the Rhythm Icons add-in to multiple customer tenants, with eventual migration to Microsoft AppSource for public distribution.

## Current State
- ✅ Production deployment on Railway: `rhythm-icons-production.up.railway.app`
- ✅ Azure AD authentication with MSAL.js 2.x
- ✅ PostgreSQL database with multi-tenant schema (tenants, icons, users tables)
- ✅ Working locally with tenant-scoped icon access
- ⚠️ Azure AD app configured as **single-tenant** (needs multi-tenant)
- ⚠️ Manifest uses placeholder GUID and localhost URLs
- ⚠️ No tenant auto-provisioning for new organizations

## Phase 1: Azure AD Multi-Tenant Configuration (CRITICAL)

### 1.1 Convert Azure AD App to Multi-Tenant
**Location:** Azure Portal > App Registrations > Rhythm Icons

**Changes needed:**
1. Navigate to **Authentication** blade:
   - Add redirect URI: `https://rhythm-icons-production.up.railway.app/taskpane.html` (SPA type)
   - Keep existing: `https://localhost:3000/taskpane.html`

2. Navigate to **App Manifest** blade:
   - Change `"signInAudience"` from `"AzureADMyOrg"` to `"AzureADMultipleOrgs"`
   - This allows users from **any** organizational Azure AD tenant to authenticate

3. Navigate to **API Permissions** blade:
   - Verify `Icons.Read` scope exists under "Expose an API"
   - Ensure Application ID URI is: `api://19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c`

4. Navigate to **Branding & properties**:
   - Update Publisher domain (optional for private distribution, required for AppSource)
   - Add Privacy Policy URL: `https://rhythm-icons-production.up.railway.app/privacy`
   - Add Terms of Service URL: `https://rhythm-icons-production.up.railway.app/terms`

**Reference:** [Convert app to multi-tenant - Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/howto-convert-app-to-be-multi-tenant)

### 1.2 Update Server JWT Validation
**File:** `server.js` (lines 20-30)

**Current state:** Already supports multi-tenant! ✅
- Accepts multiple issuer formats
- Validates against any Azure AD tenant's JWKS endpoint
- No changes needed

### 1.3 Add Tenant Auto-Provisioning
**File:** `server.js` - Add new middleware function

**Purpose:** When a user from a new tenant signs in, automatically create a tenant record in the database.

**Implementation:**
```javascript
// Add after requireAuth middleware (after line 110)
async function ensureTenantExists(req, res, next) {
  const azureTenantId = req.user.tid; // Azure AD tenant ID from JWT
  const tenantName = req.user.tenantName || azureTenantId; // Use org name if available

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
      console.log('[Tenant] Auto-provisioned new tenant:', azureTenantId);
    }

    next();
  } catch (error) {
    console.error('[Tenant] Error provisioning tenant:', error);
    next(error);
  }
}

// Update /api/icons route to use both middlewares:
app.get("/api/icons", requireAuth, ensureTenantExists, async (req, res) => {
  // existing code...
});
```

**Files to modify:**
- `server.js` (add middleware, update routes)

---

## Phase 2: Production Manifest Configuration

### 2.1 Generate Unique Add-in GUID
**File:** `manifest.production.xml` (line 9)

**Current:** `<Id>12345678-1234-1234-1234-123456789abc</Id>` (placeholder)

**Action:** Generate a unique GUID and replace:
```bash
# On macOS/Linux:
uuidgen

# Or online: https://www.guidgenerator.com/
```

**Example:** `<Id>a7f3c2e1-9b4d-4a8c-b5e6-7d8f9e0a1b2c</Id>`

⚠️ **IMPORTANT:** Once deployed, this GUID cannot be changed (it identifies your add-in permanently).

### 2.2 Update Manifest Metadata
**File:** `manifest.production.xml`

**Changes:**
```xml
<!-- Line 11: Update company name -->
<ProviderName>Spectrum Science Communications, LLC</ProviderName>

<!-- Line 13-14: Branding -->
<DisplayName DefaultValue="Rhythm Icons Library" />
<Description DefaultValue="Browse and insert curated medical and scientific icons into your Word and PowerPoint documents." />

<!-- Line 18: Add support URL -->
<SupportUrl DefaultValue="https://rhythm-icons-production.up.railway.app/support" />
```

### 2.3 Verify All Production URLs
**File:** `manifest.production.xml`

**Checklist:**
- ✅ Lines 16-17: Icon URLs point to `https://rhythm-icons-production.up.railway.app/`
- ✅ Line 21: AppDomain includes Railway domain
- ✅ Line 31: SourceLocation points to Railway taskpane.html
- ✅ Lines 121-128: All resource URLs use Railway domain

**No changes needed** - already correctly configured! ✅

---

## Phase 3: Create Required Legal Pages

### 3.1 Privacy Policy Page
**File:** Create `public/privacy.html`

**Purpose:** Required for multi-tenant apps and AppSource submission

**Content outline:**
- Data collected (user email, tenant ID, uploaded icons)
- How data is used (icon library, authentication)
- Data retention policy
- User rights (GDPR compliance if applicable)
- Contact information

### 3.2 Terms of Service Page
**File:** Create `public/terms.html`

**Content outline:**
- License to use the add-in
- User responsibilities
- Data ownership (clarify who owns uploaded icons)
- Limitation of liability
- Service availability (SLA if applicable)

### 3.3 Support Page
**File:** Create `public/support.html`

**Content:**
- How to contact support
- FAQ section
- Installation instructions
- Troubleshooting guide

**Files to create:**
- `public/privacy.html`
- `public/terms.html`
- `public/support.html`

---

## Phase 4: Private Distribution Materials

### 4.1 Create Deployment Guide for Customers
**File:** Create `docs/CUSTOMER_DEPLOYMENT.md`

**Content:**
```markdown
# Rhythm Icons Add-in - Deployment Guide for IT Administrators

## Overview
This guide explains how to deploy the Rhythm Icons add-in to your organization using Microsoft 365 Admin Center (Centralized Deployment).

## Prerequisites
- Microsoft 365 admin access
- Users must have Word and/or PowerPoint licenses

## Installation Steps

### Step 1: Download the Manifest
Download the manifest file: [manifest.production.xml](https://rhythm-icons-production.up.railway.app/manifest.xml)

### Step 2: Deploy via Admin Center
1. Sign in to [Microsoft 365 Admin Center](https://admin.microsoft.com)
2. Navigate to **Settings** > **Integrated apps** > **Add-ins**
3. Click **Deploy Add-in** > **Upload custom apps**
4. Select **I have a manifest file (XML)**
5. Click **Upload** and select the downloaded manifest.xml
6. Configure deployment:
   - **Who gets access**: Choose "Specific users/groups" or "Everyone"
   - **Deployment method**: Recommended (users can see it in Office apps)

### Step 3: User Consent (First-Time Only)
When users first launch the add-in:
1. They'll see an Azure AD consent prompt
2. Click **Accept** to grant permissions (Icons.Read scope)
3. This is a one-time consent per user

### Step 4: Verify Installation
1. Open Word or PowerPoint
2. Go to **Insert** > **Add-ins** > **My Add-ins**
3. Look for "Rhythm Icons Library"
4. Click to launch and sign in

## Troubleshooting
- **Add-in not appearing:** Wait up to 24 hours for deployment to complete
- **Sign-in errors:** Ensure users have organizational accounts (personal Microsoft accounts not supported)
- **Contact support:** support@yourcompany.com
```

### 4.2 Create Quick Start Guide for End Users
**File:** Create `docs/USER_GUIDE.md`

**Content:**
- How to launch the add-in in Word/PowerPoint
- How to search and insert icons
- How to customize icon size and color
- How to upload custom icons (if enabled)

**Files to create:**
- `docs/CUSTOMER_DEPLOYMENT.md`
- `docs/USER_GUIDE.md`

---

## Phase 5: Testing Multi-Tenant Setup

### 5.1 Test with Guest User in Different Tenant
**Steps:**
1. Get a test account from a different Azure AD tenant (or create trial Microsoft 365 tenant)
2. Sideload manifest.production.xml in Word/PowerPoint
3. Sign in with the test account
4. Verify:
   - ✅ Authentication succeeds
   - ✅ New tenant is auto-created in database
   - ✅ User can see icons (tenant-specific or default set)
   - ✅ User can insert icons into documents

### 5.2 Test Admin Consent Flow
**Purpose:** Verify IT admins can pre-consent for their organization

**Steps:**
1. Construct admin consent URL:
```
https://login.microsoftonline.com/organizations/adminconsent
  ?client_id=19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c
  &redirect_uri=https://rhythm-icons-production.up.railway.app/admin-consent
```

2. Admin visits URL and grants consent
3. Users in that tenant should not see consent prompt

### 5.3 Test Centralized Deployment
**Steps:**
1. Access a test Microsoft 365 tenant admin center
2. Follow CUSTOMER_DEPLOYMENT.md instructions
3. Verify add-in appears for assigned users within 24 hours
4. Test icon insertion and tenant isolation

---

## Phase 6: AppSource Preparation (Future)

### 6.1 AppSource Requirements Checklist
**Reference:** [Deploy and publish Office Add-ins - Microsoft Learn](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish)

- [ ] Privacy policy page (✅ covered in Phase 3)
- [ ] Terms of service page (✅ covered in Phase 3)
- [ ] Support documentation (✅ covered in Phase 3)
- [ ] Add-in validation testing (automated by Microsoft)
- [ ] Marketing materials:
  - App icon (512x512 PNG)
  - Screenshots (1280x800 recommended)
  - App description (500 chars max)
  - Feature descriptions
- [ ] Pricing model decision (free, freemium, paid)
- [ ] Partner Center account setup

### 6.2 Validation Preparation
**Required tests:**
- [ ] Add-in works in Word Online, Word Desktop (Windows/Mac), Word Mobile
- [ ] Add-in works in PowerPoint Online, Desktop, Mobile
- [ ] No console errors in browser developer tools
- [ ] Accessibility compliance (keyboard navigation, screen readers)
- [ ] Performance (loads in < 3 seconds)
- [ ] Security (HTTPS only, no inline scripts, CSP compliant)

**Files to review before AppSource submission:**
- All HTML files (CSP compliance)
- All JavaScript files (no eval, no inline event handlers)
- manifest.production.xml (AppSource validators will check schema)

---

## Critical Files to Modify

### Immediate Changes (Phase 1-2)
1. **Azure Portal:** App Registration configuration (multi-tenant setting)
2. `server.js` - Add ensureTenantExists middleware (~30 lines)
3. `manifest.production.xml` - Replace GUID (line 9), update metadata (lines 11-18)

### New Files to Create (Phase 3-4)
4. `public/privacy.html` - Privacy policy page
5. `public/terms.html` - Terms of service page
6. `public/support.html` - Support/help page
7. `docs/CUSTOMER_DEPLOYMENT.md` - IT admin deployment guide
8. `docs/USER_GUIDE.md` - End user quick start guide

### Configuration Updates
9. Update CORS in `server.js` if needed (currently uses RAILWAY_PUBLIC_DOMAIN env var - should be fine)

---

## Deployment Checklist

### Pre-Deployment
- [ ] Azure AD app converted to multi-tenant
- [ ] Unique GUID generated for manifest
- [ ] Privacy policy and terms pages created
- [ ] Tenant auto-provisioning code added to server.js
- [ ] Customer deployment documentation written

### Deploy to Production
- [ ] Run `npm run build` to create production bundle
- [ ] Push changes to Railway (auto-deploys)
- [ ] Verify legal pages accessible at production URLs
- [ ] Update manifest.production.xml with final GUID
- [ ] Host manifest.production.xml at public URL for customers to download

### Post-Deployment Testing
- [ ] Test authentication with different tenant account
- [ ] Verify new tenant auto-created in database
- [ ] Test centralized deployment in test Microsoft 365 tenant
- [ ] Confirm icon isolation per tenant (each tenant sees only their icons)

### Customer Onboarding
- [ ] Send CUSTOMER_DEPLOYMENT.md to customer IT admin
- [ ] Provide manifest.production.xml download link
- [ ] Offer to assist with first deployment (optional)
- [ ] Collect feedback for improvements

---

## Verification

### End-to-End Testing Steps

**Test 1: Multi-Tenant Authentication**
```bash
# Start servers
npm run server &
npm run dev &

# Test Steps:
1. Get test account from different Azure AD tenant
2. Visit https://rhythm-icons-production.up.railway.app/taskpane.html
3. Click "Sign in with Microsoft"
4. Authenticate with test account from different tenant
5. Verify successful sign-in (no errors in console)
6. Check database: SELECT * FROM tenants WHERE azure_tenant_id = '<test-tenant-id>'
   → Should show new tenant record
```

**Test 2: Tenant Data Isolation**
```sql
-- Verify each tenant sees only their own icons
-- Query as Tenant A user:
SELECT * FROM icons WHERE tenant_id = (
  SELECT id FROM tenants WHERE azure_tenant_id = '<tenant-a-id>'
);

-- Query as Tenant B user:
SELECT * FROM icons WHERE tenant_id = (
  SELECT id FROM tenants WHERE azure_tenant_id = '<tenant-b-id>'
);

-- Results should be different (tenant-specific icons)
```

**Test 3: Centralized Deployment**
```
1. Access Microsoft 365 Admin Center with test tenant
2. Navigate to Settings > Integrated apps > Add-ins
3. Click "Deploy Add-in" > "Upload custom apps"
4. Upload manifest.production.xml
5. Assign to test user
6. Wait 30 minutes (not 24 hours for test environments)
7. Open Word/PowerPoint as test user
8. Verify add-in appears in Insert > Add-ins > My Add-ins
```

**Test 4: Icon Insertion**
```
1. Launch add-in in Word
2. Sign in with test account
3. Search for an icon
4. Click to insert
5. Verify icon appears in document
6. Try different sizes and colors (PowerPoint only)
7. Verify no console errors
```

---

## References & Documentation

### Microsoft Official Documentation
- [Deploy and publish Office Add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish)
- [Centralized Deployment Requirements](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/centralized-deployment-of-add-ins?view=o365-worldwide)
- [Convert app to multi-tenant](https://learn.microsoft.com/en-us/entra/identity-platform/howto-convert-app-to-be-multi-tenant)
- [Office Add-in authentication overview](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/overview-authn-authz)

### Key Configuration Values
- **Production URL:** `https://rhythm-icons-production.up.railway.app`
- **Azure Client ID:** `19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c`
- **Azure Tenant ID:** `dbd0413f-9515-4bd1-945a-1948b655558b` (your org)
- **API Scope:** `api://19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c/Icons.Read`
- **Database:** Railway PostgreSQL (connection in .env)

---

## Timeline Estimate

| Phase | Time Estimate | Priority |
|-------|---------------|----------|
| Phase 1: Azure AD Multi-Tenant | 1-2 hours | **CRITICAL** |
| Phase 2: Manifest Configuration | 30 minutes | **CRITICAL** |
| Phase 3: Legal Pages | 2-3 hours | **HIGH** |
| Phase 4: Documentation | 2-3 hours | **HIGH** |
| Phase 5: Testing | 2-4 hours | **HIGH** |
| Phase 6: AppSource Prep | 8-16 hours | **FUTURE** |

**Total for private distribution:** 8-13 hours
**Total for AppSource:** +8-16 hours

---

## Risk Mitigation

### Risk 1: Tenant provisioning fails
**Mitigation:** Add error logging and fallback to default tenant
**Code:** Wrap database queries in try-catch, return helpful error messages

### Risk 2: User doesn't have consent permissions
**Mitigation:** Provide admin consent URL in documentation
**Documentation:** Add to CUSTOMER_DEPLOYMENT.md

### Risk 3: Icon data leaks between tenants
**Mitigation:** Enforce tenant_id filtering in all SQL queries
**Verification:** Test 2 above validates isolation

### Risk 4: Railway deployment fails
**Mitigation:** Test build locally before deploying
**Command:** `npm run build` and verify dist/ folder contents

### Risk 5: Manifest validation errors in Admin Center
**Mitigation:** Validate manifest XML before distribution
**Tool:** Use Office Add-in Validator: `npm install -g office-addin-manifest` then `office-addin-manifest validate manifest.production.xml`

---

## Success Criteria

✅ **Private Distribution Ready:**
- Azure AD app is multi-tenant
- Unique manifest GUID generated
- New tenants auto-provision on first sign-in
- Legal pages (privacy, terms, support) published
- Customer deployment documentation available
- Tested with at least one external tenant

✅ **AppSource Ready (Future):**
- All validation tests pass
- Marketing materials prepared
- Partner Center account set up
- Pricing model defined
- Support plan established
