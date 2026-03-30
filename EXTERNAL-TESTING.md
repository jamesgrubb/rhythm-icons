# External User Testing Guide

This guide explains how to test the Icon Library add-in with external users to verify authentication, tenant isolation, and the full user experience.

## 🎯 Testing Goals

When testing with external users, you want to verify:

1. ✅ Users can authenticate with their Microsoft accounts
2. ✅ Users only see icons from their tenant (tenant isolation)
3. ✅ New tenants are auto-provisioned on first login
4. ✅ The manifest installs correctly in Word/PowerPoint
5. ✅ Icon insertion works properly
6. ✅ Different tenants can't see each other's custom icons

## 📋 Prerequisites

### For You (Administrator)

- [ ] Backend deployed and accessible (not localhost)
- [ ] Azure AD App Registration configured for multi-tenant OR specific tenants
- [ ] Production manifest.xml with deployed URLs (not localhost)
- [ ] Database accessible from backend

### For Test Users

- [ ] Microsoft account (personal or work/school)
- [ ] Word or PowerPoint (Desktop or Web version)
- [ ] Access to the manifest.xml file

## 🔧 Setup: Azure AD Configuration

### Option 1: Single Tenant Testing (Same Organization)

**Best for:** Testing with colleagues in your organization

1. **Add Test Users to Your Azure AD Tenant**

   **Via Azure Portal:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to **Azure Active Directory** → **Users**
   - Click **+ New user** → **Create user**
   - Fill in:
     - User principal name: `testuser1@yourdomain.onmicrosoft.com`
     - Display name: `Test User 1`
     - Password: Auto-generate or set manually
   - Click **Create**

   **Invite External Users (Guest Accounts):**
   - Azure AD → **Users** → **+ New user** → **Invite external user**
   - Enter their email address
   - They'll receive an invitation email
   - They can sign in with their own Microsoft account

2. **No Additional App Registration Changes Needed**
   - Users in your tenant can immediately use the app
   - They'll see the consent screen on first sign-in

### Option 2: Multi-Tenant Testing (Different Organizations)

**Best for:** Testing tenant isolation and multi-org scenarios

1. **Update Azure App Registration**
   ```
   Supported account types: Accounts in any organizational directory (Any Azure AD - Multitenant)
   ```

2. **Update Environment Variable**
   ```bash
   # In .env, change:
   AZURE_TENANT_ID=common  # Instead of specific tenant ID
   ```

3. **Test Users Can Be:**
   - Anyone with a Microsoft work/school account
   - Personal Microsoft accounts (if enabled)
   - Users from completely different Azure AD tenants

## 📦 Sharing the Add-in

### Method 1: Direct Manifest File Sharing (Development/Testing)

1. **Deploy Your Backend**
   ```bash
   # Example: Deploy to Railway, Heroku, Azure, etc.
   # Your production URL might be: https://icons.yourcompany.com
   ```

2. **Update manifest.xml**

   Find and replace all localhost URLs with your production domain:
   ```xml
   <!-- Change this: -->
   <SourceLocation DefaultValue="https://localhost:3000/taskpane.html"/>

   <!-- To this: -->
   <SourceLocation DefaultValue="https://icons.yourcompany.com/taskpane.html"/>
   ```

3. **Share the manifest.xml**

   Send the updated `manifest.xml` file to test users via:
   - Email attachment
   - Shared drive (OneDrive, Google Drive, Dropbox)
   - GitHub release
   - Direct download link

4. **Test User Installation Instructions**

   Create a simple guide for users (see below: "TESTER-INSTRUCTIONS.md")

### Method 2: Centralized Deployment (Production)

**For Organization-wide Testing:**

