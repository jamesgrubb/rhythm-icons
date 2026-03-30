# Railway Deployment Guide

This guide walks you through deploying the Icon Library add-in to Railway.

## 🚂 What is Railway?

Railway is a modern deployment platform that:
- Automatically deploys from GitHub on every push
- Provides PostgreSQL database (already configured!)
- Generates HTTPS URLs automatically
- Handles environment variables securely

## 📋 Prerequisites

- [x] GitHub repository: `https://github.com/jamesgrubb/rhythm-icons`
- [x] Railway account: [railway.app](https://railway.app)
- [x] PostgreSQL database already provisioned on Railway

## 🚀 Deployment Steps

### Step 1: Build Production Bundle

Before deploying, create the production build:

```bash
npm run build
```

This creates the `dist/` folder with optimized files.

### Step 2: Commit All Changes

```bash
# Add new testing and deployment files
git add .

# Commit
git commit -m "Add deployment configuration and testing tools"

# Push to GitHub
git push origin main
```

### Step 3: Connect Railway to GitHub

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Sign in (if not already signed in)

2. **Create New Project (if not exists)**
   - Click **"+ New Project"**
   - Select **"Deploy from GitHub repo"**
   - Choose **"jamesgrubb/rhythm-icons"**

   OR if project exists:
   - Open your existing project
   - Click the service
   - Go to **Settings** → **Service** → **Source**
   - Ensure it's connected to your GitHub repo

3. **Configure Branch**
   - Source: `main` branch
   - Auto-deploy: **Enabled** ✅

### Step 4: Set Environment Variables

In Railway Dashboard:

1. **Go to your service** → **Variables** tab

2. **Add these variables:**

   ```
   NODE_ENV=production
   PORT=3001
   AZURE_CLIENT_ID=19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c
   AZURE_TENANT_ID=dbd0413f-9515-4bd1-945a-1948b655558b
   ```

3. **DATABASE_URL should already exist** (Railway auto-configures)
   - If not, copy from your `.env` file

4. **Optional: Add RAILWAY_PUBLIC_DOMAIN reference**
   - Railway provides this automatically as `${{RAILWAY_PUBLIC_DOMAIN}}`

### Step 5: Trigger Deployment

Railway will automatically deploy when you push to GitHub. You can also:

- Click **"Deploy"** button in Railway dashboard
- Or re-trigger: **Settings** → **Redeploy**

**Watch the build logs:**
```
Running build command: npm install && npm run build
Building webpack bundle...
✓ Compiled successfully
Starting server...
[Server] Running on port 3001
[Database] Connected to PostgreSQL
```

### Step 6: Get Your Production URL

Once deployed, Railway provides a public URL:

**Format:** `https://[service-name].up.railway.app`

**Find it:**
1. Railway Dashboard → Your Service → **Settings** → **Domains**
2. You'll see: `your-app-name.up.railway.app`
3. **Copy this URL** - you'll need it for the manifest!

Example: `https://rhythm-icons-production.up.railway.app`

## 📝 Update Manifest.xml

Now update your manifest with the production URL:

```bash
# Replace localhost with Railway URL
sed -i '' 's|https://localhost:3000|https://YOUR-RAILWAY-URL.up.railway.app|g' manifest.xml

# Or manually edit manifest.xml and replace all instances of:
# FROM: https://localhost:3000
# TO: https://your-railway-url.up.railway.app
```

**Important locations to update in manifest.xml:**
- `<SourceLocation DefaultValue="..."/>`
- All `<bt:Url>` tags
- `<SupportUrl>` (if present)

## ✅ Verify Deployment

### Test 1: Health Check

```bash
# Basic connectivity test
curl https://YOUR-RAILWAY-URL.up.railway.app/

# Should return your HTML or static files
```

### Test 2: API Endpoints

```bash
# Test unauthenticated (should return 401)
curl https://YOUR-RAILWAY-URL.up.railway.app/api/icons

# Response: {"error":"Missing bearer token"} ✅

# Test with valid token
node test-auth.js  # Get token
curl https://YOUR-RAILWAY-URL.up.railway.app/api/icons \
  -H "Authorization: Bearer $(cat .test-token)" | jq
```

### Test 3: Manifest Download

```bash
curl https://YOUR-RAILWAY-URL.up.railway.app/manifest.xml

# Should return your manifest XML
```

### Test 4: End-to-End in Office

1. Open Word or PowerPoint
2. Sideload the updated `manifest.xml`
3. Open Icon Library taskpane
4. Sign in with Microsoft
5. Icons should load from production database!

## 🔧 Troubleshooting

### Build Fails

**Error:** `Module not found` or `webpack error`

**Fix:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Connection Error

**Error:** `[Database] Connection error`

**Check:**
1. Railway Variables → Verify `DATABASE_URL` is set
2. Check database service is running
3. Try connecting locally: `psql $DATABASE_URL`

### 401 Unauthorized in Production

**Error:** All API calls return 401

**Fix:**
1. Update Azure AD Redirect URI:
   - Go to [Azure Portal](https://portal.azure.com)
   - App Registration → Authentication → Add URI
   - Add: `https://YOUR-RAILWAY-URL.up.railway.app/taskpane.html`
   - Type: **Single-page application (SPA)**

2. Update CORS in `server.js` (already configured with RAILWAY_PUBLIC_DOMAIN)

### Migrations Not Running

**Error:** Database tables don't exist

**Fix:**
```bash
# SSH into Railway container (via dashboard) or run locally:
NODE_ENV=production npm run db:migrate

# Or set build command in railway.json:
# "npm install && npm run build && npm run db:migrate"
```

### Can't Access Public URL

**Error:** `ERR_CONNECTION_REFUSED`

**Check:**
1. Service is running (Railway dashboard shows green)
2. Check logs for startup errors
3. Verify PORT environment variable (Railway auto-sets)

## 🔄 Auto-Deploy Workflow

Once set up, your workflow becomes:

```bash
# 1. Make code changes locally
vim server.js

# 2. Test locally
npm run dev
npm run server

# 3. Commit and push
git add .
git commit -m "Feature: Add new endpoint"
git push origin main

# 4. Railway automatically:
#    - Detects push
#    - Runs npm install
#    - Runs npm run build
#    - Restarts service
#    - ✅ Live in ~2 minutes!
```

## 📊 Monitor Your Deployment

### Railway Dashboard

**Metrics:**
- CPU usage
- Memory usage
- Request count
- Response times

**Logs:**
- Real-time application logs
- Filter by severity (info, error, warn)
- Download logs for debugging

### Application Logging

Add monitoring to `server.js`:

```javascript
// Already implemented:
console.log('[Server] Running on port', PORT);
console.log('[API] GET /api/icons — auth OK, user:', userId);
console.log('[Auth] JWT verify failed:', error);
```

**View logs:**
```bash
# In Railway dashboard: Deployments → View Logs
# Or use Railway CLI:
railway logs
```

## 🔐 Security Checklist

Before going live:

- [ ] `NODE_ENV=production` set in Railway
- [ ] `.env` file NOT committed to git (in .gitignore)
- [ ] Azure AD redirect URIs updated with production URL
- [ ] CORS configured for production domain only
- [ ] HTTPS enforced (Railway does this automatically)
- [ ] Helmet.js enabled (already configured in server.js)
- [ ] JWT validation enabled (no `SKIP_JWT_VERIFY` in production)

## 📈 Scaling

Railway auto-scales based on load, but you can configure:

1. **Horizontal Scaling**
   - Settings → Instances → Increase count

2. **Vertical Scaling**
   - Settings → Resources → Increase RAM/CPU

3. **Database Scaling**
   - Database service → Settings → Upgrade plan

## 💰 Costs

**Railway Pricing:**
- Free tier: $5/month credit (great for testing)
- Hobby plan: $5/month (suitable for small teams)
- Pro plan: $20/month (production workloads)

**Your current setup:**
- Backend service: ~$5-10/month
- PostgreSQL: Included in your plan
- Bandwidth: Usually included

## 🚀 Next Steps After Deployment

1. **Update Azure AD**
   - Add production redirect URI
   - Configure multi-tenant if needed

2. **Update CORS**
   - Already configured to use `RAILWAY_PUBLIC_DOMAIN`

3. **Test with External Users**
   - Share updated manifest.xml
   - Send TESTER-INSTRUCTIONS.md

4. **Monitor First Week**
   - Check Railway logs daily
   - Watch for auth errors
   - Track user signups in database

5. **Set Up Alerts** (Optional)
   - Railway → Settings → Webhooks
   - Get notified of deployment failures
   - Monitor uptime

## 📚 Resources

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway CLI: `npm install -g @railway/cli`
- Your GitHub Repo: https://github.com/jamesgrubb/rhythm-icons
- Azure Portal: [portal.azure.com](https://portal.azure.com)

## 🆘 Support

**Railway Support:**
- Discord: [discord.gg/railway](https://discord.gg/railway)
- Email: team@railway.app

**Your Project:**
- GitHub Issues: https://github.com/jamesgrubb/rhythm-icons/issues

---

**Deployment Status:** 🟡 Ready to deploy

**Action Required:** Follow Step 1-6 above to complete deployment!
