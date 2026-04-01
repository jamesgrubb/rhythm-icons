# How to Test with Other Users - Practical Guide

Let's get people testing your add-in! This guide gives you exact steps.

## 🎯 Quick Decision: Which Testing Approach?

### Option A: Test LOCALLY with colleagues (Fastest - 5 minutes)

**Best for:**
- Quick validation with 1-2 colleagues
- Same organization/Azure AD tenant
- Want to test TODAY without deployment

**Requirements:**
- Colleagues have Word/PowerPoint
- They can access your network OR you send them the manifest
- Your dev servers are running

**Jump to:** [Local Testing with Colleagues](#local-testing-5-minutes)

---

### Option B: Test PRODUCTION with external users (Best for real testing)

**Best for:**
- Testing with people outside your organization
- Multi-tenant isolation testing
- Real-world authentication flow
- Getting actual user feedback

**Requirements:**
- Railway deployment complete (10 minutes)
- Updated manifest with production URL
- Azure AD redirect URI configured

**Jump to:** [Production Testing with External Users](#production-testing-30-minutes)

---

## Local Testing (5 minutes)

### Perfect for: Testing with 1-2 colleagues in your organization TODAY

### Step 1: Ensure Servers Are Running

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server

# Both should show:
# ✓ webpack compiled successfully
# ✓ [Server] Running on port 3001
```

### Step 2: Prepare Manifest

Your current `manifest.xml` already has localhost URLs - **no changes needed!**

```bash
# Just verify it has localhost:3000
grep "localhost:3000" manifest.xml
# Should show several matches ✓
```

### Step 3: Share Manifest with Colleague

**Option A: Email**
```
Subject: Test Icon Library Add-in

Hey [Name],

Can you help test the Icon Library add-in? It'll take 5 minutes.

1. Download the attached manifest.xml
2. Open Word or PowerPoint
3. Go to Insert → Add-ins → Upload My Add-in
4. Select the manifest.xml file
5. Look for "Icon Library" button in the Home tab
6. Click it and sign in with your Microsoft account

Let me know if you see any errors!

Attachments: manifest.xml
```

**Option B: Shared Drive**
- Upload `manifest.xml` to OneDrive/SharePoint
- Share link with colleague

**Option C: In-Person**
- Give them a USB drive or AirDrop the file

### Step 4: Colleague Installs Add-in

**They follow these steps:**

1. Open Word or PowerPoint (Desktop or Web)
2. Click **Insert** → **Add-ins** → **Get Add-ins**
3. Click **My Add-ins** (bottom left)
4. Click **Upload My Add-in** (top right)
5. Browse and select `manifest.xml`
6. Click **Upload**

**✅ Success:** They see "Icon Library added" message

### Step 5: Colleague Tests Authentication

**They do:**

1. Look for **Icon Library** button in **Home** tab
2. Click **Show Taskpane**
3. Taskpane opens on the right
4. Click **"Sign in with Microsoft"**
5. Popup opens → they sign in
6. Icons should appear! 🎉

### Step 6: Watch Your Backend Logs

```bash
# In your terminal running the server, you'll see:
[API] GET /api/icons — auth OK, user: abc123-xyz...
[Tenant] Auto-provisioned new tenant: dbd0413f-...
```

**✅ Success indicators:**
- Logs show their user ID
- No 401 errors
- Icons loaded successfully

### Common Local Testing Issues

**Issue: "Cannot connect to server"**
```bash
# Colleague needs to be on same network OR
# You need to expose localhost with ngrok:
npx ngrok http 3000

# Then update manifest.xml with ngrok URL temporarily
```

**Issue: "Popup blocked"**
```
Tell them to:
1. Allow popups for localhost in browser settings
2. Try again
```

**Issue: "Missing bearer token"**
```
This is expected if they haven't signed in yet.
If persists after sign-in, check browser console (F12).
```

---

## Production Testing (30 minutes)

### Perfect for: Real-world testing with external users

### Step 1: Deploy to Railway

**If you haven't deployed yet:**

```bash
# Open deployment guide
open RAILWAY-DEPLOY-NOW.md

# Follow steps 1-5 to:
# - Connect Railway to GitHub
# - Set environment variables
# - Deploy
# - Get production URL
```

**Your production URL will be something like:**
`https://rhythm-icons-production.up.railway.app`

### Step 2: Update Manifest for Production

```bash
# Save your LOCAL manifest first
cp manifest.xml manifest-local.xml

# Update manifest with production URL
sed -i '' 's|https://localhost:3000|https://YOUR-RAILWAY-URL.up.railway.app|g' manifest.xml

# Verify changes
grep "railway" manifest.xml
# Should show your Railway URL
```

### Step 3: Update Azure AD Redirect URI

**CRITICAL: Do this or authentication will fail!**

1. Go to [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **App registrations**
3. Find your app: Click on it
4. **Authentication** (left sidebar)
5. Under **Single-page application**, click **Add URI**
6. Enter: `https://YOUR-RAILWAY-URL.up.railway.app/taskpane.html`
7. Click **Save**

**Your redirect URIs should now include:**
- `https://localhost:3000/taskpane.html` (for local dev)
- `https://YOUR-RAILWAY-URL.up.railway.app/taskpane.html` (for production)

### Step 4: Test Production Yourself First

```bash
# Test the API
curl https://YOUR-RAILWAY-URL.up.railway.app/api/icons
# Should return: {"error":"Missing bearer token"}

# Test with auth
node test-auth.js
curl https://YOUR-RAILWAY-URL.up.railway.app/api/icons \
  -H "Authorization: Bearer $(cat .test-token)" | jq
# Should return icon array!
```

**Install in Word/PowerPoint:**
1. Remove old add-in (if installed)
2. Upload updated `manifest.xml` (with Railway URL)
3. Open Icon Library
4. Sign in
5. Icons should load! ✓

### Step 5: Prepare Materials for Testers

**Create a shared folder with:**

1. **Updated `manifest.xml`** (with production URL)
2. **`TESTER-INSTRUCTIONS.md`** (already created)
3. **Feedback form link** (optional - see below)

**Upload to:**
- Google Drive, Dropbox, OneDrive, or
- Create a GitHub Release with assets

### Step 6: Send Invitation to Testers

**Email Template:**

```
Subject: [Test Request] Icon Library Add-in for Word & PowerPoint

Hi [Name],

I'm building an Icon Library add-in for Microsoft Word and PowerPoint, and I'd love your feedback!

⏱️ TIME COMMITMENT: 10-15 minutes

🎯 WHAT YOU'LL DO:
- Install a test add-in in Word/PowerPoint
- Sign in with your Microsoft account
- Try inserting a few icons
- Share any issues or feedback

📦 WHAT YOU NEED:
- Microsoft Word or PowerPoint (Desktop or Web)
- A Microsoft account (work, school, or personal)

📋 INSTRUCTIONS:
1. Download the files from: [YOUR_SHARED_LINK]
2. Open the "TESTER-INSTRUCTIONS.md" file
3. Follow the steps (very simple!)
4. Reply to this email with feedback

🐛 IF YOU HIT ISSUES:
- Take a screenshot
- Press F12 in your browser and screenshot any red errors
- Send to me - I'll help troubleshoot!

Thanks so much for helping test!

Best,
[Your Name]
[Your Email]
```

### Step 7: Set Up Monitoring

**Watch Railway Logs:**
```
1. Go to Railway dashboard
2. Click your service
3. Click "Deployments" → Latest deployment
4. Click "View Logs"
5. Filter for: [Auth], [API], [Tenant]
```

**Watch for these:**
```
✅ [API] GET /api/icons — auth OK, user: xyz
✅ [Tenant] Auto-provisioned new tenant: Company ABC
❌ [Auth] JWT verify failed: ...
❌ [Auth] 401 response: { error: "Invalid token" }
```

**Check Database:**
```bash
# See new tenants created
psql $DATABASE_URL -c "
  SELECT azure_tenant_id, name, created_at
  FROM tenants
  ORDER BY created_at DESC
  LIMIT 10;
"
```

### Step 8: Create Feedback Collection

**Option A: Simple Email**
Just ask testers to reply with:
- ✅ What worked
- ❌ What didn't work
- 💡 Suggestions

**Option B: Google Form**

Create form with these questions:

1. **Were you able to install the add-in?** (Yes/No)
2. **Were you able to sign in?** (Yes/No/Had issues)
3. **Did icons load?** (Yes/No/Too slow)
4. **Were you able to insert icons?** (Yes/No)
5. **What Office version are you using?** (Word Desktop/PowerPoint Desktop/Word Web/PowerPoint Web)
6. **What browser (if using web)?** (Chrome/Edge/Safari/Firefox)
7. **Any errors or issues?** (Text field)
8. **Overall experience rating** (1-5 stars)
9. **What would make this better?** (Text field)

Share form link: `https://forms.google.com/your-form`

---

## Testing Scenarios

### Scenario 1: Same Organization (Shared Icon Library)

**Setup:**
- 2-3 colleagues in your organization
- All sign in with @yourcompany.com accounts

**Expected Behavior:**
- All users see the SAME icon library
- Icons you add, they see
- Icons they add, you see
- All share tenant

**Verify:**
```sql
-- Should see only ONE tenant with multiple users
SELECT azure_tenant_id, name, created_at FROM tenants;
```

### Scenario 2: Different Organizations (Tenant Isolation)

**Setup:**
- User A: Your organization (@companyA.com)
- User B: Different organization (@companyB.com)

**Expected Behavior:**
- User A and B see DIFFERENT icon libraries
- User A's custom icons hidden from User B
- User B's custom icons hidden from User A
- Both see public icons

**Verify:**
```sql
-- Should see TWO tenants
SELECT
  t.name,
  COUNT(i.icon_id) as icon_count
FROM tenants t
LEFT JOIN icons i ON i.tenant_id = t.id
GROUP BY t.id;
```

### Scenario 3: Personal Microsoft Accounts

**Setup:**
- User signs in with @outlook.com or @hotmail.com

**Expected Behavior:**
- User gets their own tenant
- Sees public icons only (unless you add icons to their tenant)

**Azure AD Config Required:**
- App Registration → Supported account types
- Select: "Personal Microsoft accounts" ✓

---

## Troubleshooting Common User Issues

### "I can't find the manifest file"

**Solution:**
- Send manifest.xml as email attachment
- Or share via cloud storage link
- Make sure filename is exactly `manifest.xml`

### "Upload failed / Invalid manifest"

**Causes:**
- File corrupted during download
- Wrong file uploaded
- Manifest has errors

**Solution:**
```bash
# Validate manifest locally
cat manifest.xml | head -5
# Should start with: <?xml version="1.0" encoding="UTF-8"?>

# Re-send a fresh copy
```

### "Sign in popup doesn't appear"

**Causes:**
- Popup blocker
- Browser extensions blocking

**Solution:**
1. Check browser popup settings
2. Whitelist your domain
3. Try different browser (Edge works best)
4. Try incognito/private mode

### "401 Unauthorized" errors

**Causes:**
- Azure AD redirect URI not configured
- Token expired
- CORS issue

**Solution:**
1. Verify redirect URI in Azure Portal
2. Check Railway logs for specific error
3. Test API directly with `test-auth.js`

### "Icons won't load"

**Causes:**
- Database connection issue
- No icons in database
- API error

**Solution:**
```bash
# Check if icons exist in database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM icons;"

# Check Railway logs
# Look for: [API] GET /api/icons

# Test API directly
curl https://YOUR-RAILWAY-URL/api/icons \
  -H "Authorization: Bearer $(cat .test-token)"
```

---

## Validation Checklist

After each tester, verify:

- [ ] User successfully signed in (check Railway logs)
- [ ] New tenant created (if different org) - check database
- [ ] Icons loaded in taskpane
- [ ] Icon insertion worked in document
- [ ] No errors in browser console
- [ ] No 401/500 errors in Railway logs
- [ ] User can sign out and sign back in
- [ ] Session persists on taskpane reopen

---

## Quick Testing Commands

```bash
# Check who's signed in recently
psql $DATABASE_URL -c "
  SELECT azure_tenant_id, name
  FROM tenants
  ORDER BY created_at DESC;
"

# Check Railway logs
railway logs

# Test production API
curl https://YOUR-RAILWAY-URL/api/icons

# Get test token
node test-auth.js

# Full API test
./test-api.sh
```

---

## Summary: Choose Your Path

**For quick colleague testing (TODAY):**
1. Keep servers running locally
2. Share `manifest.xml` (as-is)
3. Colleague uploads manifest
4. Watch logs, done!

**For real external testing (PROPER):**
1. Deploy to Railway (10 min)
2. Update manifest.xml with Railway URL
3. Update Azure AD redirect URI
4. Test yourself first
5. Share manifest + instructions
6. Monitor logs and collect feedback

**Either way, you'll verify:**
✅ Authentication works
✅ Icons load correctly
✅ Tenant isolation works (if testing multi-tenant)
✅ Add-in is ready for users

---

Ready to start? Pick Option A or B above and follow the steps! 🚀
