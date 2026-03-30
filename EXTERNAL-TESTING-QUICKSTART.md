# 🚀 External Testing Quick Start

A simple checklist to get external users testing your Icon Library add-in.

## ⚡ 5-Minute Setup

### 1. Deploy Your Backend

Choose a hosting provider and deploy:

**Option A: Railway (Recommended)**
```bash
# Already connected! Your Railway deployment:
# URL: https://[your-railway-app].railway.app
# Database: Already configured in .env
```

**Option B: Azure App Service**
```bash
az webapp up --name icon-library-api --runtime "NODE:18-lts"
```

**Option C: Heroku**
```bash
heroku create icon-library-api
git push heroku main
```

**Your production URL:** `https://__________________.com`

### 2. Update Manifest for Production

```bash
# Find and replace in manifest.xml:
# FROM: https://localhost:3000
# TO: https://your-production-url.com

# Quick sed command (Mac/Linux):
sed -i '' 's|https://localhost:3000|https://your-production-url.com|g' manifest.xml

# Or manually edit manifest.xml
```

### 3. Test Production Authentication

```bash
# Update auth.js redirectUri if needed (it auto-detects, so probably OK)
# Update server.js CORS to include production domain

# Then test:
node test-auth.js
./test-api.sh
```

### 4. Share with Testers

**Send them:**
1. ✉️ Updated `manifest.xml` file
2. 📄 `TESTER-INSTRUCTIONS.md` document
3. 📧 Your contact email for feedback

**Example email template:**
```
Subject: Icon Library Add-in - Testing Invitation

Hi [Name],

I'd like to invite you to test the new Icon Library add-in for Word and PowerPoint!

WHAT IT DOES:
Quick access to curated icons directly within Office documents.

WHAT I NEED FROM YOU:
- 10-15 minutes of testing
- Feedback on any issues or suggestions

INSTRUCTIONS:
1. Download the attached manifest.xml file
2. Follow the steps in TESTER-INSTRUCTIONS.md
3. Reply to this email with your feedback

Thank you!
[Your Name]
```

## 👥 Testing Scenarios

### Scenario 1: Internal Team (Same Azure AD Tenant)

**Setup:**
- Invite colleagues from your organization
- They sign in with their work accounts

**Expected:**
- All users share the same icon library
- Auto-provisioned to same tenant
- Can create and share custom icons

**Test with:** 2-3 colleagues

### Scenario 2: External Users (Different Tenants)

**Setup:**
- Test with users from different companies
- Update Azure AD app to multi-tenant

**Expected:**
- Each tenant gets their own isolated icon library
- Public icons visible to everyone
- Custom icons only visible to same tenant

**Test with:** 1-2 users from different organizations

### Scenario 3: Guest Users

**Setup:**
- Invite external user as guest to your Azure AD
- They sign in with their own Microsoft account

**Expected:**
- Guest sees YOUR tenant's icons (not theirs)
- Behaves like an internal user

**Test with:** 1 guest user

## 📊 What to Monitor

### Backend Logs

Watch for these in your production logs:

```bash
# Good signs:
[Server] Running on port 3001
[Database] Connected to PostgreSQL
[API] GET /api/icons — auth OK, user: abc123
[Tenant] Auto-provisioned new tenant: Company XYZ

# Bad signs:
[Auth] JWT verify failed: ...
[Auth] 401 response: { error: "Invalid token" }
[Database] Connection error: ...
```

### Database Checks

```sql
-- See all tenants that have been auto-provisioned
SELECT id, azure_tenant_id, name, created_at
FROM tenants
ORDER BY created_at DESC;

-- See icon count per tenant
SELECT t.name, COUNT(i.icon_id) as icon_count
FROM tenants t
LEFT JOIN icons i ON i.tenant_id = t.id
GROUP BY t.id, t.name;
```

### Common Issues

| Issue | Quick Fix |
|-------|-----------|
| 401 Unauthorized | Check Azure AD redirect URI matches production URL |
| "No tenant found" | Check database connection, verify auto-provisioning middleware |
| Popup blocked | Tell users to allow popups for your domain |
| Icons won't load | Check CORS settings in server.js |
| Wrong tenant's icons | Verify getTenantId() logic in server.js |

## ✅ Success Criteria

Before declaring testing successful, verify:

- [ ] At least 3 users successfully signed in
- [ ] No authentication errors in logs
- [ ] Icons load in under 2 seconds
- [ ] Icon insertion works in Word and PowerPoint
- [ ] Tenant isolation confirmed (if testing multi-tenant)
- [ ] Session persistence works (reopen taskpane)
- [ ] Sign-out works properly
- [ ] No browser console errors

## 📝 Feedback Collection

Create a simple Google Form with these questions:

1. Were you able to sign in successfully? (Yes/No)
2. Did icons load quickly? (Yes/No/Too slow)
3. Were you able to insert icons? (Yes/No/With issues)
4. What browser and Office version did you use?
5. Any errors or issues? (Text field)
6. What features would you like to see? (Text field)
7. How likely are you to use this regularly? (1-5 scale)

**Share form link with testers:**
`https://forms.google.com/your-form-here`

## 🐛 Troubleshooting Script

Give this to testers who encounter issues:

```javascript
// Have them paste this in browser console (F12) to get debug info:
console.log('=== DEBUG INFO ===');
console.log('Current URL:', window.location.href);
console.log('MSAL Accounts:', msalInstance?.getAllAccounts());
console.log('Auth Config:', AUTH_CONFIG);
console.log('Office Host:', Office?.context?.host);
console.log('==================');
```

## 📞 Support Response Templates

### "I can't sign in"

```
Thanks for reporting! Let's troubleshoot:

1. What browser are you using?
2. Do you see a popup window, or is it blocked?
3. Can you press F12, click Console tab, and send me a screenshot?
4. Try this: [your-production-url.com]/taskpane.html directly in browser

I'll help get you sorted!
```

### "Icons won't load"

```
Let me help troubleshoot:

1. Did you see any error messages?
2. How long did you wait? (Should be under 5 seconds)
3. Can you press F12, Network tab, and check if there's a request to /api/icons?
4. What's the status code? (Should be 200, might be 401 or 500)

Send me a screenshot of the Network tab and I'll investigate!
```

## 🎯 Next Steps After Testing

1. **Collect all feedback** → Create issues in GitHub/project tracker
2. **Prioritize bugs** → Fix critical issues before next round
3. **Analyze metrics** → Sign-in success rate, load times
4. **Update docs** → Improve TESTER-INSTRUCTIONS based on questions
5. **Plan v2 features** → Based on tester suggestions
6. **Prepare for wider rollout** → Beta → Production

## 📚 Reference Links

- Azure AD App Registration: [portal.azure.com](https://portal.azure.com)
- Office Add-ins Documentation: [Microsoft Docs](https://docs.microsoft.com/office/dev/add-ins/)
- Railway Dashboard: [railway.app](https://railway.app)
- Your Backend Logs: [Check your hosting provider]
- Your Database: [Check your PostgreSQL provider]

## 🔗 Testing Resources You Created

- ✅ `TESTER-INSTRUCTIONS.md` - Send to all testers
- ✅ `EXTERNAL-TESTING.md` - Complete testing guide (for you)
- ✅ `test-auth.js` - Get Azure AD token for API testing
- ✅ `test-api.sh` - Automated API endpoint testing
- ✅ `check-deployment-readiness.sh` - Pre-deployment validation

---

**Remember:** The first external user test is always bumpy. Expect issues, collect feedback, iterate quickly!

**Good luck! 🚀**
