# Quick Testing Checklist

Use this checklist to test with each new user.

## 📋 Pre-Test Setup

**Choose ONE:**

- [ ] **Option A: Local Testing** (fastest, same org only)
  - Servers running: `npm run dev` + `npm run server` ✓
  - Manifest has localhost URLs ✓
  - Colleague on same network or you'll share manifest ✓

- [ ] **Option B: Production Testing** (real-world, any user)
  - Deployed to Railway ✓
  - Manifest updated with Railway URL ✓
  - Azure AD redirect URI configured ✓
  - Tested yourself first ✓

## 📤 Sending to Tester

- [ ] Prepare manifest.xml (local or production version)
- [ ] Send email using `test-invite-email.txt` template
- [ ] Attach manifest.xml OR share cloud storage link
- [ ] Include `TESTER-INSTRUCTIONS.md` (optional but helpful)

## 👀 During Testing

- [ ] Open Railway logs (if production) or local terminal
- [ ] Watch for these log messages:
  ```
  [API] GET /api/icons — auth OK, user: xyz
  [Tenant] Auto-provisioned new tenant: ...
  ```

## ✅ Success Criteria

When tester reports back, verify:

- [ ] **Installation worked** - They saw "Icon Library" button
- [ ] **Sign-in succeeded** - Popup appeared, they signed in, no errors
- [ ] **Icons loaded** - Grid of icons appeared in taskpane
- [ ] **Insertion worked** - Clicking icon inserted it into document
- [ ] **No errors** - No red errors in console or error messages

## 🐛 If Issues Occur

### Sign-in Failed
- [ ] Check Azure AD redirect URI matches your domain
- [ ] Check popup blocker disabled
- [ ] Try different browser (recommend Edge)

### Icons Won't Load
- [ ] Check Railway logs for 401 or 500 errors
- [ ] Verify database connection (Railway dashboard)
- [ ] Test API manually: `node test-auth.js && ./test-api.sh`

### Can't Install Manifest
- [ ] Re-send fresh manifest.xml
- [ ] Verify file isn't corrupted (check first line is `<?xml`)
- [ ] Try different Office client (Desktop vs Web)

## 📊 Post-Test Verification

- [ ] Check Railway logs (or local logs) for authentication success
- [ ] Check database for new tenant:
  ```bash
  psql $DATABASE_URL -c "SELECT * FROM tenants ORDER BY created_at DESC LIMIT 3;"
  ```
- [ ] Record feedback in tracking sheet/document
- [ ] Thank the tester!

## 📝 Feedback Tracking

For each tester, record:

| Name | Organization | Date | Sign-in | Icons Load | Insert Works | Issues | Notes |
|------|--------------|------|---------|------------|--------------|--------|-------|
| Alice | CompanyA | 3/30 | ✅ | ✅ | ✅ | None | Perfect! |
| Bob | CompanyB | 3/30 | ❌ | - | - | 401 error | Fixed redirect URI |
| Carol | CompanyA | 3/31 | ✅ | ✅ | ⚠️ | Slow load | Need to optimize |

## 🎯 Testing Goals

**Minimum testing before launch:**
- [ ] 3+ successful sign-ins
- [ ] At least 1 external user (different org) - for tenant isolation test
- [ ] Tested on both Word and PowerPoint
- [ ] Tested on Desktop AND Web versions
- [ ] No 401 errors in production
- [ ] Session persistence works (reopen taskpane)

## 🚀 Quick Commands

```bash
# Check recent tenants
psql $DATABASE_URL -c "SELECT azure_tenant_id, name, created_at FROM tenants ORDER BY created_at DESC LIMIT 5;"

# Watch Railway logs live
railway logs --follow

# Test production API
curl https://YOUR-RAILWAY-URL/api/icons

# Get test token
node test-auth.js

# Run full API tests
./test-api.sh
```

## 📧 Template Responses

**Success:**
```
Awesome! Thanks so much for testing. Everything worked perfectly.

If you have any feature suggestions or notice anything else,
feel free to let me know anytime!
```

**Issues Found:**
```
Thanks for the detailed feedback! I see the issue - [explanation].

I've [fixed it / deployed a fix / need more info].

Can you try again and let me know if it works now?
```

**Can't Reproduce:**
```
Thanks for reporting! I'm having trouble reproducing this on my end.

Could you try:
1. [troubleshooting step 1]
2. [troubleshooting step 2]

And if it still fails, send me a screenshot of the Console (F12)?
```

---

**Keep this checklist handy for each new tester!** ✅
