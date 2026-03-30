# API Testing Guide

This guide explains how to test the backend API authentication and endpoints using curl.

## Prerequisites

- Backend server running on `http://localhost:3001`
- Node.js installed
- `jq` installed (optional, for pretty JSON output): `brew install jq`

## Quick Start

### Step 1: Acquire an Azure AD Token

Run the token acquisition script:

```bash
node test-auth.js
```

This will:
1. Display a device code and URL
2. Open your browser to https://microsoft.com/devicelogin
3. Prompt you to enter the code
4. Sign in with your Microsoft account
5. Save the token to `.test-token` file
6. Display curl commands you can use

**Output Example:**
```
=============================================================
AUTHENTICATION REQUIRED
=============================================================

📱 Please visit: https://microsoft.com/devicelogin
🔑 Enter code: ABC123XYZ

⏳ Waiting for authentication...
```

### Step 2: Test API Endpoints

Run the automated test suite:

```bash
./test-api.sh
```

This will test:
- ✅ GET /api/icons (list all icons)
- ✅ GET /api/icons/:id (get specific icon)
- ✅ POST /api/icons (create new icon)
- ✅ Invalid token handling (401 response)

## Manual Testing with Curl

### Test Without Authentication (Should Return 401)

```bash
curl -X GET http://localhost:3001/api/icons \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "error": "Missing bearer token"
}
```

### Test With Valid Token

After running `node test-auth.js`, use the saved token:

```bash
# List all icons
curl -X GET http://localhost:3001/api/icons \
  -H "Authorization: Bearer $(cat .test-token)" \
  -H "Content-Type: application/json" | jq

# Get specific icon
curl -X GET http://localhost:3001/api/icons/heart \
  -H "Authorization: Bearer $(cat .test-token)" \
  -H "Content-Type: application/json" | jq

# Create new icon
curl -X POST http://localhost:3001/api/icons \
  -H "Authorization: Bearer $(cat .test-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "custom-icon",
    "name": "Custom Icon",
    "category": "Custom",
    "svg": "<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg>"
  }' | jq
```

### Test With Invalid Token (Should Return 401)

```bash
curl -X GET http://localhost:3001/api/icons \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "error": "Invalid or expired token",
  "debug": {
    "token_aud": "...",
    "token_iss": "...",
    "expected_aud": ["19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c", "api://19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c"],
    "expected_iss": [...]
  }
}
```

## Understanding the Token

The token is a JWT (JSON Web Token) with three parts separated by dots:

```
header.payload.signature
```

### Decode Token Payload

```bash
# Extract and decode the payload (middle section)
cat .test-token | cut -d. -f2 | base64 -d | jq
```

**Important Claims:**
- `aud` (audience): Should be `api://19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c`
- `iss` (issuer): Azure AD issuer URL
- `scp` (scopes): Should include `Icons.Read`
- `tid` (tenant ID): Your Azure AD tenant ID
- `exp` (expiration): Unix timestamp when token expires

## Troubleshooting

### 401 Unauthorized

**Cause:** Invalid or expired token

**Debug in development mode:**
```bash
# Set SKIP_JWT_VERIFY=1 in .env to accept any Bearer token (dev only!)
# The backend will decode but not verify the signature
```

**Check token claims:**
```bash
node -e "
const token = require('fs').readFileSync('.test-token', 'utf8');
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64'));
console.log('Audience:', payload.aud);
console.log('Scopes:', payload.scp);
console.log('Expires:', new Date(payload.exp * 1000));
"
```

### 403 Forbidden

**Cause:** No tenant found for user

**Solution:** Check that your Azure AD tenant ID is in the `tenants` table, or the auto-provisioning middleware should create it automatically.

### Connection Refused

**Cause:** Backend server not running

**Solution:**
```bash
npm run server
```

### CORS Error

**Cause:** Frontend making requests from different origin

**Solution:** Update `cors` configuration in `server.js` to include your origin.

## Backend Logs

Monitor backend logs to see authentication attempts:

```bash
# In the terminal where you ran `npm run server`, you'll see:
[Auth] JWT verify failed: jwt malformed
[Auth] Token aud: api://... | iss: https://...
[API] GET /api/icons — auth OK, user: abc123-xyz
```

## Testing Tenant Isolation

The API should only return icons for your tenant:

```bash
# User from Tenant A should only see Tenant A's icons + public icons
# User from Tenant B should only see Tenant B's icons + public icons
```

Test by:
1. Creating icons with your tenant
2. Sign in with different tenant user (if available)
3. Verify they don't see each other's icons

## Token Expiration Testing

Tokens typically expire after 1 hour. To test expiration handling:

1. Get a token: `node test-auth.js`
2. Wait 1+ hours (or modify the token's `exp` claim)
3. Try to use the expired token
4. The frontend should automatically refresh via `acquireTokenSilent()`
5. Backend should return 401 if token is expired

## Files Created

- `test-auth.js` - Token acquisition script
- `test-api.sh` - Automated API testing script
- `.test-token` - Cached token (gitignored)
- `API-TESTING.md` - This guide

## Security Notes

⚠️ **Never commit `.test-token` to git** - it's already in `.gitignore`

⚠️ **SKIP_JWT_VERIFY** should only be used in development, never in production

⚠️ **Tokens are sensitive** - treat them like passwords
