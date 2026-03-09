// =============================================
//  auth.js — Azure AD / MSAL Authentication
//  Uses MSAL.js 2.x (popup flow for Office add-ins)
// =============================================

window.AUTH_CONFIG = {
  // ⚠️  Replace these with your Azure App Registration values
  clientId:    "YOUR-AZURE-APP-CLIENT-ID",
  tenantId:    "YOUR-AZURE-TENANT-ID",   // or "common" for multi-tenant
  redirectUri: "https://YOUR-DOMAIN/taskpane.html",

  // Scopes your API requires. Add your own API scope here.
  // e.g. "api://YOUR-APP-CLIENT-ID/Icons.Read"
  scopes: ["openid", "profile", "email"],
  apiScope: "api://YOUR-AZURE-APP-CLIENT-ID/Icons.Read",
};
const AUTH_CONFIG = window.AUTH_CONFIG;

const msalConfig = {
  auth: {
    clientId:    AUTH_CONFIG.clientId,
    authority:   `https://login.microsoftonline.com/${AUTH_CONFIG.tenantId}`,
    redirectUri: AUTH_CONFIG.redirectUri,
  },
  cache: {
    cacheLocation:      "sessionStorage",
    storeAuthStateInCookie: true, // needed for IE11 / some Office clients
  },
  system: {
    loggerOptions: {
      loggerCallback(level, message) {
        if (level === msal.LogLevel.Error) console.error("[MSAL]", message);
      },
    },
  },
};

let msalInstance = null;
let currentAccount = null;

/**
 * Initialise MSAL. Called once Office.js is ready.
 */
function initMsal() {
  msalInstance = new msal.PublicClientApplication(msalConfig);
  return msalInstance.initialize();
}

/**
 * Attempt silent sign-in first; fall back to popup.
 * Returns an access token string, or throws.
 */
async function signIn() {
  if (!msalInstance) throw new Error("MSAL not initialised");

  const tokenRequest = {
    scopes: [AUTH_CONFIG.apiScope, ...AUTH_CONFIG.scopes],
    prompt: "select_account",
  };

  // Try silent first (cached session)
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const silentResult = await msalInstance.acquireTokenSilent({
        ...tokenRequest,
        account: accounts[0],
      });
      currentAccount = silentResult.account;
      return silentResult.accessToken;
    } catch (silentErr) {
      // Falls through to popup
      console.warn("[Auth] Silent token acquisition failed, trying popup", silentErr);
    }
  }

  // Popup sign-in
  const popupResult = await msalInstance.loginPopup(tokenRequest);
  currentAccount = popupResult.account;

  // Immediately acquire the token after login
  const tokenResult = await msalInstance.acquireTokenSilent({
    ...tokenRequest,
    account: currentAccount,
  });
  return tokenResult.accessToken;
}

/**
 * Acquire an access token silently (for API calls after initial sign-in).
 * Call this before every fetch to your backend.
 */
async function getAccessToken() {
  if (!msalInstance || !currentAccount) throw new Error("Not signed in");
  try {
    const result = await msalInstance.acquireTokenSilent({
      scopes: [AUTH_CONFIG.apiScope],
      account: currentAccount,
    });
    return result.accessToken;
  } catch {
    // Token expired — re-acquire via popup
    const result = await msalInstance.acquireTokenPopup({
      scopes: [AUTH_CONFIG.apiScope],
      account: currentAccount,
    });
    return result.accessToken;
  }
}

/**
 * Sign the user out and clear cached accounts.
 */
async function signOut() {
  if (!msalInstance) return;
  await msalInstance.logoutPopup({ account: currentAccount });
  currentAccount = null;
}

/**
 * Returns the currently signed-in account, or null.
 */
function getCurrentAccount() {
  return currentAccount;
}

/**
 * Check if a user is already signed in (e.g. from a previous session).
 * Returns an access token if yes, null if not.
 */
async function tryRestoreSession() {
  if (!msalInstance) return null;
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) return null;
  try {
    const result = await msalInstance.acquireTokenSilent({
      scopes: [AUTH_CONFIG.apiScope],
      account: accounts[0],
    });
    currentAccount = result.account;
    return result.accessToken;
  } catch {
    return null;
  }
}

// Expose auth functions to window for cross-file access
window.initMsal = initMsal;
window.signIn = signIn;
window.signOut = signOut;
window.tryRestoreSession = tryRestoreSession;
