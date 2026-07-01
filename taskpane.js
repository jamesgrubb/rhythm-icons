// =============================================
//  taskpane.js — Main controller
//  Wires together: Office.js, MSAL auth, icon picker
// =============================================

// Debug status on screen
function updateDebugStatus(msg) {
  const debug = document.getElementById('debug-status');
  if (debug) {
    const time = new Date().toLocaleTimeString();
    debug.innerHTML += `<div>${time}: ${msg}</div>`;
  }
  console.log("[TaskPane]", msg);
}

updateDebugStatus("Script loaded");

// Global guard to prevent any duplicate initialization across all script loads
if (!window.__RHYTHM_ICONS_INITIALIZED__) {
  window.__RHYTHM_ICONS_INITIALIZED__ = true;

Office.onReady(async ({ host }) => {
  updateDebugStatus(`Office.onReady fired! Host: ${host}`);

  // Additional check in case Office.onReady fires multiple times
  if (window.__RHYTHM_ICONS_BOOTSTRAPPED__) {
    updateDebugStatus("Already bootstrapped, skipping duplicate Office.onReady");
    return;
  }
  window.__RHYTHM_ICONS_BOOTSTRAPPED__ = true;

  const currentHost = host; // Office.HostType.Word | Office.HostType.PowerPoint

  // ---- DOM refs ----
  const loadingOverlay = document.getElementById("loading-overlay");
  const authScreen     = document.getElementById("auth-screen");
  const mainScreen     = document.getElementById("main-screen");
  const signinBtn      = document.getElementById("signin-btn");
  const signoutBtn     = document.getElementById("signout-btn");
  const authError      = document.getElementById("auth-error");
  const searchInput    = document.getElementById("search-input");
  const clearSearch    = document.getElementById("clear-search");
  const clientTabs     = document.getElementById("client-tabs");
  const categoryTabs   = document.getElementById("category-tabs");
  const iconGrid       = document.getElementById("icon-grid");
  const emptyState     = document.getElementById("empty-state");
  const emptyQuery     = document.getElementById("empty-query");
  const resultCount    = document.getElementById("result-count");
  const toast                = document.getElementById("toast");
  const sizeBtns             = document.querySelectorAll(".size-btn");
  const colorBtns            = document.querySelectorAll(".color-btn");
  const circleBackgroundToggle = document.getElementById("circle-background-toggle");
  const colorBar             = document.getElementById("color-bar");
  const mixedStrokeToggle    = document.getElementById("mixed-stroke-toggle");
  const mixedStrokeColors    = document.getElementById("mixed-stroke-colors");
  const mixedColorBtns       = document.querySelectorAll(".mixed-color-btn");
  const uploadBtn            = document.getElementById("upload-btn");
  const uploadModal          = document.getElementById("upload-modal");
  const closeUpload          = document.getElementById("close-upload");
  const svgFileInput         = document.getElementById("svg-file-input");
  const previewSection       = document.getElementById("preview-section");
  const previewGrid          = document.getElementById("preview-grid");
  const previewCount         = document.getElementById("preview-count");
  const copyCodeBtn          = document.getElementById("copy-code-btn");
  const confirmModal         = document.getElementById("confirm-modal");
  const confirmTitle         = document.getElementById("confirm-title");
  const confirmMessage       = document.getElementById("confirm-message");
  const confirmInput         = document.getElementById("confirm-input");
  const confirmOkBtn         = document.getElementById("confirm-ok");
  const confirmCancelBtn     = document.getElementById("confirm-cancel");
  const iconClientSelect     = document.getElementById("icon-client");
  const addClientBtn         = document.getElementById("add-client-btn");
  const uploadClients        = document.getElementById("upload-clients");
  const uploadStatus         = document.getElementById("upload-status");
  const pasteIconName        = document.getElementById("paste-icon-name");
  const pasteIconSvg         = document.getElementById("paste-icon-svg");
  const pasteIconAdd         = document.getElementById("paste-icon-add");
  const pasteIconStatus      = document.getElementById("paste-icon-status");
  const selectModeBtn        = document.getElementById("select-mode-btn");
  const selectionBar         = document.getElementById("selection-bar");
  const selectAllBtn         = document.getElementById("select-all-btn");
  const selectionCount       = document.getElementById("selection-count");
  const selectionDeleteBtn   = document.getElementById("selection-delete-btn");
  const selectionCancelBtn   = document.getElementById("selection-cancel-btn");

  // ---- State ----
  let selectionMode  = false;        // Bulk-select mode (admin)
  let selectedIds    = new Set();    // icon.id strings currently selected
  let lastVisibleIcons = [];         // icons rendered in the current view
  let sheetQueue     = [];           // multi-icon sheets awaiting split + review
  let allIcons       = [];
  let activeClient   = "All";
  let activeQuery    = "";
  let selectedSize   = 48;   // px — inserted icon size
  let selectedColor  = "Accent1";  // PowerPoint theme color
  let circleBackground = false;  // Add circle background to icons
  let mixedStroke    = false;  // Use multiple colors (randomly assigned)
  let mixedColor1    = "Accent1";  // First color for mixed stroke
  let mixedColor2    = "Accent2";  // Second color for mixed stroke
  let uploadedIcons  = [];  // Temporary storage for bulk uploaded icons
  let toastTimer     = null;
  let currentUserRole = null;  // 'admin', 'user', 'viewer'
  let currentUserProfile = null; // { name, email, role, tenant }
  let themeColors = null; // Actual PowerPoint theme colors (fetched via API)
  let themeRefreshInterval = null; // Interval for periodic theme color refresh
  let allClients = []; // All clients for current tenant

  // ---- Helpers ----
  function showScreen(name) {
    [loadingOverlay, authScreen, mainScreen].forEach(el => el.classList.remove("active"));
    if (name === "loading") loadingOverlay.classList.add("active");
    if (name === "auth")    authScreen.classList.add("active");
    if (name === "main")    mainScreen.classList.add("active");
  }

  function showToast(msg = "Icon inserted") {
    toast.childNodes[1].textContent = " " + msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
  }

  function setAuthError(msg) {
    authError.textContent = msg;
    authError.classList.toggle("hidden", !msg);
  }

  // Custom confirm dialog (window.confirm not supported in Office Add-ins)
  function customConfirm(message, title = "Confirm", { confirmLabel = "Delete", danger = true } = {}) {
    return new Promise((resolve) => {
      confirmTitle.textContent = title;
      confirmMessage.textContent = message;
      confirmInput.classList.add("hidden");
      confirmCancelBtn.style.display = 'block';
      confirmOkBtn.textContent = confirmLabel;
      confirmOkBtn.classList.toggle("btn-danger", danger);
      confirmOkBtn.classList.toggle("btn-primary", !danger);
      confirmModal.classList.remove("hidden");

      const handleOk = () => {
        confirmModal.classList.add("hidden");
        confirmOkBtn.removeEventListener("click", handleOk);
        confirmCancelBtn.removeEventListener("click", handleCancel);
        resolve(true);
      };

      const handleCancel = () => {
        confirmModal.classList.add("hidden");
        confirmOkBtn.removeEventListener("click", handleOk);
        confirmCancelBtn.removeEventListener("click", handleCancel);
        resolve(false);
      };

      confirmOkBtn.addEventListener("click", handleOk);
      confirmCancelBtn.addEventListener("click", handleCancel);
    });
  }

  // Custom alert dialog (window.alert not supported in Office Add-ins)
  function customAlert(message, title = "Notice") {
    return new Promise((resolve) => {
      confirmTitle.textContent = title;
      confirmMessage.textContent = message;
      confirmInput.classList.add("hidden");
      confirmCancelBtn.style.display = 'none';
      confirmOkBtn.textContent = 'OK';
      confirmOkBtn.className = 'btn-primary'; // Change to primary style
      confirmModal.classList.remove("hidden");

      const handleOk = () => {
        confirmModal.classList.add("hidden");
        confirmOkBtn.className = 'btn-danger'; // Reset to danger style
        confirmOkBtn.removeEventListener("click", handleOk);
        resolve();
      };

      confirmOkBtn.addEventListener("click", handleOk);
    });
  }

  // Custom prompt dialog (window.prompt not supported in Office Add-ins)
  function customPrompt(message, title = "Enter Value", defaultValue = "") {
    return new Promise((resolve) => {
      confirmTitle.textContent = title;
      confirmMessage.textContent = message;
      confirmInput.value = defaultValue;
      confirmInput.classList.remove("hidden");
      confirmCancelBtn.style.display = 'block';
      confirmOkBtn.textContent = 'OK';
      confirmOkBtn.className = 'btn-primary';
      confirmModal.classList.remove("hidden");

      // Focus input after a short delay (for rendering)
      setTimeout(() => {
        confirmInput.focus();
        confirmInput.select();
      }, 100);

      const handleOk = () => {
        const value = confirmInput.value.trim();
        confirmModal.classList.add("hidden");
        confirmInput.classList.add("hidden");
        confirmOkBtn.className = 'btn-danger';
        confirmOkBtn.removeEventListener("click", handleOk);
        confirmCancelBtn.removeEventListener("click", handleCancel);
        confirmInput.removeEventListener("keydown", handleKeydown);
        resolve(value || null);
      };

      const handleCancel = () => {
        confirmModal.classList.add("hidden");
        confirmInput.classList.add("hidden");
        confirmOkBtn.className = 'btn-danger';
        confirmOkBtn.removeEventListener("click", handleOk);
        confirmCancelBtn.removeEventListener("click", handleCancel);
        confirmInput.removeEventListener("keydown", handleKeydown);
        resolve(null);
      };

      const handleKeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleOk();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      };

      confirmOkBtn.addEventListener("click", handleOk);
      confirmCancelBtn.addEventListener("click", handleCancel);
      confirmInput.addEventListener("keydown", handleKeydown);
    });
  }

  // Custom duplicate icon prompt
  function promptDuplicateAction(duplicateInfo) {
    return new Promise((resolve) => {
      const modal = document.getElementById("duplicate-modal");
      const title = document.getElementById("duplicate-title");
      const message = document.getElementById("duplicate-message");
      const existingPreview = document.getElementById("duplicate-existing-preview");
      const existingName = document.getElementById("duplicate-existing-name");
      const newPreview = document.getElementById("duplicate-new-preview");
      const newName = document.getElementById("duplicate-new-name");
      const renameInput = document.getElementById("duplicate-rename-input");
      const hintText = document.getElementById("duplicate-hint");
      const skipBtn = document.getElementById("duplicate-skip");
      const replaceBtn = document.getElementById("duplicate-replace");

      // Set content
      const { uploaded, existing, isVersioned, isExactMatch } = duplicateInfo;

      if (isExactMatch) {
        title.textContent = "Icon Already Exists";
        message.textContent = `"${existing.name}" is already in your library.`;
      } else if (isVersioned) {
        title.textContent = "Similar Icon Found";
        message.textContent = `"${existing.name}" already exists in your library.`;
      } else {
        title.textContent = "Icon Already Exists";
        message.textContent = `"${existing.name}" is already in your library.`;
      }

      // Render previews - show what exists vs what's being uploaded
      // Strip hardcoded colors for better visibility
      let existingSvg = existing.svg;
      existingSvg = existingSvg.replace(/stroke=["']#[0-9a-fA-F]{3,6}["']/g, 'stroke="currentColor"');
      existingSvg = existingSvg.replace(/stroke=["']rgb\([^)]+\)["']/g, 'stroke="currentColor"');
      existingSvg = existingSvg.replace(/fill=["']#[0-9a-fA-F]{3,6}["']/g, 'fill="none"');
      existingSvg = existingSvg.replace(/fill=["']rgb\([^)]+\)["']/g, 'fill="none"');

      let uploadedSvg = uploaded.svg;
      uploadedSvg = uploadedSvg.replace(/stroke=["']#[0-9a-fA-F]{3,6}["']/g, 'stroke="currentColor"');
      uploadedSvg = uploadedSvg.replace(/stroke=["']rgb\([^)]+\)["']/g, 'stroke="currentColor"');
      uploadedSvg = uploadedSvg.replace(/fill=["']#[0-9a-fA-F]{3,6}["']/g, 'fill="none"');
      uploadedSvg = uploadedSvg.replace(/fill=["']rgb\([^)]+\)["']/g, 'fill="none"');

      existingPreview.innerHTML = existingSvg;
      existingName.textContent = existing.name;
      newPreview.innerHTML = uploadedSvg;

      // Show the original filename to avoid confusion
      const uploadFileName = uploaded.name;
      newName.textContent = uploadFileName;

      // Hide rename input and hint initially
      renameInput.classList.add("hidden");
      hintText.classList.add("hidden");
      renameInput.value = "";

      // Generate smart placeholder suggestions based on context
      const baseName = existing.name;
      const suggestions = [
        `${baseName} (alternative)`,
        `${baseName} (outline)`,
        `${baseName} (updated)`,
        `${baseName} (new design)`
      ];
      const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
      renameInput.placeholder = `e.g., ${randomSuggestion}`;

      // Event handlers
      const cleanup = () => {
        modal.classList.add("hidden");
        skipBtn.removeEventListener("click", onSkip);
        replaceBtn.removeEventListener("click", handleReplaceClick);
        renameInput.removeEventListener("input", onInputChange);
        // Reset button text, visibility, and hint
        skipBtn.textContent = "Skip Upload";
        replaceBtn.textContent = "Update Existing";
        skipBtn.style.display = "block";
        replaceBtn.style.display = "block";
        hintText.classList.add("hidden");
        hintText.classList.remove("warning");
      };

      const onSkip = () => {
        // If in rename mode (input visible), treat as cancel and go back
        if (!renameInput.classList.contains("hidden")) {
          renameInput.classList.add("hidden");
          hintText.classList.add("hidden");
          skipBtn.style.display = "block";
          replaceBtn.style.display = "block";
          replaceBtn.textContent = "Update Existing";
          skipBtn.textContent = "Skip Upload";
          isReplaceRenameMode = false;
        } else {
          // Normal skip behavior
          cleanup();
          resolve({ action: "skip" });
        }
      };

      // Validate input and show warnings for version suffixes
      const onInputChange = () => {
        const value = renameInput.value.trim();

        // Check if name ends with version pattern (v2, v3, etc.)
        if (/\s+v\d+$/i.test(value) || /-v\d+$/i.test(value)) {
          hintText.textContent = "⚠️ Avoid version numbers! Use descriptive names like \"Icon (outline)\" or \"Icon (alternative)\"";
          hintText.classList.remove("hidden");
          hintText.classList.add("warning");
        } else {
          hintText.textContent = "💡 Tip: Use a descriptive name instead of version numbers (e.g., \"Icon (outline)\" not \"Icon v2\")";
          hintText.classList.remove("warning");
          if (!renameInput.classList.contains("hidden")) {
            hintText.classList.remove("hidden");
          }
        }
      };

      const onAddNew = async () => {
        // If rename input is hidden, show it and wait for user to enter name
        if (renameInput.classList.contains("hidden")) {
          // Enter rename mode: hide other action buttons
          renameInput.classList.remove("hidden");
          hintText.classList.remove("hidden");
          renameInput.focus();
          renameInput.value = uploaded.name;
          renameInput.addEventListener("input", onInputChange);

          // Hide other buttons to avoid confusion
          skipBtn.style.display = "none";
          replaceBtn.style.display = "none";

          // Change button to show cancel option
          addNewBtn.textContent = "Save";
          skipBtn.textContent = "Cancel";
          skipBtn.style.display = "block";
        } else {
          // User confirmed new name
          const newNameValue = renameInput.value.trim();
          if (!newNameValue) {
            await customAlert("Please enter a name for the new icon.", "Invalid Name");
            return;
          }

          // Warn if still using version suffix, but allow it
          if (/\s+v\d+$/i.test(newNameValue) || /-v\d+$/i.test(newNameValue)) {
            console.warn("[Upload] User chose a version-style name:", newNameValue);
          }

          console.log("[Upload] Add New confirmed with name:", newNameValue);
          cleanup();
          resolve({ action: "addNew", newName: newNameValue });
        }
      };

      const onReplace = () => {
        // If uploading a versioned file (e.g., icon-v2.svg), offer to rename when updating
        if (isVersioned && !isExactMatch) {
          // Show rename input for versioned updates
          renameInput.classList.remove("hidden");
          hintText.classList.remove("hidden");
          hintText.textContent = "💡 Optional: Update the name when replacing (or leave as is)";
          hintText.classList.remove("warning");
          renameInput.focus();
          renameInput.value = existing.name; // Pre-fill with current name
          renameInput.addEventListener("input", onInputChange);

          // Hide Skip button during rename
          skipBtn.style.display = "none";

          // Change Replace button to confirm
          replaceBtn.textContent = "Confirm Update";
          skipBtn.textContent = "Cancel";
          skipBtn.style.display = "block";
        } else {
          // Direct replace for exact matches
          cleanup();
          resolve({ action: "replace" });
        }
      };

      // Track which mode we're in for Replace button
      let isReplaceRenameMode = false;

      const handleReplaceClick = () => {
        if (isReplaceRenameMode) {
          // Confirm the rename for replace action
          const newNameValue = renameInput.value.trim();
          if (!newNameValue) {
            customAlert("Please enter a name for the icon.", "Invalid Name");
            return;
          }

          console.log("[Upload] Replace with new name:", newNameValue);
          cleanup();
          resolve({ action: "replace", newName: newNameValue });
        } else {
          onReplace();
          isReplaceRenameMode = true; // Track that we're now in rename mode (if applicable)
        }
      };

      skipBtn.addEventListener("click", onSkip);
      replaceBtn.addEventListener("click", handleReplaceClick);

      // Show modal
      modal.classList.remove("hidden");
    });
  }

  // ---- Render ----
  function renderClientTabs(clients) {
    clientTabs.innerHTML = "";

    // Only show client tabs if there are multiple clients or any assigned icons
    if (clients.length <= 1) {
      clientTabs.style.display = "none";
      return;
    }

    clientTabs.style.display = "flex";
    clients.forEach(client => {
      // Calculate count for this client
      const count = getCachedClientCount(client, activeQuery);

      const btn = document.createElement("button");
      btn.className = "tab-btn client-tab-btn" + (client === activeClient ? " active" : "");
      btn.textContent = `${client} (${count})`;
      btn.addEventListener("click", () => {
        activeClient = client;
        // Switching groups clears any in-progress selection to avoid cross-group deletes
        if (selectionMode) { selectedIds.clear(); updateSelectionUI(); }
        // Re-render tabs to update counts and active state
        renderClientTabs(clients);
        renderGrid();
      });
      clientTabs.appendChild(btn);
    });
  }

  /**
   * Calculate icon count for a specific client
   */
  function calculateClientIconCount(clientName, query = "") {
    const filtered = filterIcons(allIcons, {
      client: clientName,
      query: query
    });
    return filtered.length;
  }

  /**
   * Count cache for performance optimization
   */
  let clientCountCache = new Map();
  let lastCountCacheQuery = "";

  function getCachedClientCount(clientName, query) {
    const cacheKey = `${clientName}:${query}`;

    // Invalidate cache if query changed
    if (query !== lastCountCacheQuery) {
      clientCountCache.clear();
      lastCountCacheQuery = query;
    }

    if (!clientCountCache.has(cacheKey)) {
      const count = calculateClientIconCount(clientName, query);
      clientCountCache.set(cacheKey, count);
    }

    return clientCountCache.get(cacheKey);
  }

  function invalidateCountCache() {
    clientCountCache.clear();
    lastCountCacheQuery = "";
  }

  function renderGrid() {
    let visible;
    if (aiSearchIds) {
      // AI search active: show Gemini's matches in relevance order,
      // still respecting the active client tab
      const rank = new Map(aiSearchIds.map((id, i) => [id, i]));
      visible = filterIcons(allIcons, { client: activeClient, query: "" })
        .filter(icon => rank.has(icon.id))
        .sort((a, b) => rank.get(a.id) - rank.get(b.id));
    } else {
      visible = filterIcons(allIcons, { client: activeClient, query: activeQuery });
    }
    if (resultCount) resultCount.textContent = `${visible.length} icon${visible.length !== 1 ? "s" : ""}`;
    lastVisibleIcons = visible;

    if (visible.length === 0) {
      iconGrid.innerHTML = "";
      emptyState.classList.remove("hidden");
      emptyQuery.textContent = activeQuery;
      return;
    }
    emptyState.classList.add("hidden");

    iconGrid.innerHTML = "";
    visible.forEach(icon => {
      const card = document.createElement("div");
      card.className = "icon-card";
      card.title = icon.name;

      // Prepare SVG for thumbnail: normalize stroke/fill colours so it renders
      // in the theme colour (handles <style> blocks, not just attributes).
      let thumbnailSvg = normalizeSvgDisplay(icon.svg);

      // Admins can edit their own tenant's icons and delete their own OR shared
      // (public/seeded) icons. Everyone else sees icon + name only.
      const isOwnIcon = currentUserRole === 'admin' && currentUserProfile &&
        (!icon.tenant_name || icon.tenant_name === currentUserProfile.tenant.name);
      const canEdit = isOwnIcon;
      const canDelete = currentUserRole === 'admin' && (isOwnIcon || icon.is_public);
      const selecting = selectionMode && canDelete;
      const showActions = (canEdit || canDelete) && !selecting;

      card.innerHTML = `
        <div class="card-icon">${thumbnailSvg}</div>
        <div class="card-meta${showActions ? "" : " no-actions"}">
          <span class="icon-name">${icon.name}</span>
          ${showActions ? `<div class="card-actions"></div>` : ""}
        </div>`;

      if (selecting) {
        // Selection mode: clicking the card toggles selection (no insert)
        card.classList.add("selectable");
        if (selectedIds.has(icon.uuid)) card.classList.add("selected");
        const check = document.createElement("div");
        check.className = "select-check";
        check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        card.appendChild(check);
        card.addEventListener("click", () => toggleSelect(icon, card));
      } else {
        if (showActions) {
          const actions = card.querySelector(".card-actions");

          if (canEdit) {
            const editBtn = document.createElement("button");
            editBtn.className = "icon-edit-btn";
            editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
            editBtn.title = "Edit icon";
            editBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              editIcon(icon);
            });
            actions.appendChild(editBtn);
          }

          const deleteBtn = document.createElement("button");
          deleteBtn.className = "icon-delete-btn";
          deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
          deleteBtn.title = "Delete icon";
          deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent card click (insert)
            deleteIcon(icon);
          });
          actions.appendChild(deleteBtn);
        }

        // Clicking the card inserts the icon (edit/delete buttons stop propagation)
        card.addEventListener("click", () => insertIcon(icon, card));
      }

      iconGrid.appendChild(card);
    });
  }

  // ---- Delete icon (admin only) ----
  async function deleteIcon(icon) {
    if (currentUserRole !== 'admin') {
      showToast('Only admins can delete icons');
      return;
    }

    const sharedWarning = icon.is_public ? " This is a shared icon — it will be removed for everyone." : "";
    const confirmed = await customConfirm(
      `Delete "${icon.name}"?${sharedWarning}`,
      'Delete Icon'
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = await getAccessToken();
      const res = await fetch(`${ICON_API_BASE}/icons/${icon.uuid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete icon');
      }

      // Remove from local array
      allIcons = allIcons.filter(i => i.uuid !== icon.uuid);

      // Re-render UI
      invalidateCountCache();
      const clients = getClients(allIcons, allClients.map(c => c.name));
      renderClientTabs(clients);
      renderGrid();

      showToast(`"${icon.name}" deleted`);
    } catch (error) {
      console.error('[Delete] Error:', error);
      showToast(`Error: ${error.message}`);
    }
  }

  // True if the SVG paints with an actual fill colour (i.e. outlined strokes /
  // filled artwork) rather than being purely stroke-based. Checks attributes,
  // inline styles, and <style> blocks; fill:none / fill="none" don't count.
  function hasActiveFill(svg) {
    const matches = [
      ...((svg || "").match(/fill\s*=\s*["'][^"']*["']/gi) || []),
      ...((svg || "").match(/fill\s*:\s*[^;"'}\s]+/gi) || [])
    ];
    return matches.some(m => !/none/i.test(m));
  }

  // Clean a pasted SVG (e.g. from Illustrator) for the library: strip XML
  // declaration/doctype, ensure xmlns + viewBox, and keep it stroke-based
  // (active fills → none). Returns null if the text isn't a valid SVG.
  function prepPastedSvg(text) {
    let svg = (text || "").trim();
    if (!svg) return null;
    svg = svg.replace(/<\?xml[^>]*\?>/gi, "").replace(/<!DOCTYPE[^>]*>/gi, "").trim();
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (doc.querySelector("parsererror") || !doc.querySelector("svg")) return null;
    if (!/xmlns\s*=/.test(svg)) svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    if (!/viewBox\s*=/i.test(svg)) {
      const w = (svg.match(/width=["']([\d.]+)/i) || [])[1] || 24;
      const h = (svg.match(/height=["']([\d.]+)/i) || [])[1] || 24;
      svg = svg.replace(/<svg/i, `<svg viewBox="0 0 ${w} ${h}"`);
    }
    svg = svg
      // Keep stroke-based: strip active fills to none
      .replace(/fill\s*=\s*["'][^"']*["']/gi, m => /none/i.test(m) ? m : 'fill="none"')
      .replace(/fill\s*:\s*[^;"'}\s]+/gi, m => /none/i.test(m) ? m : 'fill:none')
      // Normalize stroke colour to our default (currentColor) — attributes AND
      // <style> blocks. Leaves stroke-width/linecap/etc. and stroke="none" alone.
      .replace(/stroke\s*=\s*["'][^"']*["']/gi, m => /none/i.test(m) ? m : 'stroke="currentColor"')
      .replace(/stroke\s*:\s*[^;"'}\s]+/gi, m => /none/i.test(m) ? m : 'stroke:currentColor');
    return svg;
  }

  // Normalize an SVG for on-screen display: stroke colours → currentColor and
  // fills → none, covering attributes, inline styles, AND <style> blocks (the
  // format Illustrator exports). This makes every icon render in the theme
  // colour regardless of how its stored SVG hardcodes colours. Stroke-width,
  // line caps/joins, and stroke/fill "none" are left intact.
  function normalizeSvgDisplay(svg) {
    return (svg || "")
      .replace(/stroke\s*=\s*["'][^"']*["']/gi, m => /none/i.test(m) ? m : 'stroke="currentColor"')
      .replace(/stroke\s*:\s*[^;"'}\s]+/gi, m => /none/i.test(m) ? m : 'stroke:currentColor')
      .replace(/fill\s*=\s*["'][^"']*["']/gi, m => /none/i.test(m) ? m : 'fill="none"')
      .replace(/fill\s*:\s*[^;"'}\s]+/gi, m => /none/i.test(m) ? m : 'fill:none');
  }

  // ---- Edit icon (admin only) ----
  async function editIcon(icon) {
    if (currentUserRole !== 'admin') {
      showToast('Only admins can edit icons');
      return;
    }

    // Load clients before opening modal
    await fetchClients();

    // Get modal elements
    const modal = document.getElementById("edit-icon-modal");
    const svgPreview = document.getElementById("edit-icon-svg");
    const nameInput = document.getElementById("edit-icon-name");
    const clientsContainer = document.getElementById("edit-icon-clients");
    const cancelBtn = document.getElementById("edit-icon-cancel");
    const saveBtn = document.getElementById("edit-icon-save");
    const svgInput = document.getElementById("edit-icon-svg-input");
    const svgStatus = document.getElementById("edit-svg-status");

    // Render an SVG into the preview with library styling (stroke follows theme)
    const showPreview = (svg) => { svgPreview.innerHTML = normalizeSvgDisplay(svg); };

    // Holds a pasted replacement SVG until Save (null = keep existing artwork)
    let pendingSvg = null;

    showPreview(icon.svg);
    nameInput.value = icon.name;
    svgInput.value = "";
    svgStatus.className = "svg-paste-status hidden";

    // Render group toggle-chips, pre-selecting the icon's current groups
    const currentGroupIds = (icon.clients || []).map(c => c.id);
    renderGroupChips(clientsContainer, currentGroupIds, { includeUnassigned: true });

    // Paste-to-replace: validate + live-preview the pasted artwork
    const onSvgInput = () => {
      const raw = svgInput.value.trim();
      if (!raw) {
        pendingSvg = null;
        svgStatus.className = "svg-paste-status hidden";
        showPreview(icon.svg);
        return;
      }
      if (hasActiveFill(raw)) {
        pendingSvg = null;
        svgStatus.className = "svg-paste-status svg-paste-error";
        svgStatus.textContent = "This icon has outlined strokes or fills — icons must be stroke-based.";
        showPreview(icon.svg);
        return;
      }
      const cleaned = prepPastedSvg(raw);
      if (!cleaned) {
        pendingSvg = null;
        svgStatus.className = "svg-paste-status svg-paste-error";
        svgStatus.textContent = "That doesn't look like a valid icon.";
        showPreview(icon.svg);
        return;
      }
      pendingSvg = cleaned;
      showPreview(cleaned);
      svgStatus.className = "svg-paste-status svg-paste-ok";
      svgStatus.textContent = "New artwork loaded — replaces on Save.";
    };
    svgInput.addEventListener("input", onSvgInput);

    // Show modal
    modal.classList.remove("hidden");

    // Close the modal + clean up (Cancel button, backdrop click, Escape key)
    const onBackdrop = (e) => { if (e.target === modal) closeModal(); };
    const onKey = (e) => { if (e.key === "Escape") closeModal(); };
    const closeModal = () => {
      modal.classList.add("hidden");
      cancelBtn.removeEventListener("click", closeModal);
      saveBtn.removeEventListener("click", onSave);
      modal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      svgInput.removeEventListener("input", onSvgInput);
    };

    // Handle save
    const onSave = async () => {
      const newName = nameInput.value.trim();
      const newClientIds = getSelectedGroupIds(clientsContainer);

      if (!newName) {
        showToast('Icon name cannot be empty');
        return;
      }

      try {
        const token = await getAccessToken();
        const payload = {
          id: icon.id,
          name: newName,
          svg: pendingSvg || icon.svg, // pasted replacement, else keep existing
          client_ids: newClientIds
        };

        const res = await fetch(`${ICON_API_BASE}/icons/${icon.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to update icon');
        }

        // Update local icon object to reflect the changes
        icon.name = newName;
        if (pendingSvg) icon.svg = pendingSvg;
        icon.clients = allClients.filter(c => newClientIds.includes(String(c.id)))
          .map(c => ({ id: c.id, name: c.name }));

        // Re-render UI
        invalidateCountCache();
        const clients = getClients(allIcons, allClients.map(c => c.name));
        renderClientTabs(clients);
        renderGrid();

        showToast(`"${newName}" updated`);
        closeModal();
      } catch (error) {
        console.error('[Edit] Error:', error);
        showToast(`Error: ${error.message}`);
      }
    };

    cancelBtn.addEventListener("click", closeModal);
    saveBtn.addEventListener("click", onSave);
    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
  }

  // ---- Bulk select + delete (admin) ----
  function enterSelectionMode() {
    if (currentUserRole !== 'admin') return;
    selectionMode = true;
    selectedIds.clear();
    selectionBar.classList.remove("hidden");
    selectModeBtn.classList.add("active");
    renderGrid();
    updateSelectionUI();
  }

  function exitSelectionMode() {
    selectionMode = false;
    selectedIds.clear();
    selectionBar.classList.add("hidden");
    selectModeBtn.classList.remove("active");
    renderGrid();
  }

  function toggleSelect(icon, card) {
    if (selectedIds.has(icon.uuid)) {
      selectedIds.delete(icon.uuid);
      card.classList.remove("selected");
    } else {
      selectedIds.add(icon.uuid);
      card.classList.add("selected");
    }
    updateSelectionUI();
  }

  function updateSelectionUI() {
    const n = selectedIds.size;
    const total = lastVisibleIcons.length;
    selectionCount.textContent = `${n} selected`;
    selectionDeleteBtn.disabled = n === 0;
    selectionDeleteBtn.textContent = n > 0 ? `Delete (${n})` : "Delete";
    selectAllBtn.textContent = (total > 0 && n >= total) ? "Clear" : "Select all";
  }

  function toggleSelectAll() {
    const allSelected = lastVisibleIcons.length > 0 &&
      lastVisibleIcons.every(i => selectedIds.has(i.uuid));
    if (allSelected) {
      selectedIds.clear();
    } else {
      lastVisibleIcons.forEach(i => selectedIds.add(i.uuid));
    }
    renderGrid();
    updateSelectionUI();
  }

  async function deleteSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const groupLabel = (activeClient && activeClient !== "All") ? ` from "${activeClient}"` : "";
    const anyShared = allIcons.some(i => selectedIds.has(i.uuid) && i.is_public);
    const sharedWarning = anyShared ? " Some are shared icons and will be removed for everyone." : "";
    const confirmed = await customConfirm(
      `Delete ${ids.length} icon${ids.length !== 1 ? "s" : ""}${groupLabel}? This permanently removes ${ids.length !== 1 ? "them" : "it"} from the library and can't be undone.${sharedWarning}`,
      "Delete icons"
    );
    if (!confirmed) return;

    try {
      const token = await getAccessToken();
      const res = await fetch(`${ICON_API_BASE}/icons/bulk-delete`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete icons");
      }
      const data = await res.json();

      const removed = new Set(ids);
      allIcons = allIcons.filter(i => !removed.has(i.uuid));

      exitSelectionMode();
      invalidateCountCache();
      renderClientTabs(getClients(allIcons, allClients.map(c => c.name)));
      renderGrid();
      showToast(`${data.deleted} icon${data.deleted !== 1 ? "s" : ""} deleted`);
    } catch (error) {
      console.error("[BulkDelete] Error:", error);
      showToast(`Error: ${error.message}`);
    }
  }

  if (selectModeBtn) {
    selectModeBtn.addEventListener("click", () => {
      selectionMode ? exitSelectionMode() : enterSelectionMode();
    });
    selectAllBtn.addEventListener("click", toggleSelectAll);
    selectionCancelBtn.addEventListener("click", exitSelectionMode);
    selectionDeleteBtn.addEventListener("click", deleteSelected);
  }

  // ---- Insert icon into document ----
  async function insertIcon(icon, cardEl) {
    // All signed-in roles (admin, user, viewer) may insert icons; only library
    // management (upload/edit/delete) is admin-only.
    console.log("[Insert] Starting insertion for:", icon.name);
    updateDebugStatus(`Inserting ${icon.name}...`);
    cardEl.classList.add("inserting");

    try {
      if (currentHost === Office.HostType.Word) {
        console.log("[Insert] Using Word insertion");
        await insertIntoWord(icon);
      } else if (currentHost === Office.HostType.PowerPoint) {
        console.log("[Insert] Using PowerPoint insertion");
        await insertIntoPowerPoint(icon);
      } else {
        throw new Error(`Unsupported host: ${currentHost}`);
      }
      console.log("[Insert] Success!");
      updateDebugStatus(`✓ ${icon.name} inserted`);
      showToast(`${icon.name} inserted`);
    } catch (err) {
      console.error("[Insert] Failed:", err);
      updateDebugStatus(`✗ Error: ${err.message}`);
      showToast(`Error: ${err.message}`);
    } finally {
      setTimeout(() => cardEl.classList.remove("inserting"), 600);
    }
  }

  // ---- Word insertion: inline SVG as image via base64 ----
  async function insertIntoWord(icon) {
    const svgBlob = await svgToBase64(icon.svg, selectedSize);

    return Word.run(async context => {
      const range = context.document.getSelection();
      range.load("isEmpty");
      await context.sync();

      // Insert as inline picture using base64 PNG (converted from SVG)
      const pngBase64 = await svgBase64ToPngBase64(svgBlob, selectedSize);
      range.insertInlinePictureFromBase64(pngBase64, Word.InsertLocation.replace);
      await context.sync();
    });
  }

  // ---- Fetch PowerPoint theme colors ----
  let isFirstThemeFetch = true; // Flag to reduce console spam
  async function fetchThemeColors() {
    // Fallback colors (Office default theme)
    const fallbackColors = {
      Background1: "#FFFFFF",
      Background2: "#F5F5F5",
      Text1: "#000000",
      Text2: "#444444",
      Accent1: "#4472C4",
      Accent2: "#ED7D31",
      Accent3: "#A5A5A5",
      Accent4: "#FFC000",
      Accent5: "#5B9BD5",
      Accent6: "#70AD47"
    };

    if (currentHost !== Office.HostType.PowerPoint) {
      if (isFirstThemeFetch) {
        console.log("[Theme] Not PowerPoint, using fallback colors");
      }
      return fallbackColors;
    }

    try {
      // Only log verbose details on first fetch
      if (isFirstThemeFetch) {
        console.log("[Theme] Attempting to fetch PowerPoint theme colors...");
        console.log("[Theme] PowerPoint.js available:", typeof PowerPoint !== 'undefined');
        console.log("[Theme] Office.context.requirements available:", typeof Office.context.requirements !== 'undefined');
      }

      // Check if PowerPointApi 1.10 is supported
      if (Office.context.requirements && Office.context.requirements.isSetSupported) {
        const isPptApi110Supported = Office.context.requirements.isSetSupported('PowerPointApi', '1.10');

        if (isFirstThemeFetch) {
          console.log("[Theme] PowerPointApi 1.10 supported:", isPptApi110Supported);
        }

        if (!isPptApi110Supported) {
          if (isFirstThemeFetch) {
            console.warn("[Theme] PowerPointApi 1.10 not supported - theme color API unavailable");
            console.warn("[Theme] Your PowerPoint version may be too old. Update to latest version.");
          }
          return fallbackColors;
        }
      }

      return await PowerPoint.run(async (context) => {
        const masters = context.presentation.slideMasters;
        masters.load("items");
        await context.sync();

        if (isFirstThemeFetch) {
          console.log("[Theme] Slide masters count:", masters.items.length);
        }

        if (masters.items.length === 0) {
          if (isFirstThemeFetch) {
            console.warn("[Theme] No slide masters found, using fallback");
          }
          return fallbackColors;
        }

        const scheme = masters.items[0].themeColorScheme;
        await context.sync(); // Sync after accessing themeColorScheme

        if (isFirstThemeFetch) {
          console.log("[Theme] Theme color scheme object:", scheme ? "available" : "null");
        }

        const colors = {};

        // Map color names to PowerPoint.ThemeColor enum values
        const colorMap = {
          Background1: PowerPoint.ThemeColor.background1,
          Background2: PowerPoint.ThemeColor.background2,
          Text1: PowerPoint.ThemeColor.text1,
          Text2: PowerPoint.ThemeColor.text2,
          Accent1: PowerPoint.ThemeColor.accent1,
          Accent2: PowerPoint.ThemeColor.accent2,
          Accent3: PowerPoint.ThemeColor.accent3,
          Accent4: PowerPoint.ThemeColor.accent4,
          Accent5: PowerPoint.ThemeColor.accent5,
          Accent6: PowerPoint.ThemeColor.accent6
        };

        // Use getThemeColor() method with enum values
        for (const [name, enumValue] of Object.entries(colorMap)) {
          try {
            const color = scheme.getThemeColor(enumValue);
            await context.sync();
            colors[name] = color.value;
            if (isFirstThemeFetch) {
              console.log(`[Theme] ✓ ${name}: ${color.value}`);
            }
          } catch (err) {
            if (isFirstThemeFetch) {
              console.error(`[Theme] ✗ Failed to get ${name}:`, err.message, err.code);
            }
            colors[name] = fallbackColors[name];
          }
        }

        if (isFirstThemeFetch) {
          console.log("[Theme] Successfully fetched theme colors:", colors);
          isFirstThemeFetch = false; // Disable verbose logging after first fetch
        }
        return colors;
      });
    } catch (error) {
      if (isFirstThemeFetch) {
        console.error("[Theme] API failed:", error);
        console.error("[Theme] Error name:", error.name);
        console.error("[Theme] Error code:", error.code);
      }
      console.error("[Theme] Error message:", error.message);
      if (error.debugInfo) {
        console.error("[Theme] Debug info:", JSON.stringify(error.debugInfo, null, 2));
      }
      console.log("[Theme] Using fallback colors");
      return fallbackColors;
    }
  }

  // ---- Update color button swatches ----
  function updateColorSwatches() {
    if (!themeColors) return;

    colorBtns.forEach(btn => {
      const colorName = btn.dataset.color;
      const hexColor = themeColors[colorName];

      if (hexColor) {
        // Update the button's swatch background
        const swatch = btn.querySelector('.color-swatch');
        if (swatch) {
          swatch.style.backgroundColor = hexColor;
        }

        // Update tooltip to show hex value
        btn.title = `${colorName}: ${hexColor}`;
      }
    });

    // Keep the mixed-stroke swatches in sync (some load paths only call this one)
    updateMixedStrokeSwatches();
  }

  // ---- Update mixed stroke color swatches ----
  function updateMixedStrokeSwatches() {
    if (!themeColors) return;

    mixedColorBtns.forEach(btn => {
      const colorName = btn.dataset.color;
      const hexColor = themeColors[colorName];

      if (hexColor) {
        const swatch = btn.querySelector('.color-swatch');
        if (swatch) {
          swatch.style.backgroundColor = hexColor;
        }

        // Update tooltip to show hex value
        btn.title = `${colorName}: ${hexColor}`;
      }
    });
  }

  // ---- Refresh theme colors (detects theme changes) ----
  async function refreshThemeColors() {
    if (currentHost !== Office.HostType.PowerPoint) return;

    try {
      const newColors = await fetchThemeColors();

      // Check if theme colors have changed
      const hasChanged = !themeColors || Object.keys(newColors).some(key =>
        newColors[key] !== themeColors[key]
      );

      if (hasChanged) {
        console.log("[Theme] Theme colors changed, updating UI");
        themeColors = newColors;
        updateColorSwatches();
        updateMixedStrokeSwatches();
      }
    } catch (error) {
      console.warn("[Theme] Failed to refresh theme colors:", error);
    }
  }

  // ---- Start periodic theme color refresh ----
  function startThemeRefresh() {
    if (currentHost !== Office.HostType.PowerPoint) return;

    // Clear any existing interval
    if (themeRefreshInterval) {
      clearInterval(themeRefreshInterval);
    }

    // Add Office theme change event listener (for Office app theme changes)
    try {
      if (Office.context.officeTheme) {
        Office.context.document.addHandlerAsync(
          Office.EventType.DocumentThemeChanged,
          () => {
            console.log("[Theme] Office theme changed event detected");
            refreshThemeColors();
          }
        );
      }
    } catch (err) {
      console.log("[Theme] Theme change event not available:", err);
    }

    // Check for theme changes every 5 seconds (for PowerPoint document theme changes)
    themeRefreshInterval = setInterval(() => {
      refreshThemeColors();
    }, 5000);

    console.log("[Theme] Started periodic theme refresh (every 5s)");
  }

  // ---- Stop theme refresh ----
  function stopThemeRefresh() {
    if (themeRefreshInterval) {
      clearInterval(themeRefreshInterval);
      themeRefreshInterval = null;
      console.log("[Theme] Stopped theme refresh");
    }
  }

  // ---- Deterministic random generator (seeded) ----
  function seededRandom(seed) {
    // Simple hash function to generate consistent pseudo-random values
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function getIconColorSeed(iconId) {
    // Generate seed from icon ID string
    let hash = 0;
    for (let i = 0; i < iconId.length; i++) {
      const char = iconId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // ---- PowerPoint insertion: Insert SVG with theme color support ----
  async function insertIntoPowerPoint(icon) {
    console.log("[PPT] Preparing SVG with theme colors...");
    console.log("[PPT] Using theme color:", selectedColor);
    console.log("[PPT] Original SVG:", icon.svg.substring(0, 500));

    // Use fetched theme colors or fallback
    const fallbackColor = themeColors ? themeColors[selectedColor] : "#4472C4";
    const themeClass = `MsftOfcThm_${selectedColor}`;

    // Prepare SVG with proper structure and theme color classes
    let svg = icon.svg;

    // Extract the SVG content (between tags)
    const svgContentMatch = svg.match(/<svg[^>]*>(.*?)<\/svg>/s);
    const svgContent = svgContentMatch ? svgContentMatch[1] : svg;

    // Library icons are stroke-based; use the stroke path when any stroke
    // attribute is present (fill path kept only as a fallback for odd assets).
    const hasStrokeAttr = svg.includes('stroke="') || svg.includes("stroke='");
    const hasStrokeWidth = svg.includes('stroke-width');
    const hasStrokeLinecap = svg.includes('stroke-linecap');
    const hasStrokeLinejoin = svg.includes('stroke-linejoin');

    const usesStroke = hasStrokeAttr || hasStrokeWidth || hasStrokeLinecap || hasStrokeLinejoin;

    if (usesStroke) {
      // For stroke icons: Use internal CSS with theme class (BrightCarbon method)
      let modifiedContent = svgContent;
      const strokeClass = `${themeClass}_Stroke_v2`;

      // Extract the icon's OWN stroke weight + caps. Curated icons carry it in
      // a <style> block (stroke-width:2px); ingested icons carry it as a
      // per-element stroke-width attribute (preserved thin, e.g. 0.4). Respect
      // whichever is present so dense ingested icons stay crisp instead of
      // being forced to a heavy 2pt.
      const styleMatch = modifiedContent.match(/<style[\s\S]*?<\/style>/);
      let strokeWidth = null;
      let strokeLinecap = 'round';
      let strokeLinejoin = 'round';

      if (styleMatch) {
        const styleContent = styleMatch[0];
        const swMatch = styleContent.match(/stroke-width:\s*([\d.]+)px?/);
        if (swMatch) strokeWidth = swMatch[1];
        const lcMatch = styleContent.match(/stroke-linecap:\s*(\w+)/);
        if (lcMatch) strokeLinecap = lcMatch[1];
        const ljMatch = styleContent.match(/stroke-linejoin:\s*(\w+)/);
        if (ljMatch) strokeLinejoin = ljMatch[1];
      }
      if (strokeWidth === null) {
        // ingested icons: read the (preserved) per-element stroke-width
        const attrMatch = svg.match(/stroke-width=["']([\d.]+)["']/);
        if (attrMatch) strokeWidth = attrMatch[1];
      }
      if (strokeWidth === null) strokeWidth = '2';

      console.log(`[PPT] Extracted properties: linecap=${strokeLinecap}, linejoin=${strokeLinejoin}`);

      // Remove original styles and defs, we'll add cleaned version
      modifiedContent = modifiedContent.replace(/<style[\s\S]*?<\/style>/g, '');
      modifiedContent = modifiedContent.replace(/<defs>[\s\S]*?<\/defs>/g, '');

      // Remove existing class attributes
      modifiedContent = modifiedContent.replace(/class="[^"]*"/g, '');

      // Remove inline stroke and fill color attributes
      modifiedContent = modifiedContent.replace(/stroke="[^"]*"/g, '');
      modifiedContent = modifiedContent.replace(/fill="[^"]*"/g, 'fill="none"');

      // Add theme class to all shape elements
      if (mixedStroke) {
        // Mixed stroke mode: Deterministic color assignment based on icon ID
        // Generate consistent seed from icon ID
        const seed = getIconColorSeed(icon.id);
        let elementIndex = 0;

        const applyMixedColor = () => {
          // Use seeded random for consistent distribution
          const random = seededRandom(seed + elementIndex);
          elementIndex++;
          const selectedColor = random < 0.5 ? mixedColor1 : mixedColor2;
          return `MsftOfcThm_${selectedColor}_Stroke_v2`;
        };

        // Replace each element individually with deterministic color
        modifiedContent = modifiedContent.replace(/<path /g, () => `<path class="${applyMixedColor()}" `);
        modifiedContent = modifiedContent.replace(/<line /g, () => `<line class="${applyMixedColor()}" `);
        modifiedContent = modifiedContent.replace(/<polyline /g, () => `<polyline class="${applyMixedColor()}" `);
        modifiedContent = modifiedContent.replace(/<circle /g, () => `<circle class="${applyMixedColor()}" `);
        modifiedContent = modifiedContent.replace(/<rect /g, () => `<rect class="${applyMixedColor()}" `);
        modifiedContent = modifiedContent.replace(/<polygon /g, () => `<polygon class="${applyMixedColor()}" `);
        modifiedContent = modifiedContent.replace(/<ellipse /g, () => `<ellipse class="${applyMixedColor()}" `);
      } else {
        // Single color mode: Apply selected theme color to all elements
        modifiedContent = modifiedContent.replace(/<path /g, `<path class="${strokeClass}" `);
        modifiedContent = modifiedContent.replace(/<line /g, `<line class="${strokeClass}" `);
        modifiedContent = modifiedContent.replace(/<polyline /g, `<polyline class="${strokeClass}" `);
        modifiedContent = modifiedContent.replace(/<circle /g, `<circle class="${strokeClass}" `);
        modifiedContent = modifiedContent.replace(/<rect /g, `<rect class="${strokeClass}" `);
        modifiedContent = modifiedContent.replace(/<polygon /g, `<polygon class="${strokeClass}" `);
        modifiedContent = modifiedContent.replace(/<ellipse /g, `<ellipse class="${strokeClass}" `);
      }

      // Extract original viewBox from the source SVG
      const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);
      let viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";

      // For circle background, expand viewBox to prevent cropping and calculate circle
      let backgroundCircle = '';
      if (circleBackground) {
        const vbParts = viewBox.split(/[\s,]+/).map(Number);
        const cx = vbParts[0] + vbParts[2] / 2;
        const cy = vbParts[1] + vbParts[3] / 2;
        const radius = Math.max(vbParts[2], vbParts[3]) * 0.71; // 71% of max dimension (17/24)

        // Expand viewBox to accommodate circle with padding
        const padding = 6;
        viewBox = `${-padding} ${-padding} ${vbParts[2] + padding * 2} ${vbParts[3] + padding * 2}`;

        if (mixedStroke) {
          // Mixed stroke: tint the circle with a light version of the first
          // stroke colour (over white) instead of defaulting to flat grey.
          backgroundCircle = `<circle cx="${cx}" cy="${cy}" r="${radius}" class="MsftOfcThm_Background1_Fill_v2" />
           <circle cx="${cx}" cy="${cy}" r="${radius}" class="MsftOfcThm_${mixedColor1}_Fill_v2" opacity="0.18" />`;
        } else {
          backgroundCircle = `<circle cx="${cx}" cy="${cy}" r="${radius}" class="MsftOfcThm_Background2_Fill_v2" />
           <circle cx="${cx}" cy="${cy}" r="${radius}" class="${themeClass}_Fill_v2" opacity="0.35" />`;
        }
      }

      // Consistent stroke weight: a fixed 2pt for EVERY icon, derived from the
      // FINAL viewBox width (the circle background expands it from 24→36, which
      // would otherwise thin the stroke). render px = strokeWidth × selectedSize/vbW.
      const vbW = (viewBox.split(/[\s,]+/).map(Number)[2]) || 24;
      const scaleFactor = selectedSize / vbW;
      const targetStrokePt = 2;
      const adjustedStrokeWidth = targetStrokePt / scaleFactor;
      console.log(`[PPT] size=${selectedSize}px vbW=${vbW} → stroke-width=${adjustedStrokeWidth.toFixed(3)} (constant ${targetStrokePt}pt)`);

      // Fallback colors for all theme options
      const fallbackColors = {
        "Accent1": "#4472C4",
        "Accent2": "#ED7D31",
        "Accent3": "#A5A5A5",
        "Accent4": "#FFC000",
        "Accent5": "#5B9BD5",
        "Accent6": "#70AD47",
        "Text1": "#000000",
        "Text2": "#444444",
        "Background1": "#FFFFFF",
        "Background2": "#F5F5F5"
      };

      // Build SVG with theme styles including extracted properties
      let styleBlock = '';
      if (mixedStroke) {
        // Define both selected color stroke classes
        const color1Value = themeColors ? themeColors[mixedColor1] : fallbackColors[mixedColor1];
        const color2Value = themeColors ? themeColors[mixedColor2] : fallbackColors[mixedColor2];

        styleBlock = `
          .MsftOfcThm_${mixedColor1}_Stroke_v2 {
            stroke: ${color1Value};
            fill: none !important;
            stroke-width: ${adjustedStrokeWidth};
            stroke-linecap: ${strokeLinecap};
            stroke-linejoin: ${strokeLinejoin};
          }
          .MsftOfcThm_${mixedColor2}_Stroke_v2 {
            stroke: ${color2Value};
            fill: none !important;
            stroke-width: ${adjustedStrokeWidth};
            stroke-linecap: ${strokeLinecap};
            stroke-linejoin: ${strokeLinejoin};
          }
          .MsftOfcThm_${mixedColor1}_Fill_v2 { fill: ${color1Value}; }
          .MsftOfcThm_${mixedColor2}_Fill_v2 { fill: ${color2Value}; }
          .MsftOfcThm_Background1_Fill_v2 { fill: ${themeColors ? themeColors.Background1 : "#FFFFFF"}; }
          .MsftOfcThm_Background2_Fill_v2 { fill: ${themeColors ? themeColors.Background2 : "#F5F5F5"}; }`;
      } else {
        // Single color mode
        styleBlock = `
          .${strokeClass} {
            stroke: ${fallbackColor};
            fill: none !important;
            stroke-width: ${adjustedStrokeWidth};
            stroke-linecap: ${strokeLinecap};
            stroke-linejoin: ${strokeLinejoin};
          }
          .${themeClass}_Fill_v2 { fill: ${fallbackColor}; }
          .MsftOfcThm_Background2_Fill_v2 { fill: #F5F5F5; }`;
      }

      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${selectedSize}" height="${selectedSize}" viewBox="${viewBox}">
        <style>${styleBlock}</style>
        ${backgroundCircle}
        ${modifiedContent}
      </svg>`;
    } else {
      // For fill icons
      const fillClass = `${themeClass}_Fill_v2`;
      let modifiedContent = svgContent;

      // Extract stroke properties from existing styles
      const styleMatch = modifiedContent.match(/<style[\s\S]*?<\/style>/);
      let strokeWidth = '2'; // default - 2pt stroke
      let strokeLinecap = 'round';
      let strokeLinejoin = 'round';

      if (styleMatch) {
        const styleContent = styleMatch[0];
        const swMatch = styleContent.match(/stroke-width:\s*([\d.]+)px/);
        if (swMatch) strokeWidth = swMatch[1];

        const lcMatch = styleContent.match(/stroke-linecap:\s*(\w+)/);
        if (lcMatch) strokeLinecap = lcMatch[1];

        const ljMatch = styleContent.match(/stroke-linejoin:\s*(\w+)/);
        if (ljMatch) strokeLinejoin = ljMatch[1];
      }

      console.log(`[PPT Fill] Extracted properties: linecap=${strokeLinecap}, linejoin=${strokeLinejoin}`);

      // Remove original styles and defs
      modifiedContent = modifiedContent.replace(/<style[\s\S]*?<\/style>/g, '');
      modifiedContent = modifiedContent.replace(/<defs>[\s\S]*?<\/defs>/g, '');

      // Remove existing class attributes
      modifiedContent = modifiedContent.replace(/class="[^"]*"/g, '');

      // Remove only color values
      modifiedContent = modifiedContent.replace(/fill="[^"]*"/g, '');
      modifiedContent = modifiedContent.replace(/stroke="[^"]*"/g, '');

      // Add theme class to all shape elements
      modifiedContent = modifiedContent.replace(/<path /g, `<path class="${fillClass}" `);
      modifiedContent = modifiedContent.replace(/<circle /g, `<circle class="${fillClass}" `);
      modifiedContent = modifiedContent.replace(/<rect /g, `<rect class="${fillClass}" `);
      modifiedContent = modifiedContent.replace(/<polygon /g, `<polygon class="${fillClass}" `);
      modifiedContent = modifiedContent.replace(/<ellipse /g, `<ellipse class="${fillClass}" `);

      // Extract original viewBox
      const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);
      let viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";

      // For circle background, expand viewBox and calculate circle
      let backgroundCircle = '';
      if (circleBackground) {
        const vbParts = viewBox.split(/[\s,]+/).map(Number);
        const cx = vbParts[0] + vbParts[2] / 2;
        const cy = vbParts[1] + vbParts[3] / 2;
        const radius = Math.max(vbParts[2], vbParts[3]) * 0.71; // 71% (17/24)

        // Expand viewBox to accommodate circle
        const padding = 6;
        viewBox = `${-padding} ${-padding} ${vbParts[2] + padding * 2} ${vbParts[3] + padding * 2}`;

        backgroundCircle = `<circle cx="${cx}" cy="${cy}" r="${radius}" class="MsftOfcThm_Background2_Fill_v2" />
           <circle cx="${cx}" cy="${cy}" r="${radius}" class="${fillClass}" opacity="0.35" />`;
      }

      // Consistent 2pt stroke, derived from the FINAL viewBox width (circle bg expands it)
      const vbW = (viewBox.split(/[\s,]+/).map(Number)[2]) || 24;
      const adjustedStrokeWidth = 2 / (selectedSize / vbW);

      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${selectedSize}" height="${selectedSize}" viewBox="${viewBox}">
        <style>
          .${fillClass} {
            fill: ${fallbackColor};
            stroke: ${fallbackColor};
            stroke-width: ${adjustedStrokeWidth};
            stroke-linecap: ${strokeLinecap};
            stroke-linejoin: ${strokeLinejoin};
          }
          .MsftOfcThm_Background2_Fill_v2 { fill: #F5F5F5; }
        </style>
        ${backgroundCircle}
        ${modifiedContent}
      </svg>`;
    }

    console.log("[PPT] Full SVG:", svg);
    console.log("[PPT] Inserting SVG...");

    return new Promise((resolve, reject) => {
      Office.context.document.setSelectedDataAsync(
        svg,
        {
          coercionType: Office.CoercionType.XmlSvg,
          imageWidth: selectedSize,
          imageHeight: selectedSize
        },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            console.log("[PPT] SVG inserted successfully");
            resolve();
          } else {
            console.error("[PPT] Insert failed:", result.error);
            reject(new Error(result.error.message));
          }
        }
      );
    });
  }

  // ---- SVG → Base64 PNG (via Canvas) ----
  function svgToBase64(svgString, size) {
    // Wrap raw SVG path content with proper SVG element if needed
    let wrapped = svgString.includes("<svg")
      ? svgString
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">${svgString}</svg>`;

    // Ensure xmlns is present
    if (!wrapped.includes('xmlns=')) {
      wrapped = wrapped.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Ensure width and height are set
    if (!wrapped.includes('width=')) {
      wrapped = wrapped.replace('<svg', `<svg width="${size}" height="${size}"`);
    }

    // Modern base64 encoding
    const blob = new Blob([wrapped], { type: 'image/svg+xml;charset=utf-8' });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function svgBase64ToPngBase64(svgBase64, size) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        // Draw on white background (transparent backgrounds often don't render well)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png").split(",")[1]);
      };
      img.onerror = (err) => {
        console.error("[PNG] Image load error:", err);
        reject(new Error("Failed to convert SVG to PNG"));
      };
      img.src = `data:image/svg+xml;base64,${svgBase64}`;
    });
  }

  // ---- Search ----
  // Typing filters locally (name/category/tags substring). Pressing Enter
  // runs AI search: Gemini maps the phrase to icons by meaning.
  let aiSearchIds = null;
  const aiChip = document.getElementById("ai-search-chip");
  const aiChipLabel = document.getElementById("ai-search-label");
  const aiChipClear = document.getElementById("ai-search-clear");

  function clearAiSearch({ rerender = true } = {}) {
    if (!aiSearchIds && aiChip.classList.contains("hidden")) return;
    aiSearchIds = null;
    aiChip.classList.add("hidden");
    if (rerender) {
      renderClientTabs(getClients(allIcons, allClients.map(c => c.name)));
      renderGrid();
    }
  }

  async function runAiSearch(query) {
    aiChip.classList.remove("hidden");
    aiChipLabel.textContent = `✨ Searching "${query}"…`;
    try {
      const token = await getAccessToken();
      const res = await fetch(`${ICON_API_BASE}/icons/ai-search`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `HTTP ${res.status}`);
      }
      const { ids } = await res.json();
      aiSearchIds = ids || [];
      aiChipLabel.textContent = `✨ "${query}" — ${aiSearchIds.length} match${aiSearchIds.length !== 1 ? "es" : ""}`;
      renderClientTabs(getClients(allIcons, allClients.map(c => c.name)));
      renderGrid();
    } catch (err) {
      console.error("[AI Search] Failed:", err);
      aiChipLabel.textContent = `AI search failed — showing text matches`;
      setTimeout(() => { if (!aiSearchIds) aiChip.classList.add("hidden"); }, 2500);
    }
  }

  searchInput.addEventListener("input", () => {
    activeQuery = searchInput.value;
    clearSearch.classList.toggle("hidden", !activeQuery);
    clearAiSearch({ rerender: false }); // typing returns to instant local filtering

    // Refresh client tabs to update counts based on search
    const clients = getClients(allIcons, allClients.map(c => c.name));
    renderClientTabs(clients);

    renderGrid();
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim()) {
      runAiSearch(searchInput.value.trim());
    }
  });

  aiChipClear.addEventListener("click", () => clearAiSearch());

  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    activeQuery = "";
    clearSearch.classList.add("hidden");
    searchInput.focus();
    clearAiSearch({ rerender: false });

    // Refresh client tabs to show full counts
    const clients = getClients(allIcons, allClients.map(c => c.name));
    renderClientTabs(clients);

    renderGrid();
  });

  // ---- Size selector ----
  sizeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      sizeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedSize = parseInt(btn.dataset.size, 10);
    });
  });

  // ---- Color selector ----
  colorBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      colorBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedColor = btn.dataset.color;
      console.log("[Color] Selected theme color:", selectedColor);
    });
  });

  // ---- Circle background toggle ----
  circleBackgroundToggle.addEventListener("click", () => {
    circleBackground = !circleBackground;
    circleBackgroundToggle.classList.toggle("active", circleBackground);
    circleBackgroundToggle.setAttribute("aria-pressed", String(circleBackground));
    console.log("[Background] Circle background:", circleBackground);
  });

  // ---- Mixed stroke toggle ----
  mixedStrokeToggle.addEventListener("click", () => {
    mixedStroke = !mixedStroke;
    mixedStrokeToggle.classList.toggle("active", mixedStroke);
    mixedStrokeToggle.setAttribute("aria-pressed", String(mixedStroke));

    // Show the mix-colour grids; hide the single Theme Color row while mixed is
    // on (its colours are all already offered in the mix grids — less clutter).
    mixedStrokeColors.classList.toggle("hidden", !mixedStroke);
    if (colorBar) colorBar.style.display = mixedStroke ? "none" : "";

    console.log("[MixedStroke] Mixed stroke mode:", mixedStroke);
  });

  // ---- Quick-return header ----
  // The editing controls stay pinned (CSS sticky). The title + name + search +
  // group tabs hide when scrolling down and slide back in when scrolling up.
  (function setupQuickReturnHeader() {
    const scroller = document.querySelector("#main-screen main");
    const chrome = document.querySelector("#main-screen header");
    if (!scroller || !chrome) return;

    let lastScroll = 0;
    let ticking = false;

    function apply() {
      const st = scroller.scrollTop;
      if (st <= 0) {
        chrome.style.marginTop = "";                 // fully shown at the very top
      } else if (st > lastScroll + 3 && st > 40) {
        chrome.style.marginTop = `-${chrome.offsetHeight}px`;  // scrolling down → hide
      } else if (st < lastScroll - 3) {
        chrome.style.marginTop = "";                 // scrolling up → reveal
      }
      lastScroll = st;
      ticking = false;
    }

    scroller.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(apply); ticking = true; }
    }, { passive: true });
  })();

  // ---- Mixed stroke color selectors ----
  mixedColorBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const slot = btn.dataset.mixedSlot; // "1" or "2"
      const color = btn.dataset.color;    // e.g., "Accent1"

      // Remove active class from all buttons in this slot
      mixedColorBtns.forEach(b => {
        if (b.dataset.mixedSlot === slot) {
          b.classList.remove("active");
        }
      });

      // Add active class to clicked button
      btn.classList.add("active");

      // Update state
      if (slot === "1") {
        mixedColor1 = color;
        console.log("[MixedStroke] Color 1 changed to:", color);
      } else {
        mixedColor2 = color;
        console.log("[MixedStroke] Color 2 changed to:", color);
      }
    });
  });

  // ---- Sign-in ----
  signinBtn.addEventListener("click", async () => {
    signinBtn.disabled = true;
    signinBtn.textContent = "Signing in…";
    setAuthError("");
    try {
      const token = await signIn();
      await loadIcons(token);

      // Fetch theme colors (PowerPoint only)
      if (currentHost === Office.HostType.PowerPoint) {
        themeColors = await fetchThemeColors();
        updateColorSwatches();
        updateMixedStrokeSwatches();
        startThemeRefresh(); // Start monitoring for theme changes
      }

      showScreen("main");
    } catch (err) {
      console.error("[Auth] Sign-in failed:", err);
      if (err.status === 401) clearCurrentSession();
      setAuthError("Sign-in failed. Please try again.");
      signinBtn.disabled = false;
      signinBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11.5 2.75h-8a.75.75 0 00-.75.75v17a.75.75 0 00.75.75h8M16 7.5l4.5 4.5-4.5 4.5M20.5 12h-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Sign in with Microsoft`;
    }
  });

  // ---- Sign-out ----
  signoutBtn.addEventListener("click", async () => {
    const confirmed = await customConfirm("Sign out of the icon library?", "Sign out", { confirmLabel: "Sign out", danger: false });
    if (!confirmed) return;
    try {
      await signOut();
      stopThemeRefresh(); // Stop monitoring theme changes
      themeColors = null;
      allIcons = [];
      iconGrid.innerHTML = "";
      activeQuery = "";
      showScreen("auth");
    } catch (err) {
      console.log("[Auth] Sign-out not available in dev mode");
    }
  });

  // ---- Update UI based on user role ----
  function updateUIForRole() {
    const uploadBtn = document.getElementById('upload-btn');
    const adminPanelBtn = document.getElementById('admin-panel-btn');

    // Show/hide admin-only buttons based on role
    if (currentUserRole === 'admin') {
      if (uploadBtn) uploadBtn.style.display = 'flex';
      if (adminPanelBtn) adminPanelBtn.style.display = 'flex';
      if (selectModeBtn) selectModeBtn.style.display = 'inline-flex';
    } else {
      if (uploadBtn) uploadBtn.style.display = 'none';
      if (adminPanelBtn) adminPanelBtn.style.display = 'none';
      if (selectModeBtn) selectModeBtn.style.display = 'none';
    }

    // Update header with user name + role badge
    const userInfoContainer = document.getElementById('user-info-container');
    if (userInfoContainer && currentUserProfile) {
      userInfoContainer.title = currentUserProfile.tenant.name;
      userInfoContainer.innerHTML = `
        <span class="user-name">${currentUserProfile.name || currentUserProfile.email || ''}</span>
        <span class="role-badge role-${currentUserRole}">${currentUserRole.toUpperCase()}</span>
      `;
    }
  }

  // ---- Load icons ----
  async function loadIcons(accessToken) {
    // Fetch user profile first
    if (accessToken) {
      try {
        const profileRes = await fetch(`${ICON_API_BASE}/user/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (profileRes.ok) {
          currentUserProfile = await profileRes.json();
          currentUserRole = currentUserProfile.role;
          if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
            console.log('[Profile] User role:', currentUserRole, 'Tenant:', currentUserProfile.tenant.name);
          }
          updateUIForRole();

          // Expose for debugging
          window.__DEBUG_PROFILE = currentUserProfile;
          window.__DEBUG_ROLE = currentUserRole;
        }
      } catch (err) {
        console.warn('[Profile] Failed to fetch user profile:', err);
        currentUserRole = 'viewer'; // Safe default
      }
    }

    // Fetch icons + the full group list (so empty groups still get a tab)
    allIcons = await fetchIconsFromAPI(accessToken);
    await fetchClients();
    invalidateCountCache();
    const clients = getClients(allIcons, allClients.map(c => c.name));

    renderClientTabs(clients);
    renderGrid();
  }

  // ---- Bootstrap ----
  async function bootstrap() {
    updateDebugStatus("Bootstrap starting...");
    showScreen("loading");

    // DEV MODE: Skip auth if Azure credentials not configured
    const isDev = AUTH_CONFIG.clientId.includes("YOUR-AZURE");
    updateDebugStatus(`Dev mode: ${isDev}`);

    if (isDev) {
      updateDebugStatus("Loading sample icons...");
      // Hide sign-out button in dev mode
      signoutBtn.style.display = 'none';

      // Simulate admin role in dev mode
      currentUserRole = 'admin';
      currentUserProfile = {
        name: 'Dev User',
        email: 'dev@example.com',
        role: 'admin',
        tenant: { name: 'Development', id: 1 }
      };

      await loadIcons(null); // null token = uses SAMPLE_ICONS fallback
      updateUIForRole(); // Apply role-based UI updates
      updateDebugStatus(`${allIcons.length} icons loaded`);

      // Fetch theme colors (PowerPoint only)
      if (currentHost === Office.HostType.PowerPoint) {
        updateDebugStatus("Fetching theme colors...");
        themeColors = await fetchThemeColors();
        updateColorSwatches();
        startThemeRefresh(); // Start monitoring for theme changes
        updateDebugStatus("Theme colors loaded");
      }

      updateDebugStatus("Switching to main screen");
      showScreen("main");
      return;
    }

    // Production auth flow
    try {
      updateDebugStatus("Initializing MSAL...");
      await initMsal();
      updateDebugStatus("Checking for cached session...");
      const token = await tryRestoreSession();
      if (token) {
        updateDebugStatus("Session restored! Loading icons...");
        try {
          await loadIcons(token);
          updateDebugStatus("Icons loaded");

          // Fetch theme colors (PowerPoint only)
          if (currentHost === Office.HostType.PowerPoint) {
            updateDebugStatus("Fetching theme colors...");
            themeColors = await fetchThemeColors();
            updateColorSwatches();
            startThemeRefresh(); // Start monitoring for theme changes
            updateDebugStatus("Theme colors loaded");
          }

          updateDebugStatus("Showing main screen");
          showScreen("main");
        } catch (loadErr) {
          updateDebugStatus(`Load error: ${loadErr.message}`);
          if (loadErr.status === 401) {
            clearCurrentSession();
            console.warn("[Bootstrap] Token rejected (401), showing sign-in");
          }
          showScreen("auth");
        }
      } else {
        updateDebugStatus("No cached session, showing sign-in");
        showScreen("auth");
      }
    } catch (err) {
      console.error("[Bootstrap] Error:", err);
      updateDebugStatus(`Bootstrap error: ${err.message}`);
      showScreen("auth");
    }
  }

  // ---- Client Management ----
  async function fetchClients() {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${ICON_API_BASE}/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch clients');
      }

      allClients = await res.json();
      populateClientSelect();
    } catch (error) {
      console.error('[Clients] Error fetching:', error);
      allClients = [];
    }
  }

  // ---- Group toggle-chip selector (shared by edit + review modals) ----
  // Renders one chip per group; tap to toggle. selectedIds pre-selects.
  function renderGroupChips(container, selectedIds, { includeUnassigned = false } = {}) {
    if (!container) return;
    const selected = new Set((selectedIds || []).map(String));
    container.innerHTML = "";
    if (!allClients.length && !includeUnassigned) {
      container.innerHTML = '<span class="group-chips-empty">No groups yet.</span>';
      return;
    }

    const realChips = [];
    let unassignedChip = null;

    // Keep the "Unassigned" chip in sync: it's on exactly when no group is chosen
    const syncUnassigned = () => {
      if (!unassignedChip) return;
      const anyReal = realChips.some(c => c.classList.contains("selected"));
      unassignedChip.classList.toggle("selected", !anyReal);
      unassignedChip.setAttribute("aria-pressed", !anyReal ? "true" : "false");
    };

    if (includeUnassigned) {
      unassignedChip = document.createElement("button");
      unassignedChip.type = "button";
      unassignedChip.className = "group-chip group-chip-unassigned";
      unassignedChip.dataset.unassigned = "1";
      unassignedChip.textContent = "Unassigned";
      unassignedChip.addEventListener("click", () => {
        // Choosing Unassigned clears every real group selection
        realChips.forEach(c => { c.classList.remove("selected"); c.setAttribute("aria-pressed", "false"); });
        syncUnassigned();
      });
      container.appendChild(unassignedChip);
    }

    allClients.forEach(client => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "group-chip" + (selected.has(String(client.id)) ? " selected" : "");
      chip.dataset.clientId = client.id;
      chip.textContent = client.name;
      chip.setAttribute("aria-pressed", chip.classList.contains("selected") ? "true" : "false");
      chip.addEventListener("click", () => {
        const on = chip.classList.toggle("selected");
        chip.setAttribute("aria-pressed", on ? "true" : "false");
        syncUnassigned();
      });
      realChips.push(chip);
      container.appendChild(chip);
    });

    syncUnassigned();
  }

  function getSelectedGroupIds(container) {
    if (!container) return [];
    // Only real group chips carry a clientId; the "Unassigned" chip is excluded
    return [...container.querySelectorAll(".group-chip.selected")]
      .map(c => c.dataset.clientId)
      .filter(Boolean);
  }

  function populateClientSelect() {
    if (!iconClientSelect) return; // legacy dropdown removed from the upload modal
    // Clear existing options except the first one
    iconClientSelect.innerHTML = '<option value="">Select client...</option>';

    // Add client options
    allClients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.id;
      option.textContent = client.name;
      iconClientSelect.appendChild(option);
    });
  }

  async function addNewClient() {
    const clientName = await customPrompt('Enter the client name:', 'New Client');
    if (!clientName || !clientName.trim()) return;

    try {
      const token = await getAccessToken();
      const res = await fetch(`${ICON_API_BASE}/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: clientName.trim() })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create client');
      }

      const newClient = await res.json();
      allClients.push(newClient);
      populateClientSelect();

      // Select the newly created client (legacy dropdown, if present)
      if (iconClientSelect) iconClientSelect.value = newClient.id;

      showToast(`Client "${newClient.name}" created - now upload icons to assign`);
    } catch (error) {
      console.error('[Clients] Error creating:', error);
      await customAlert(error.message, 'Error Creating Client');
    }
  }

  // ---- Version Pattern Detection Helper Functions ----
  function getBaseIconId(iconId) {
    // Strip version suffixes: -v2, -v3, -v10, etc.
    return iconId.replace(/-v\d+$/, '');
  }

  function hasVersionSuffix(iconId) {
    return /-v\d+$/.test(iconId);
  }

  function getVersionNumber(iconId) {
    const match = iconId.match(/-v(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  // ---- Check for Duplicate Icons ----
  function findDuplicates(uploadedIcons, existingIcons) {
    const duplicates = [];

    uploadedIcons.forEach(uploaded => {
      // First priority: Check for EXACT ID match
      let existing = existingIcons.find(icon => icon.id === uploaded.id);
      let isExactMatch = !!existing;

      // Second priority: If no exact match, check for base icon (strip version suffix)
      if (!existing) {
        const baseId = getBaseIconId(uploaded.id);
        existing = existingIcons.find(icon => icon.id === baseId);
      }

      if (existing) {
        duplicates.push({
          uploaded: uploaded,
          existing: existing,
          baseId: existing.id,
          isVersioned: hasVersionSuffix(uploaded.id),
          versionNumber: getVersionNumber(uploaded.id),
          isExactMatch: isExactMatch // Flag to indicate if it's exact duplicate or version variant
        });
      }
    });

    return duplicates;
  }

  // ---- Upload Icons ----
  uploadBtn.addEventListener("click", async () => {
    // Fresh batch each time the modal opens
    uploadedIcons = [];
    previewSection.classList.add("hidden");
    uploadStatus.classList.add("hidden");
    pasteIconName.value = "";
    pasteIconSvg.value = "";
    pasteIconStatus.className = "svg-paste-status hidden";

    // Load clients and render group chips fresh
    await fetchClients();
    renderGroupChips(uploadClients, [], { includeUnassigned: true });
    uploadModal.classList.remove("hidden");
  });

  if (addClientBtn) addClientBtn.addEventListener("click", addNewClient);

  closeUpload.addEventListener("click", () => {
    uploadModal.classList.add("hidden");
  });

  // Click outside modal to close
  uploadModal.addEventListener("click", (e) => {
    if (e.target === uploadModal) {
      uploadModal.classList.add("hidden");
    }
  });

  // A multi-icon "sheet" is an SVG whose densest level holds several sibling
  // <g> groups (one per icon) — the same signal the server segments by. Single
  // icons have few/no sibling groups, so they stay on the one-icon path.
  const SHEET_GROUP_THRESHOLD = 4;
  function isSheetSvg(svgText) {
    try {
      const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
      if (doc.querySelector("parsererror")) return false;
      let maxDirectGroups = 0;
      const visit = (node) => {
        let direct = 0;
        for (const child of node.children) {
          if (child.tagName && child.tagName.toLowerCase() === "g") direct++;
        }
        if (direct > maxDirectGroups) maxDirectGroups = direct;
        for (const child of node.children) visit(child);
      };
      const svgEl = doc.querySelector("svg");
      if (svgEl) visit(svgEl);
      return maxDirectGroups >= SHEET_GROUP_THRESHOLD;
    } catch {
      return false;
    }
  }

  // Send a sheet through the segment → name → review pipeline.
  async function uploadSheet(file) {
    uploadStatus.classList.remove("hidden", "upload-status-error");
    uploadStatus.textContent = `Splitting "${file.name}" into icons…`;
    try {
      const token = await getAccessToken();
      const res = await fetch(`${ICON_API_BASE}/shutterstock/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "X-Filename": encodeURIComponent(file.name)
        },
        body: file
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `HTTP ${res.status}`);
      }
      const { job_id } = await res.json();
      ssPollJob(job_id, document.createElement("button"), uploadStatus);
    } catch (err) {
      console.error("[Sheet] Upload failed:", err);
      uploadStatus.textContent = `Failed to split "${file.name}": ${err.message}`;
      uploadStatus.classList.add("upload-status-error");
      processNextSheet(); // continue with any remaining sheets
    }
  }

  // Process queued sheets one at a time (each opens the review modal).
  function processNextSheet() {
    const next = sheetQueue.shift();
    if (next) {
      uploadSheet(next);
    } else {
      uploadStatus.classList.add("hidden");
    }
  }

  // Re-run duplicate detection and refresh the preview grid for the batch.
  function refreshUploadPreview() {
    if (uploadedIcons.length === 0) {
      previewSection.classList.add("hidden");
      return;
    }
    uploadedIcons.forEach(i => { i._isDuplicate = false; i._duplicateInfo = null; });
    findDuplicates(uploadedIcons, allIcons).forEach(dup => {
      dup.uploaded._isDuplicate = true;
      dup.uploaded._duplicateInfo = dup;
    });
    renderPreview();
    previewSection.classList.remove("hidden");
  }

  // Clear, categorized alert about files that couldn't be added.
  async function alertUploadFailures(failed) {
    const list = r => failed.filter(f => f.reason === r).map(f => `• ${f.file}`);
    const eps = list("eps"), notSvg = list("not-svg"), outlined = list("outlined");
    const other = failed.filter(f => !["eps", "not-svg", "outlined"].includes(f.reason)).map(f => `• ${f.file}`);
    const parts = [];
    if (eps.length) parts.push(`EPS files aren't supported — please upload SVG:\n${eps.join("\n")}`);
    if (notSvg.length) parts.push(`Only SVG files can be uploaded:\n${notSvg.join("\n")}`);
    if (outlined.length) parts.push(`These have outlined strokes or fills — icons must be stroke-based:\n${outlined.join("\n")}`);
    if (other.length) parts.push(`Couldn't read:\n${other.join("\n")}`);
    await customAlert(parts.join("\n\n"), "Some icons weren't added");
  }

  svgFileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const failedFiles = []; // { file, reason }
    const sheetFiles = [];  // multi-icon sheets → splitter

    for (const file of files) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".eps")) { failedFiles.push({ file: file.name, reason: "eps" }); continue; }
      if (!lower.endsWith(".svg")) { failedFiles.push({ file: file.name, reason: "not-svg" }); continue; }

      try {
        let svg = (await file.text()).trim()
          .replace(/<\?xml[^>]*\?>/g, "")
          .replace(/<!DOCTYPE[^>]*>/g, "")
          .trim();

        // Multi-icon sheet → segmentation pipeline
        if (isSheetSvg(svg)) { sheetFiles.push(file); continue; }

        // Name + ID from filename (strip version suffix from the display name)
        const base = file.name.replace(/\.svg$/i, "");
        const iconName = base.replace(/[-_]/g, " ").replace(/\s+v\d+$/i, "");
        const iconId = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

        // Ensure viewBox + xmlns
        if (!/viewBox\s*=/i.test(svg)) {
          const w = (svg.match(/width=["']([\d.]+)/i) || [])[1] || 24;
          const h = (svg.match(/height=["']([\d.]+)/i) || [])[1] || 24;
          svg = svg.replace(/<svg/i, `<svg viewBox="0 0 ${w} ${h}"`);
        }
        if (!/xmlns\s*=/i.test(svg)) svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');

        // Reject outlined-stroke / filled icons — the library is stroke-based
        if (hasActiveFill(svg)) { failedFiles.push({ file: file.name, reason: "outlined" }); continue; }

        // Normalize stroke colour to our default (currentColor)
        svg = svg
          .replace(/stroke\s*=\s*["'][^"']*["']/gi, m => /none/i.test(m) ? m : 'stroke="currentColor"')
          .replace(/stroke\s*:\s*[^;"'}\s]+/gi, m => /none/i.test(m) ? m : 'stroke:currentColor');

        uploadedIcons.push({
          id: iconId,
          name: iconName.charAt(0).toUpperCase() + iconName.slice(1),
          svg
        });
      } catch (err) {
        failedFiles.push({ file: file.name, reason: "read-error" });
      }
    }

    if (failedFiles.length > 0) await alertUploadFailures(failedFiles);

    // Sheets: split + name + review, one at a time
    if (sheetFiles.length > 0) {
      sheetQueue = sheetFiles.slice();
      processNextSheet();
    }

    refreshUploadPreview();

    if (uploadedIcons.length === 0 && sheetFiles.length === 0 && failedFiles.length === 0) {
      showToast("No valid SVG files");
    }

    // Allow re-selecting the same file(s) again
    e.target.value = "";
  });

  // ---- Paste a single icon (from Illustrator) into the upload batch ----
  function addPastedIcon() {
    const name = pasteIconName.value.trim();
    const raw = pasteIconSvg.value.trim();
    const setErr = msg => { pasteIconStatus.className = "svg-paste-status svg-paste-error"; pasteIconStatus.textContent = msg; };

    if (!name) return setErr("Enter an icon name.");
    if (!raw) return setErr("Paste the icon first.");
    if (hasActiveFill(raw)) return setErr("This icon has outlined strokes or fills — icons must be stroke-based.");
    const cleaned = prepPastedSvg(raw);
    if (!cleaned) return setErr("That doesn't look like a valid icon.");

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    uploadedIcons.push({ id, name: name.charAt(0).toUpperCase() + name.slice(1), svg: cleaned });

    pasteIconName.value = "";
    pasteIconSvg.value = "";
    pasteIconStatus.className = "svg-paste-status svg-paste-ok";
    pasteIconStatus.textContent = `Added "${name}" — Upload to Library when ready.`;
    refreshUploadPreview();
  }
  pasteIconAdd.addEventListener("click", addPastedIcon);

  function renderPreview() {
    previewGrid.innerHTML = "";
    previewCount.textContent = uploadedIcons.length;

    console.log("[Preview] Rendering", uploadedIcons.length, "icons");

    uploadedIcons.forEach((icon, index) => {
      const div = document.createElement("div");
      div.className = "preview-icon";
      div.title = icon.name;

      // Add duplicate warning badge
      if (icon._isDuplicate) {
        div.classList.add("preview-icon-duplicate");
        const badge = document.createElement("span");
        badge.className = "duplicate-badge";
        badge.textContent = "Duplicate";
        badge.title = `Icon "${icon._duplicateInfo.existing.name}" already exists`;
        div.appendChild(badge);
      }

      console.log(`[Preview] Icon ${index}:`, icon.name, "SVG length:", icon.svg.length);

      // Use data URI with base64 encoding for maximum compatibility
      try {
        let svgData = icon.svg.trim();

        // Strip hardcoded colors to make icons light gray
        svgData = svgData.replace(/stroke=["']#[0-9a-fA-F]{3,6}["']/g, 'stroke="#999"');
        svgData = svgData.replace(/stroke=["']rgb\([^)]+\)["']/g, 'stroke="#999"');
        svgData = svgData.replace(/fill=["']#[0-9a-fA-F]{3,6}["']/g, 'fill="none"');
        svgData = svgData.replace(/fill=["']rgb\([^)]+\)["']/g, 'fill="none"');

        // Ensure proper xmlns
        if (!svgData.includes('xmlns=')) {
          svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        // Convert to base64 data URI
        const base64 = btoa(unescape(encodeURIComponent(svgData)));
        const dataUri = `data:image/svg+xml;base64,${base64}`;

        const img = document.createElement('img');
        img.src = dataUri;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';

        img.onload = () => {
          console.log(`[Preview] ✓ Loaded ${icon.name}`);
        };

        img.onerror = (err) => {
          console.error(`[Preview] ✗ Failed to load ${icon.name}`, err);
          // Show error placeholder
          div.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:10px;">Error</div>`;
        };

        div.appendChild(img);
      } catch (err) {
        console.error("[Preview] Error rendering", icon.name, err);
        div.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:10px;">Error</div>`;
      }

      previewGrid.appendChild(div);
    });
  }

  copyCodeBtn.addEventListener("click", async () => {
    if (uploadedIcons.length === 0) return;

    const selectedClientIds = getSelectedGroupIds(uploadClients);

    copyCodeBtn.disabled = true;
    copyCodeBtn.textContent = "Uploading...";

    const token = await getAccessToken();
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    try {
      // Process each icon
      for (const icon of uploadedIcons) {
        let iconToUpload = { ...icon };
        let shouldUpload = true;
        let isUpdate = false;

        console.log(`[Upload] Processing icon: ${icon.name}, isDuplicate: ${icon._isDuplicate}`);

        // Check if this is a duplicate
        if (icon._isDuplicate) {
          console.log(`[Upload] Prompting for duplicate: ${icon.name}`);

          // Prompt user for action
          const decision = await promptDuplicateAction(icon._duplicateInfo);

          if (decision.action === "skip") {
            console.log(`[Upload] Skipped: ${icon.name}`);
            skippedCount++;
            shouldUpload = false;
          } else if (decision.action === "replace") {
            console.log(`[Upload] Replacing: ${icon._duplicateInfo.existing.name}`);
            // Use existing icon's ID to trigger UPSERT update
            iconToUpload.id = icon._duplicateInfo.existing.id;
            isUpdate = true;

            // If user provided a new name during replace, use it; otherwise keep existing name
            if (decision.newName) {
              iconToUpload.name = decision.newName;
              console.log(`[Upload] Replace with new name: id="${iconToUpload.id}", name="${iconToUpload.name}"`);
            } else {
              iconToUpload.name = icon._duplicateInfo.existing.name;
              console.log(`[Upload] Replace keeping name: id="${iconToUpload.id}", name="${iconToUpload.name}"`);
            }
          }
        }

        // Upload icon if not skipped
        if (shouldUpload) {
          // Assign the selected groups to every uploaded icon. When updating an
          // existing icon and no groups are selected, keep its current groups.
          let clientIdsToSend = selectedClientIds;
          if (isUpdate && selectedClientIds.length === 0) {
            const existing = icon._duplicateInfo.existing;
            clientIdsToSend = (existing.clients || []).map(c => c.id);
            console.log(`[Upload] Preserving existing groups:`, clientIdsToSend);
          } else {
            console.log(`[Upload] Assigning groups:`, clientIdsToSend);
          }

          const payload = {
            id: iconToUpload.id,
            name: iconToUpload.name,
            svg: iconToUpload.svg,
            client_ids: clientIdsToSend
          };

          console.log(`[Upload] Sending to API:`, { id: payload.id, name: payload.name });

          const res = await fetch(`${ICON_API_BASE}/icons`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const result = await res.json();
            console.log(`[Upload] API response for ${iconToUpload.name}:`, result);
            if (result.action === 'created') {
              createdCount++;
            } else if (result.action === 'updated') {
              updatedCount++;
            }
          } else {
            console.error(`[Upload] Failed to upload ${iconToUpload.name}:`, await res.text());
            skippedCount++;
          }
        }
      }

      // Reload icons
      await loadIcons(token);

      // Show success message
      const summary = [];
      if (createdCount > 0) summary.push(`${createdCount} created`);
      if (updatedCount > 0) summary.push(`${updatedCount} updated`);
      if (skippedCount > 0) summary.push(`${skippedCount} skipped`);

      showToast(summary.join(', '));

      // Close modal and reset
      uploadModal.classList.add("hidden");
      uploadedIcons = [];
      previewSection.classList.add("hidden");
      svgFileInput.value = "";

    } catch (error) {
      console.error("[Upload] Error:", error);
      showToast("Upload failed. Please try again.");
    } finally {
      copyCodeBtn.disabled = false;
      copyCodeBtn.textContent = "Upload to Library";
    }
  });

  // =============================================
  //  SHUTTERSTOCK INTEGRATION (admin curation pipeline)
  //  Search → License & Ingest → poll job → review → POST /api/icons
  // =============================================
  const ssBtn        = document.getElementById("shutterstock-btn");
  const ssPanel      = document.getElementById("shutterstock-panel");
  const ssSearchIn   = document.getElementById("ss-search-input");
  const ssSearchBtn  = document.getElementById("ss-search-btn");
  const ssResults    = document.getElementById("ss-results");
  const ssStatus     = document.getElementById("ss-status");
  const ssPager      = document.getElementById("ss-pager");
  const ssPrev       = document.getElementById("ss-prev");
  const ssNext       = document.getElementById("ss-next");
  const ssPageLabel  = document.getElementById("ss-page-label");
  const ssReviewModal   = document.getElementById("ss-review-modal");
  const ssReviewGrid    = document.getElementById("ss-review-grid");
  const ssReviewClients = document.getElementById("ss-review-clients");
  const ssReviewCancel  = document.getElementById("ss-review-cancel");
  const ssReviewApprove = document.getElementById("ss-review-approve");

  let ssOpen = false;
  let ssPage = 1;
  let ssQuery = "";
  let ssActivePollTimer = null;
  let ssReviewJobId = null;
  let ssCandidates = [];

  function ssSetStatus(msg, isError) {
    if (!msg) {
      ssStatus.classList.add("hidden");
      return;
    }
    ssStatus.textContent = msg;
    ssStatus.classList.toggle("ss-status-error", !!isError);
    ssStatus.classList.remove("hidden");
  }

  function toggleShutterstockPanel(open) {
    ssOpen = open !== undefined ? open : !ssOpen;
    ssPanel.classList.toggle("hidden", !ssOpen);
    // Hide the curated grid + its option bars while searching Shutterstock
    ["icon-grid", "size-bar", "color-bar", "empty-state", "ai-search-chip"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = ssOpen ? "none" : "";
    });
    if (ssBtn) ssBtn.classList.toggle("active", ssOpen);
    if (ssOpen) {
      // Non-admins can search/browse but licensing/uploading are admin actions
      const hint = ssPanel.querySelector(".ss-hint");
      if (hint && currentUserRole !== 'admin') {
        hint.textContent = "Vector results only. Found something useful? Ask an admin to license it into the library.";
      }
      const uploadRow = document.getElementById("ss-upload-row");
      if (uploadRow) uploadRow.style.display = currentUserRole === 'admin' ? "flex" : "none";
      ssSearchIn.focus();
    }
  }

  // ---- Manual EPS sheet upload (works around API catalog limits) ----
  async function ssUploadFile(file) {
    const uploadBtn = document.getElementById("ss-upload-btn");
    const progress = document.getElementById("ss-upload-progress");
    progress.classList.remove("hidden", "ss-progress-error");
    progress.textContent = `Uploading "${file.name}"…`;
    uploadBtn.disabled = true;

    try {
      const token = await getAccessToken();
      const res = await fetch(`${ICON_API_BASE}/shutterstock/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "X-Filename": encodeURIComponent(file.name)
        },
        body: file
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `HTTP ${res.status}`);
      }
      const { job_id } = await res.json();
      ssPollJob(job_id, uploadBtn, progress);
    } catch (err) {
      console.error("[Shutterstock] Upload failed:", err);
      progress.textContent = `Failed: ${err.message}`;
      progress.classList.add("ss-progress-error");
      uploadBtn.disabled = false;
    }
  }

  async function ssSearch(page = 1) {
    const query = ssSearchIn.value.trim();
    if (!query) return;
    ssQuery = query;
    ssPage = page;
    ssSetStatus("Searching Shutterstock…");
    ssResults.innerHTML = "";
    ssPager.classList.add("hidden");

    try {
      const token = await getAccessToken();
      const res = await fetch(`${ICON_API_BASE}/shutterstock/search?query=${encodeURIComponent(query)}&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      ssSetStatus(null);
      renderSsResults(data);
    } catch (err) {
      console.error("[Shutterstock] Search failed:", err);
      ssSetStatus(`Search failed: ${err.message}`, true);
    }
  }

  function renderSsResults(data) {
    ssResults.innerHTML = "";
    if (!data.results || data.results.length === 0) {
      ssSetStatus(`No vector results for "${ssQuery}"`);
      return;
    }

    data.results.forEach(img => {
      const card = document.createElement("div");
      card.className = "ss-card";
      card.innerHTML = `
        <div class="ss-thumb-wrap">
          ${img.preview_url ? `<img class="ss-thumb" src="${img.preview_url}" alt="" loading="lazy" />` : '<div class="ss-thumb ss-thumb-missing">No preview</div>'}
          <span class="ss-badge">Vector</span>
        </div>
        <p class="ss-desc" title="${img.description.replace(/"/g, "&quot;")}">${img.description}</p>
      `;
      const desc = card.querySelector(".ss-desc");
      if (desc) desc.addEventListener("click", () => desc.classList.toggle("expanded"));
      if (currentUserRole === 'admin') {
        const btn = document.createElement("button");
        btn.className = "btn-primary ss-ingest-btn";
        btn.textContent = "License & Ingest";
        btn.addEventListener("click", () => ssIngest(img.id, card, btn));
        card.appendChild(btn);
      } else {
        const note = document.createElement("p");
        note.className = "ss-admin-note";
        note.textContent = "Ask an admin to license this icon";
        card.appendChild(note);
      }
      ssResults.appendChild(card);
    });

    const totalPages = Math.max(1, Math.ceil((data.total_count || 0) / (data.per_page || 24)));
    ssPageLabel.textContent = `Page ${ssPage} of ${Math.min(totalPages, 999)}`;
    ssPrev.disabled = ssPage <= 1;
    ssNext.disabled = ssPage >= totalPages;
    ssPager.classList.remove("hidden");
  }

  async function ssIngest(imageId, card, btn) {
    const confirmed = await customConfirm(
      "Licensing this image will consume a Shutterstock plan credit (unless already licensed). Continue?",
      "License Image"
    );
    if (!confirmed) return;

    btn.disabled = true;
    btn.textContent = "Starting…";
    const progress = document.createElement("div");
    progress.className = "ss-progress";
    card.appendChild(progress);

    try {
      const token = await getAccessToken();
      const res = await fetch(`${ICON_API_BASE}/shutterstock/ingest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `HTTP ${res.status}`);
      }
      const { job_id } = await res.json();
      ssPollJob(job_id, btn, progress);
    } catch (err) {
      console.error("[Shutterstock] Ingest failed:", err);
      progress.textContent = `Failed: ${err.message}`;
      progress.classList.add("ss-progress-error");
      btn.disabled = false;
      btn.textContent = "License & Ingest";
    }
  }

  const SS_STATUS_LABELS = {
    queued: "Queued…",
    licensing: "Licensing image…",
    downloading: "Downloading EPS…",
    converting: "Converting to PNG + SVG…",
    segmenting: "AI segmenting & naming icons…",
    review_ready: "Ready for review",
    failed: "Failed",
    done: "Done"
  };

  function ssPollJob(jobId, btn, progress) {
    if (ssActivePollTimer) clearInterval(ssActivePollTimer);

    ssActivePollTimer = setInterval(async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`${ICON_API_BASE}/shutterstock/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const job = await res.json();

        progress.textContent = `${SS_STATUS_LABELS[job.status] || job.status} (${job.progress}%)`;

        if (job.status === "review_ready") {
          clearInterval(ssActivePollTimer);
          ssActivePollTimer = null;
          btn.textContent = "Ingested";
          openSsReview(jobId, job.results || []);
        } else if (job.status === "failed") {
          clearInterval(ssActivePollTimer);
          ssActivePollTimer = null;
          progress.textContent = `Failed: ${job.error || "unknown error"}`;
          progress.classList.add("ss-progress-error");
          btn.disabled = false;
          btn.textContent = "Retry";
        }
      } catch (err) {
        console.warn("[Shutterstock] Poll error (will retry):", err.message);
      }
    }, 3000);
  }

  async function openSsReview(jobId, candidates) {
    ssReviewJobId = jobId;
    ssCandidates = candidates;

    // Hand off from the upload modal to the review modal
    uploadModal.classList.add("hidden");
    uploadStatus.classList.add("hidden");

    // Group toggle-chips (same control as the edit modal)
    await fetchClients();
    renderGroupChips(ssReviewClients, [], { includeUnassigned: true });

    ssReviewGrid.innerHTML = "";
    candidates.forEach((cand, idx) => {
      const ok = cand.stroke_status === "valid";
      const item = document.createElement("div");
      item.className = "ss-review-item" + (ok ? "" : " ss-review-blocked");
      item.innerHTML = `
        <label class="ss-review-check">
          <input type="checkbox" data-idx="${idx}" ${ok ? "checked" : "disabled"} />
        </label>
        <div class="ss-review-preview">${cand.svg}</div>
        <div class="ss-review-fields">
          <input type="text" class="confirm-input ss-review-name" data-idx="${idx}" value="${cand.name.replace(/"/g, "&quot;")}" ${ok ? "" : "disabled"} />
          <input type="text" class="confirm-input ss-review-tags" data-idx="${idx}" placeholder="tags, comma, separated" value="${(cand.tags || []).join(", ").replace(/"/g, "&quot;")}" ${ok ? "" : "disabled"} />
        </div>
        <span class="ss-review-badge ss-badge-${cand.stroke_status}">${
          cand.stroke_status === "valid" ? "Stroke ✓" :
          cand.stroke_status === "outlined" ? "Outlined ✕" : "Mixed ?"
        }</span>
      `;
      ssReviewGrid.appendChild(item);
    });

    ssReviewModal.classList.remove("hidden");
  }

  async function ssApproveSelected() {
    const checks = ssReviewGrid.querySelectorAll('input[type="checkbox"]:checked');
    if (checks.length === 0) {
      showToast("Nothing selected");
      return;
    }

    ssReviewApprove.disabled = true;
    ssReviewApprove.textContent = "Adding…";
    const clientIds = getSelectedGroupIds(ssReviewClients);
    let added = 0, failed = 0;

    try {
      const token = await getAccessToken();

      for (const check of checks) {
        const idx = Number(check.dataset.idx);
        const cand = ssCandidates[idx];
        const nameInput = ssReviewGrid.querySelector(`.ss-review-name[data-idx="${idx}"]`);
        const name = (nameInput?.value || cand.name).trim();
        const iconId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const tagsInput = ssReviewGrid.querySelector(`.ss-review-tags[data-idx="${idx}"]`);
        const tags = (tagsInput?.value || "")
          .split(",")
          .map(t => t.trim().toLowerCase())
          .filter(Boolean);

        const res = await fetch(`${ICON_API_BASE}/icons`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id: iconId, name, svg: cand.svg, category: "Uncategorized", client_ids: clientIds, tags })
        });

        if (res.ok) {
          added++;
        } else {
          failed++;
          console.error(`[Shutterstock] Failed to add "${name}":`, await res.text());
        }
      }

      // Mark job done and refresh the curated library
      await fetch(`${ICON_API_BASE}/shutterstock/jobs/${ssReviewJobId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});

      await loadIcons(token);
      ssReviewModal.classList.add("hidden");
      ssResetUploadButton();
      showToast(`${added} icon${added !== 1 ? "s" : ""} added${failed ? `, ${failed} failed` : ""}`);
      processNextSheet(); // continue with any remaining sheets
    } catch (err) {
      console.error("[Shutterstock] Approve failed:", err);
      showToast("Failed to add icons");
    } finally {
      ssReviewApprove.disabled = false;
      ssReviewApprove.textContent = "Add Selected to Library";
    }
  }

  // Wire the review modal's Add / Discard buttons (the old Shutterstock panel
  // that used to wire these was removed; sheet uploads drive this now).
  ssReviewApprove.addEventListener("click", ssApproveSelected);
  ssReviewCancel.addEventListener("click", () => {
    ssReviewModal.classList.add("hidden");
    processNextSheet(); // move on to the next queued sheet, if any
  });

  function ssResetUploadButton() {
    const uploadBtn = document.getElementById("ss-upload-btn");
    const progress = document.getElementById("ss-upload-progress");
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload EPS sheet…";
    }
    if (progress) progress.classList.add("hidden");
  }

  if (ssBtn) {
    ssBtn.addEventListener("click", () => toggleShutterstockPanel());
    ssSearchBtn.addEventListener("click", () => ssSearch(1));
    ssSearchIn.addEventListener("keydown", (e) => { if (e.key === "Enter") ssSearch(1); });
    ssPrev.addEventListener("click", () => ssSearch(ssPage - 1));
    ssNext.addEventListener("click", () => ssSearch(ssPage + 1));
    ssReviewCancel.addEventListener("click", () => { ssReviewModal.classList.add("hidden"); ssResetUploadButton(); });
    ssReviewApprove.addEventListener("click", ssApproveSelected);

    const ssUploadBtn = document.getElementById("ss-upload-btn");
    const ssUploadInput = document.getElementById("ss-upload-input");
    if (ssUploadBtn && ssUploadInput) {
      ssUploadBtn.addEventListener("click", () => ssUploadInput.click());
      ssUploadInput.addEventListener("change", () => {
        const file = ssUploadInput.files[0];
        ssUploadInput.value = ""; // allow re-selecting the same file
        if (!file) return;
        if (file.size > 30 * 1024 * 1024) {
          showToast("File too large (max 30 MB)");
          return;
        }
        ssUploadFile(file);
      });
    }
  }

  await bootstrap();
});

} else {
  updateDebugStatus("Script already initialized, skipping duplicate load");
}
