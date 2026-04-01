# 🚂 Deploy to Railway - Quick Steps

Your code is ready! Follow these steps to deploy right now.

## ✅ What's Ready

- [x] Production build created (`npm run build` ✓)
- [x] Railway configuration added (`railway.json` ✓)
- [x] All code committed and pushed to GitHub ✓
- [x] Database already configured (Railway PostgreSQL)

## 🚀 Deploy Steps (5 minutes)

### Step 1: Open Railway Dashboard

Go to: **https://railway.app**

Sign in with GitHub if prompted.

### Step 2: Create New Project (or use existing)

**If you DON'T have a Railway project yet:**

1. Click **"+ New Project"**
2. Select **"Deploy from GitHub repo"**
3. Click **"Configure GitHub App"** (if needed)
4. Authorize Railway to access your repos
5. Select **"jamesgrubb/rhythm-icons"**
6. Click **"Deploy Now"**

**If you ALREADY have a Railway project:**

1. Open your existing project
2. Click on your service (or add new service)
3. Go to **Settings** → **Source**
4. Connect to: `github.com/jamesgrubb/rhythm-icons`
5. Branch: `main`
6. Enable **Auto Deploy**: ✅ ON

### Step 3: Set Environment Variables

In your Railway service:

1. Click **"Variables"** tab (left sidebar)

2. Click **"+ New Variable"** and add each of these:

```
NODE_ENV = production
AZURE_CLIENT_ID = 19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c
AZURE_TENANT_ID = dbd0413f-9515-4bd1-945a-1948b655558b
```

3. **Check DATABASE_URL** - Should already exist (Railway auto-adds it)
   - If not, go to your database service → Connect → Copy DATABASE_URL
   - Add it as a variable

4. Click **"Add"** or **"Save"** for each variable

### Step 4: Deploy!

Railway will automatically deploy. Watch the logs:

1. Click **"Deployments"** tab
2. You'll see the build in progress
3. Build logs will show:
   ```
   Running build: npm install && npm run build
   Compiling webpack...
   ✓ Compiled successfully
   Starting server: npm start
   [Server] Running on port 3001
   [Database] Connected to PostgreSQL
   ```

**Wait ~2-3 minutes** for first deployment.

### Step 5: Get Your Public URL

Once deployment succeeds (green checkmark ✓):

1. Go to **"Settings"** tab → **"Networking"** or **"Domains"**
2. You'll see a Railway domain:
   ```
   https://your-service-name.up.railway.app
   ```
3. **Copy this URL** 📋 - you'll need it!

4. You can also add a custom domain here (optional)

### Step 6: Test Your Deployment

```bash
# Test basic connectivity
curl https://YOUR-RAILWAY-URL.up.railway.app/manifest.xml

# Test API (should return 401 without auth)
curl https://YOUR-RAILWAY-URL.up.railway.app/api/icons

# Expected response:
# {"error":"Missing bearer token"} ✅
```

## 🎯 Next Step: Update Manifest

Now update your `manifest.xml` with the production URL:

```bash
# Replace localhost with your Railway URL
# Example:
sed -i '' 's|https://localhost:3000|https://your-app.up.railway.app|g' manifest.xml

# Or edit manually in any text editor
```

**Find and replace:**
- **FROM:** `https://localhost:3000`
- **TO:** `https://your-railway-url.up.railway.app`

**Important:** Update ALL occurrences (should be ~4-5 places)

## ✅ Verify It's Working

### Test 1: Visit in Browser

Open: `https://YOUR-RAILWAY-URL.up.railway.app/taskpane.html`

You should see the Icon Library interface (might show auth screen).

### Test 2: Check API

```bash
# Get a token for testing
node test-auth.js

# Test production API
curl https://YOUR-RAILWAY-URL.up.railway.app/api/icons \
  -H "Authorization: Bearer $(cat .test-token)" | jq

# Should return icon array from your database!
```

### Test 3: Full End-to-End

1. Open Word or PowerPoint
2. Upload your updated `manifest.xml`
3. Open Icon Library taskpane
4. Sign in with Microsoft
5. Icons should load! 🎉

## 🔧 Troubleshooting

### Build Fails

**Check Railway logs** for specific error:
- Deployments → Click failed deployment → View logs

**Common fixes:**
```bash
# Locally test the build
npm run build

# If it fails locally, fix the error and:
git add .
git commit -m "Fix build error"
git push origin main
# Railway will auto-deploy again
```

### "Cannot connect to database"

**Check:**
1. Railway Variables → `DATABASE_URL` exists
2. Database service is running (should show green in dashboard)
3. Service has database linked (Settings → Service → Database)

**Fix:**
```
# In Railway:
1. Go to database service
2. Click "Connect"
3. Copy the DATABASE_URL
4. Add it to your main service's Variables
```

### 401 Errors on Sign-in

**Azure AD redirect URI not updated:**

1. Go to [portal.azure.com](https://portal.azure.com)
2. Azure Active Directory → App registrations
3. Find your app: `Icon Library`
4. Authentication → Add URI:
   - Type: **Single-page application**
   - URL: `https://YOUR-RAILWAY-URL.up.railway.app/taskpane.html`
5. Save

### "Missing bearer token" when it should work

**CORS issue:**

Your `server.js` already handles this! It uses `RAILWAY_PUBLIC_DOMAIN` environment variable.

Verify in Railway:
- Variables → Check `RAILWAY_PUBLIC_DOMAIN` exists (Railway auto-adds)

## 📊 Monitor Your Deployment

**Railway Dashboard:**
- **Deployments**: See all deployment history
- **Metrics**: CPU, memory, request count
- **Logs**: Real-time application logs

**Useful log filters:**
```
[Server]   - Server startup messages
[Auth]     - Authentication events
[API]      - API requests
[Database] - Database operations
[Tenant]   - Tenant provisioning
```

## 🔄 Future Deployments

From now on, deploying is automatic:

```bash
# 1. Make changes
vim server.js

# 2. Test locally
npm run dev

# 3. Commit and push
git add .
git commit -m "Your change description"
git push origin main

# 4. Railway auto-deploys! ✨
#    Watch it in the Railway dashboard
```

## 🎉 Success!

Once deployed, you'll have:

✅ **Production API:** `https://your-app.up.railway.app`
✅ **Auto-deployments:** Push to GitHub = automatic deploy
✅ **Database:** PostgreSQL already connected
✅ **HTTPS:** Automatic SSL certificate
✅ **Logs:** Real-time monitoring in Railway

## 📧 Ready for Testing

Now you can:

1. **Update manifest.xml** with production URL
2. **Send to testers**: `manifest.xml` + `TESTER-INSTRUCTIONS.md`
3. **Monitor logs** in Railway dashboard
4. **Collect feedback** from testers

## 🆘 Need Help?

**Railway Support:**
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app

**Check these first:**
- Railway deployment logs
- Your browser console (F12)
- Backend API logs

**Your deployment info:**
- GitHub: https://github.com/jamesgrubb/rhythm-icons
- Railway: Check your dashboard for URL

---

**Current Status:** ✅ Ready to deploy!

**Estimated Time:** 5-10 minutes for first deployment

**Let's go! 🚀**