1. **Upload to Microsoft 365 Admin Center**
   - Go to [admin.microsoft.com](https://admin.microsoft.com)
   - **Settings** → **Integrated apps** → **Upload custom apps**
   - Upload your manifest.xml
   - Assign to specific users or groups

2. **Users Will See:**
   - Add-in automatically appears in their Word/PowerPoint
   - No manual installation needed
   - Admin-approved, more trustworthy

### Method 3: AppSource Submission (Public)

**For Public Distribution:**
- Submit to Microsoft AppSource
- Global availability
- Microsoft validation process
- See: [Office Add-ins Publication Guide](https://docs.microsoft.com/office/dev/add-ins/publish/publish)

## 📝 Test User Instructions (Give This to Testers)

Create a file `TESTER-INSTRUCTIONS.md` with these steps:

---

## 🧪 Icon Library Add-in - Tester Instructions

Thank you for testing the Icon Library add-in! Follow these steps:

### Step 1: Install the Add-in

**For Word/PowerPoint Desktop:**

1. Download the `manifest.xml` file I sent you
2. Open Microsoft Word or PowerPoint
3. Go to **Insert** tab → **Add-ins** → **Get Add-ins**
4. Click **My Add-ins** (bottom left)
5. Click **Upload My Add-in** (top right)
6. Browse and select the `manifest.xml` file
7. Click **Upload**

**For Word/PowerPoint Online (Office.com):**

1. Go to [office.com](https://office.com) and sign in
2. Open Word or PowerPoint
3. Click **Insert** → **Add-ins** → **More Add-ins**
4. Click **Upload My Add-in**
5. Browse and select the `manifest.xml` file
6. Click **Upload**

### Step 2: Open the Add-in

1. In Word/PowerPoint, go to **Home** tab
2. Look for **Icon Library** in the ribbon
3. Click **Show Taskpane**
4. The add-in panel should open on the right side

### Step 3: Sign In

1. You'll see a "Sign in with Microsoft" button
2. Click the button
3. A popup window will open asking you to sign in
4. **Sign in with your Microsoft account** (work/school or personal)
5. You may see a consent screen asking for permissions:
   - ✅ "Read icons from the Icon Library" → Click **Accept**
6. The popup will close automatically

### Step 4: Test Icon Selection

1. After signing in, you should see a grid of icons
2. Use the search box to find icons
3. Click on category tabs to filter
4. Try adjusting the size (S/M/L buttons)
5. Try changing the theme color
6. Click an icon to insert it into your document

### Step 5: Test Session Persistence

1. Close the taskpane
2. Reopen it (Home → Icon Library → Show Taskpane)
3. **Expected:** You should see the icons immediately without signing in again

### Step 6: Test Sign Out

1. Click the sign-out button (top-right, door icon)
2. A popup will open for sign-out confirmation
3. **Expected:** You return to the sign-in screen

### 🐛 What to Report

Please let me know about:

- ✅ **Success:** "Everything worked perfectly!"
- ❌ **Sign-in failed:** Screenshot of any error messages
- ❌ **Icons didn't load:** Check browser console (F12) and send screenshot
- ❌ **Popup blocked:** Your browser may be blocking the auth popup
- ❌ **Icons won't insert:** Describe what happened
- 💡 **Suggestions:** Any features or improvements you'd like to see

### 📸 How to Send Feedback

1. **Take screenshots** of any errors
2. **Open browser DevTools** (F12) and check the Console tab
3. **Copy any error messages** you see in red
4. Send to: [your-email@company.com]

---

## 🧪 Testing Checklist for Different User Scenarios

### Scenario 1: Same Tenant Users

**Setup:**
- User A and User B both in `yourdomain.onmicrosoft.com`

**Test:**
1. User A signs in → sees default/public icons
2. User A creates custom icon (via admin panel or API)
3. User B signs in → **should see** User A's custom icon
4. ✅ **Expected:** Users in same tenant share icon library

### Scenario 2: Different Tenant Users

**Setup:**
- User A in `companyA.onmicrosoft.com`
- User B in `companyB.onmicrosoft.com`

**Test:**
1. User A signs in → auto-provisions Tenant A
2. User A creates custom icon
3. User B signs in → auto-provisions Tenant B
4. User B checks icon library → **should NOT see** User A's custom icon
5. ✅ **Expected:** Complete tenant isolation

### Scenario 3: Guest User in Another Tenant

**Setup:**
- User A (primary tenant: Company A)
- Invited as guest to Company B's Azure AD

**Test:**
1. User A signs in
2. Backend receives JWT with `tid` = Company B's tenant ID
3. User A sees Company B's icon library (not Company A's)
4. ✅ **Expected:** Guest users see host tenant's icons

### Scenario 4: Public Icons

**Setup:**
- Some icons marked as `is_public = true` in database

**Test:**
1. User A (Tenant A) signs in → sees Tenant A icons + public icons
2. User B (Tenant B) signs in → sees Tenant B icons + public icons
3. ✅ **Expected:** Public icons visible to all tenants

## 🔍 Verification Steps

### Check Backend Logs

After each test user signs in, check your backend logs:

```bash
# You should see:
[API] GET /api/icons — auth OK, user: abc123-xyz-...
[Tenant] Auto-provisioned new tenant: xxxxxxxx-xxxx-... - Company Name

# For JWT issues:
[Auth] JWT verify failed: ...
[Auth] 401 response: {...}
```

### Check Database

Verify tenant auto-provisioning worked:

```sql
-- List all tenants
SELECT id, azure_tenant_id, name, created_at FROM tenants;

-- Check which tenant a user is accessing
SELECT t.name, t.azure_tenant_id, COUNT(i.icon_id) as icon_count
FROM tenants t
LEFT JOIN icons i ON i.tenant_id = t.id
GROUP BY t.id;
```

### Check Token Claims

Have test users provide their token for debugging:

```bash
# User runs: node test-auth.js
# Then decode their token:
node -e "
const token = process.argv[1];
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64'));
console.log('User:', payload.name || payload.preferred_username);
console.log('Tenant ID:', payload.tid);
console.log('Object ID:', payload.oid);
console.log('Scopes:', payload.scp);
" "PASTE_TOKEN_HERE"
```

## 🔧 Troubleshooting External User Issues

### Issue: "Sign-in failed. Please try again."

**Causes:**
1. Azure AD app not configured for multi-tenant (if testing across orgs)
2. Token audience mismatch
3. Redirect URI not registered in Azure AD

**Debug:**
1. Check browser console (F12) for detailed error
2. Check backend logs for JWT validation errors
3. Verify Azure AD configuration

**Fix:**
```bash
# Common fixes:
1. Add test user's redirect URI to Azure AD:
   https://your-domain.com/taskpane.html

2. Verify token audience in backend logs matches:
   api://19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c

3. Check CORS settings in server.js
```

### Issue: "No tenant found for user"

**Cause:** Auto-provisioning middleware failed

**Debug:**
```javascript
// Check server.js ensureTenantExists middleware
// Look for database connection errors in logs
```

**Fix:**
```bash
# Manually create tenant for testing:
psql $DATABASE_URL -c "INSERT INTO tenants (azure_tenant_id, name) VALUES ('USER_TENANT_ID', 'Test Tenant');"
```

### Issue: Popup Blocked

**Cause:** Browser blocking MSAL popup

**Fix:**
1. Allow popups for your domain
2. Try different browser (Edge works best with Microsoft auth)
3. Consider using redirect flow instead of popup (requires code changes)

### Issue: Users See Wrong Icons (Tenant Isolation Broken)

**Cause:** Backend not filtering by tenant correctly

**Debug:**
```sql
-- Verify tenant_id in icons table matches user's JWT tid
SELECT * FROM icons WHERE tenant_id = 'USER_TENANT_ID';
```

**Fix:**
Check `getTenantId()` function in `server.js` - it should map Azure AD `tid` to your `tenants.id`

## 📊 Success Metrics

After testing with external users, you should confirm:

- ✅ **100% sign-in success rate** (no auth failures)
- ✅ **Tenant isolation verified** (users can't see other tenant's icons)
- ✅ **Auto-provisioning works** (new tenants created automatically)
- ✅ **Session restoration works** (users stay signed in between sessions)
- ✅ **Icon insertion works** (icons appear in documents correctly)
- ✅ **No console errors** (clean browser console)

## 🚀 Next Steps After Successful Testing

1. **Collect Feedback**
   - Create a simple Google Form
   - Ask about UX, performance, bugs

2. **Monitor Production**
   - Set up error tracking (e.g., Sentry)
   - Monitor backend logs for auth failures

3. **Document Known Issues**
   - Create FAQ based on tester feedback
   - Update TESTER-INSTRUCTIONS.md

4. **Plan Beta Launch**
   - Select beta user group
   - Set success criteria
   - Plan rollout schedule

## 📞 Support for Test Users

Create a support channel:
- Email: support@yourcompany.com
- Slack channel: #icon-library-beta
- Teams channel: Icon Library Support
- GitHub Issues: For technical users

Remember: The easier you make it for testers, the better feedback you'll get!
