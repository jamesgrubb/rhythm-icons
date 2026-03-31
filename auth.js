// =============================================
//  auth.js — Azure AD / MSAL Authentication
//  Uses MSAL.js 2.x (popup flow for Office add-ins)
// =============================================

window.AUTH_CONFIG = {
  // Azure App Registration values
  clientId:    "19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c",
  tenantId:    "dbd0413f-9515-4bd1-945a-1948b655558b",
  redirectUri: window.location.origin + "/taskpane.html", // Auto-detects localhost or production domain

  // Scopes your API requires
  scopes: ["openid", "profile", "email"],
  apiScope: "api://19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c/Icons.Read",
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

/** Only one interactive flow at a time (avoids interaction_in_progress). */
let interactionPromise = null;

/**
 * Initialise MSAL. Called once Office.js is ready.
 */
function initMsal() {
  msalInstance = new msal.PublicClientApplication(msalConfig);
  return msalInstance.initialize();
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
        console.log("[Auth] Silent sign-in successful");
        return silentResult.accessToken;
      } catch (silentErr) {
        console.warn("[Auth] Silent token acquisition failed, opening dialog", silentErr);
      }
    }

    // Use Office Dialog API for authentication
    console.log("[Auth] Opening Office Dialog for authentication...");
    const dialogUrl = window.location.origin + "/auth-dialog.html";

    return new Promise((resolve, reject) => {
      let dialogClosed = false;

      // Also listen for postMessage as fallback
      const messageHandler = (event) => {
        if (event.origin !== window.location.origin) return;

        try {
          const response = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

          if (response.status === "success") {
            window.removeEventListener("message", messageHandler);
            currentAccount = {
              username: response.account.username,
              name: response.account.name,
            };
            console.log("[Auth] Sign-in successful via postMessage:", currentAccount.username);
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
          console.log("[Auth] Dialog opened successfully");

          // Listen for messages from the dialog
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            if (dialogClosed) return;
            dialogClosed = true;
            dialog.close();
            window.removeEventListener("message", messageHandler);

            try {
              const response = JSON.parse(arg.message);
              console.log("[Auth] Received message from dialog:", response.status);

              if (response.status === "success") {
                currentAccount = {
                  username: response.account.username,
                  name: response.account.name,
                };
                console.log("[Auth] Sign-in successful:", currentAccount.username);
                resolve(response.token);
              } else {
                console.error("[Auth] Sign-in failed:", response.error);
                reject(new Error(response.error || "Authentication failed"));
              }
            } catch (err) {
              console.error("[Auth] Failed to parse dialog message:", err);
              reject(new Error("Failed to process authentication response"));
            }
          });

          // Handle dialog closed by user
          dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
            if (dialogClosed) return;
            console.log("[Auth] Dialog event:", arg.error);
            dialogClosed = true;
            window.removeEventListener("message", messageHandler);
            reject(new Error("Authentication cancelled by user"));
          });
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
    console.log("[Auth] Token acquired - scopes:", result.scopes);
    console.log("[Auth] Token preview:", result.accessToken.substring(0, 50) + "...");
    // Decode JWT to check audience (for debugging)
    const payload = JSON.parse(atob(result.accessToken.split('.')[1]));
    console.log("[Auth] Token audience:", payload.aud);
    console.log("[Auth] Expected audience:", AUTH_CONFIG.clientId);
    return result.accessToken;
  } catch (err) {
    console.warn("[Auth] Silent token failed:", err);
    // Token expired — re-acquire via popup (one interactive flow at a time)
    return withInteractionLock(async () => {
      const result = await msalInstance.acquireTokenPopup({
        scopes: [AUTH_CONFIG.apiScope],
        account: currentAccount,
      });
      console.log("[Auth] Popup token acquired - scopes:", result.scopes);
      const payload = JSON.parse(atob(result.accessToken.split('.')[1]));
      console.log("[Auth] Token audience:", payload.aud);
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
window.clearCurrentSession = clearCurrentSession;
