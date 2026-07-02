// =============================================
//  auth.js — Azure AD / MSAL Authentication
//  Uses MSAL.js 2.x (popup flow for Office add-ins)
// =============================================

window.AUTH_CONFIG = {
  // Azure App Registration values — injected at build time by webpack
  // (DefinePlugin) from AZURE_CLIENT_ID / AZURE_TENANT_ID. See DEPLOYMENT-AZURE.md.
  clientId:    process.env.AZURE_CLIENT_ID,
  tenantId:    process.env.AZURE_TENANT_ID,
  redirectUri: window.location.origin + "/taskpane.html", // Auto-detects localhost or production domain

  // Scopes your API requires
  scopes: ["openid", "profile", "email"],
  apiScope: `api://${process.env.AZURE_CLIENT_ID}/Icons.Read`,
};
const AUTH_CONFIG = window.AUTH_CONFIG;

// Gated debug logging — off in production. Never pass tokens or raw dialog
// messages to this (or any) logger.
const AUTH_DEBUG = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const alog = (...a) => { if (AUTH_DEBUG) console.log(...a); };

const msalConfig = {
  auth: {
    clientId:    AUTH_CONFIG.clientId,
    authority:   'https://login.microsoftonline.com/common', // Multi-tenant: accepts users from any Azure AD org
    redirectUri: AUTH_CONFIG.redirectUri,
  },
  cache: {
    cacheLocation:      "localStorage", // Use localStorage to persist across taskpane reopens
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

/** Only one interactive flow at a time (avoids interaction_in_progress). */
let interactionPromise = null;

/**
 * Initialise MSAL. Called once Office.js is ready.
 * Only initializes once globally to preserve session across multiple calls.
 */
async function initMsal() {
  // Only initialize once globally
  if (window.__MSAL_INSTANCE__) {
    alog("[Auth] Using existing MSAL instance");
    msalInstance = window.__MSAL_INSTANCE__;
    return;
  }

  alog("[Auth] Creating new MSAL instance");
  msalInstance = new msal.PublicClientApplication(msalConfig);
  await msalInstance.initialize();

  // Store globally so all bootstrap calls use the same instance
  window.__MSAL_INSTANCE__ = msalInstance;

  alog("[Auth] MSAL instance initialized and stored globally");
}

/**
 * Run one interactive auth at a time; if one is already running, wait for it.
 * Returns the result of the given async fn.
 */
async function withInteractionLock(fn) {
  while (interactionPromise) {
    await interactionPromise.catch(() => {});
  }
  const p = fn();
  interactionPromise = p;
  try {
    return await p;
  } finally {
    interactionPromise = null;
  }
}

/**
 * Attempt silent sign-in first; fall back to Office Dialog.
 * Returns an access token string, or throws.
 * Uses Office Dialog API for proper authentication in add-ins.
 */
async function signIn() {
  if (!msalInstance) throw new Error("MSAL not initialised");

  return withInteractionLock(async () => {
    const tokenRequest = {
      scopes: [AUTH_CONFIG.apiScope],
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
        alog("[Auth] Silent sign-in successful");
        return silentResult.accessToken;
      } catch (silentErr) {
        console.warn("[Auth] Silent token acquisition failed, opening dialog", silentErr);
      }
    }

    // Use Office Dialog API for authentication
    alog("[Auth] Opening Office Dialog for authentication...");
    const dialogUrl = window.location.origin + "/auth-dialog.html";

    return new Promise((resolve, reject) => {
      let dialogClosed = false;

      // Also listen for postMessage as fallback
      const messageHandler = async (event) => {
        if (event.origin !== window.location.origin) return;

        try {
          const response = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

          if (response.status === "success") {
            window.removeEventListener("message", messageHandler);
            alog("[Auth] Sign-in successful via postMessage:", response.account.username);

            // Reinitialize MSAL to pick up the cached account from localStorage
            alog("[Auth] Reinitializing MSAL to load cached account...");
            msalInstance = new msal.PublicClientApplication(msalConfig);
            await msalInstance.initialize();
            window.__MSAL_INSTANCE__ = msalInstance;

            // Now get the account from the reinitialized instance
            const accounts = msalInstance.getAllAccounts();
            alog("[Auth] After reinit, found", accounts.length, "account(s)");
            if (accounts.length > 0) {
              currentAccount = accounts[0];
            } else {
              // Fallback to the account info from dialog
              currentAccount = {
                username: response.account.username,
                name: response.account.name,
              };
            }

            resolve(response.token);
          } else if (response.status === "error") {
            window.removeEventListener("message", messageHandler);
            console.error("[Auth] Sign-in failed via postMessage:", response.error);
            reject(new Error(response.error || "Authentication failed"));
          }
        } catch (err) {
          console.error("[Auth] Failed to parse postMessage:", err);
        }
      };

      window.addEventListener("message", messageHandler);

      Office.context.ui.displayDialogAsync(
        dialogUrl,
        { height: 70, width: 40, promptBeforeOpen: false },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Failed) {
            window.removeEventListener("message", messageHandler);
            console.error("[Auth] Dialog failed to open:", result.error);
            reject(new Error("Failed to open authentication dialog: " + result.error.message));
            return;
          }

          const dialog = result.value;
          alog("[Auth] Dialog opened successfully, dialog object:", !!dialog);
          alog("[Auth] Dialog has addEventHandler?", typeof dialog.addEventHandler);

          // Listen for messages from the dialog
          const messageReceivedHandler = async (arg) => {
            alog("[Auth] DialogMessageReceived event fired"); // never log arg — it carries the token

            if (dialogClosed) {
              alog("[Auth] Dialog already closed, ignoring message");
              return;
            }

            dialogClosed = true;
            alog("[Auth] Closing dialog...");

            try {
              dialog.close();
              alog("[Auth] Dialog.close() called successfully");
            } catch (closeErr) {
              console.error("[Auth] Error calling dialog.close():", closeErr);
            }

            window.removeEventListener("message", messageHandler);

            try {
              const response = JSON.parse(arg.message); // do NOT log arg.message (token)
              alog("[Auth] Received message from dialog:", response.status);

              if (response.status === "success") {
                alog("[Auth] Sign-in successful");

                // Reinitialize MSAL to pick up the cached account from localStorage
                // (the dialog wrote it, but our in-memory instance doesn't know about it yet)
                alog("[Auth] Reinitializing MSAL to load cached account...");
                msalInstance = new msal.PublicClientApplication(msalConfig);
                await msalInstance.initialize();
                window.__MSAL_INSTANCE__ = msalInstance;

                // Now get the account from the reinitialized instance
                const accounts = msalInstance.getAllAccounts();
                alog("[Auth] After reinit, found", accounts.length, "account(s)");
                if (accounts.length > 0) {
                  currentAccount = accounts[0];
                } else {
                  // Fallback to the account info from dialog
                  currentAccount = {
                    username: response.account.username,
                    name: response.account.name,
                  };
                }

                resolve(response.token);
              } else {
                console.error("[Auth] Sign-in failed:", response.error);
                reject(new Error(response.error || "Authentication failed"));
              }
            } catch (err) {
              console.error("[Auth] Failed to parse dialog message:", err && err.message);
              reject(new Error("Failed to process authentication response"));
            }
          };

          dialog.addEventHandler(Office.EventType.DialogMessageReceived, messageReceivedHandler);
          alog("[Auth] DialogMessageReceived handler attached");

          // Handle dialog closed by user
          dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
            alog("[Auth] DialogEventReceived fired, error:", arg.error);
            if (dialogClosed) return;
            alog("[Auth] Dialog closed by user");
            dialogClosed = true;
            window.removeEventListener("message", messageHandler);
            reject(new Error("Authentication cancelled by user"));
          });

          alog("[Auth] All dialog event handlers attached");
        }
      );
    });
  });
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
    alog("[Auth] Token acquired - scopes:", result.scopes);
    return result.accessToken;
  } catch (err) {
    alog("[Auth] Silent token failed:", err && err.message);
    // Token expired — re-acquire via popup (one interactive flow at a time)
    return withInteractionLock(async () => {
      const result = await msalInstance.acquireTokenPopup({
        scopes: [AUTH_CONFIG.apiScope],
        account: currentAccount,
      });
      alog("[Auth] Popup token acquired - scopes:", result.scopes);
      return result.accessToken;
    });
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
 * Clear current session without opening logout popup (e.g. after 401).
 * Next sign-in will use cached account if any and try silent or popup.
 */
function clearCurrentSession() {
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
  if (!msalInstance) {
    alog("[Auth] tryRestoreSession: No MSAL instance");
    return null;
  }

  const accounts = msalInstance.getAllAccounts();
  alog("[Auth] tryRestoreSession: Found", accounts.length, "account(s)");

  if (accounts.length === 0) return null;

  try {
    alog("[Auth] tryRestoreSession: Attempting silent token acquisition");
    const result = await msalInstance.acquireTokenSilent({
      scopes: [AUTH_CONFIG.apiScope],
      account: accounts[0],
    });
    currentAccount = result.account;
    alog("[Auth] tryRestoreSession: Success! Restored session for", currentAccount.username);
    return result.accessToken;
  } catch (err) {
    alog("[Auth] tryRestoreSession: Failed -", err.message);
    return null;
  }
}

// Expose auth functions to window for cross-file access
window.initMsal = initMsal;
window.signIn = signIn;
window.signOut = signOut;
window.getAccessToken = getAccessToken;
window.tryRestoreSession = tryRestoreSession;
window.clearCurrentSession = clearCurrentSession;
