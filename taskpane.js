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
  const fillToggle           = document.getElementById("fill-toggle");
  const uploadBtn            = document.getElementById("upload-btn");
  const editModeBtn          = document.getElementById("edit-mode-btn");
  const uploadModal          = document.getElementById("upload-modal");
  const closeUpload          = document.getElementById("close-upload");
  const svgFileInput         = document.getElementById("svg-file-input");
  const iconCategoryInput    = document.getElementById("icon-category");
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

  // ---- State ----
  let allIcons       = [];
  let activeCategory = "All";
  let activeClient   = "All";
  let activeQuery    = "";
  let selectedSize   = 48;   // px — inserted icon size
  let selectedColor  = "Accent1";  // PowerPoint theme color
  let circleBackground = false;  // Add circle background to icons
  let fillMode       = false;  // Use fill instead of stroke
  let uploadedIcons  = [];  // Temporary storage for bulk uploaded icons
  let toastTimer     = null;
  let currentUserRole = null;  // 'admin', 'user', 'viewer'
  let currentUserProfile = null; // { name, email, role, tenant }
  let isEditMode = false;  // Edit mode for deleting icons
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
  function customConfirm(message, title = "Confirm") {
    return new Promise((resolve) => {
      confirmTitle.textContent = title;
      confirmMessage.textContent = message;
      confirmInput.classList.add("hidden");
      confirmCancelBtn.style.display = 'block';
      confirmOkBtn.textContent = 'Delete';
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

  // ---- Render ----
  function renderTabs(categories) {
    // Remove existing tenant header if any
    const existingHeader = document.querySelector('.tenant-header');
    if (existingHeader) existingHeader.remove();

    // Add tenant header above tabs
    if (currentUserProfile) {
      const tenantHeader = document.createElement('div');
      tenantHeader.className = 'tenant-header';
      tenantHeader.innerHTML = `
        <strong>${currentUserProfile.tenant.name}</strong>
        <span style="opacity: 0.7;">${allIcons.length} icon${allIcons.length !== 1 ? 's' : ''}</span>
      `;
      categoryTabs.before(tenantHeader);
    }

    // Render category tabs
    categoryTabs.innerHTML = "";
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "tab-btn" + (cat === activeCategory ? " active" : "");
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        activeCategory = cat;
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.textContent === cat));
        renderGrid();
      });
      categoryTabs.appendChild(btn);
    });
  }

  function renderClientTabs(clients) {
    clientTabs.innerHTML = "";

    // Only show client tabs if there are multiple clients or any assigned icons
    if (clients.length <= 1) {
      clientTabs.style.display = "none";
      return;
    }

    clientTabs.style.display = "flex";
    clients.forEach(client => {
      const btn = document.createElement("button");
      btn.className = "tab-btn client-tab-btn" + (client === activeClient ? " active" : "");
      btn.textContent = client;
      btn.addEventListener("click", () => {
        activeClient = client;
        clientTabs.querySelectorAll(".client-tab-btn").forEach(b => b.classList.toggle("active", b.textContent === client));
        renderGrid();
      });
      clientTabs.appendChild(btn);
    });
  }

  function renderGrid() {
    const visible = filterIcons(allIcons, { category: activeCategory, client: activeClient, query: activeQuery });
    resultCount.textContent = `${visible.length} icon${visible.length !== 1 ? "s" : ""}`;

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

      // Prepare SVG for thumbnail: strip hardcoded stroke/fill colors so CSS can style it
      let thumbnailSvg = icon.svg;
      thumbnailSvg = thumbnailSvg.replace(/stroke=["']#[0-9a-fA-F]{3,6}["']/g, 'stroke="currentColor"');
      thumbnailSvg = thumbnailSvg.replace(/stroke=["']rgb\([^)]+\)["']/g, 'stroke="currentColor"');
      thumbnailSvg = thumbnailSvg.replace(/fill=["']#[0-9a-fA-F]{3,6}["']/g, 'fill="none"');
      thumbnailSvg = thumbnailSvg.replace(/fill=["']rgb\([^)]+\)["']/g, 'fill="none"');

      card.innerHTML = `${thumbnailSvg}<span class="icon-name">${icon.name}</span>`;

      // Add delete button in edit mode for admins on their own tenant's icons
      if (isEditMode && currentUserRole === 'admin' && currentUserProfile) {
        const isOwnIcon = !icon.tenant_name || icon.tenant_name === currentUserProfile.tenant.name;
        if (isOwnIcon) {
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "icon-delete-btn";
          deleteBtn.innerHTML = "&times;";
          deleteBtn.title = "Delete icon";
          deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent card click (insert)
            deleteIcon(icon);
          });
          card.appendChild(deleteBtn);
        }
      }

      // Only allow insertion when not in edit mode
      if (!isEditMode) {
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

    const confirmed = await customConfirm(
      `Delete "${icon.name}"?`,
      'Delete Icon'
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = await getAccessToken();
      const res = await fetch(`${ICON_API_BASE}/icons/${icon.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete icon');
      }

      // Remove from local array
      allIcons = allIcons.filter(i => i.id !== icon.id);

      // Re-render UI
      const categories = getCategories(allIcons);
      const clients = getClients(allIcons);
      renderTabs(categories);
      renderClientTabs(clients);
      renderGrid();

      showToast(`"${icon.name}" deleted`);
    } catch (error) {
      console.error('[Delete] Error:', error);
      showToast(`Error: ${error.message}`);
    }
  }

  // ---- Insert icon into document ----
  async function insertIcon(icon, cardEl) {
    // Block insertions for viewers
    if (currentUserRole === 'viewer') {
      showToast('Viewer role cannot insert icons');
      return;
    }

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
      console.log("[Theme] Not PowerPoint, using fallback colors");
      return fallbackColors;
    }

    try {
      console.log("[Theme] Attempting to fetch PowerPoint theme colors...");
      console.log("[Theme] PowerPoint.js available:", typeof PowerPoint !== 'undefined');
      console.log("[Theme] Office.context.requirements available:", typeof Office.context.requirements !== 'undefined');

      // Check if PowerPointApi 1.10 is supported
      if (Office.context.requirements && Office.context.requirements.isSetSupported) {
        const isPptApi110Supported = Office.context.requirements.isSetSupported('PowerPointApi', '1.10');
        console.log("[Theme] PowerPointApi 1.10 supported:", isPptApi110Supported);

        if (!isPptApi110Supported) {
          console.warn("[Theme] PowerPointApi 1.10 not supported - theme color API unavailable");
          console.warn("[Theme] Your PowerPoint version may be too old. Update to latest version.");
          return fallbackColors;
        }
      }

      return await PowerPoint.run(async (context) => {
        const masters = context.presentation.slideMasters;
        masters.load("items");
        await context.sync();

        console.log("[Theme] Slide masters count:", masters.items.length);

        if (masters.items.length === 0) {
          console.warn("[Theme] No slide masters found, using fallback");
          return fallbackColors;
        }

        const scheme = masters.items[0].themeColorScheme;
        await context.sync(); // Sync after accessing themeColorScheme

        console.log("[Theme] Theme color scheme object:", scheme ? "available" : "null");

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
            console.log(`[Theme] ✓ ${name}: ${color.value}`);
          } catch (err) {
            console.error(`[Theme] ✗ Failed to get ${name}:`, err.message, err.code);
            colors[name] = fallbackColors[name];
          }
        }

        console.log("[Theme] Successfully fetched theme colors:", colors);
        return colors;
      });
    } catch (error) {
      console.error("[Theme] API failed:", error);
      console.error("[Theme] Error name:", error.name);
      console.error("[Theme] Error code:", error.code);
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

    // Determine if icon uses stroke or fill (user can override with fillMode toggle)
    // Check for any stroke-related attributes
    const hasStrokeAttr = svg.includes('stroke="') || svg.includes("stroke='");
    const hasStrokeWidth = svg.includes('stroke-width');
    const hasStrokeLinecap = svg.includes('stroke-linecap');
    const hasStrokeLinejoin = svg.includes('stroke-linejoin');

    const usesStroke = !fillMode && (hasStrokeAttr || hasStrokeWidth || hasStrokeLinecap || hasStrokeLinejoin);

    if (usesStroke) {
      // For stroke icons: Use internal CSS with theme class (BrightCarbon method)
      let modifiedContent = svgContent;
      const strokeClass = `${themeClass}_Stroke_v2`;

      // Extract stroke-width and other properties from existing styles
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

      console.log(`[PPT] Extracted properties: stroke-width=${strokeWidth}, linecap=${strokeLinecap}, linejoin=${strokeLinejoin}`);

      // Scale stroke-width to maintain constant 2pt appearance across all icon sizes
      // Formula: Keep stroke constant in pixels regardless of icon size
      // For 48px icon with viewBox 24x24: 1 viewBox unit = 2px, so we want stroke = 1.0 to get 2pt
      const scaleFactor = selectedSize / 24; // How many pixels per viewBox unit
      const targetStrokePt = 2; // Target stroke in points
      const adjustedStrokeWidth = targetStrokePt / scaleFactor;

      console.log(`[PPT] Icon size: ${selectedSize}px, Scale: ${scaleFactor}x, Adjusted stroke: ${adjustedStrokeWidth.toFixed(3)} (renders as ${targetStrokePt}pt)`);

      // Remove original styles and defs, we'll add cleaned version
      modifiedContent = modifiedContent.replace(/<style[\s\S]*?<\/style>/g, '');
      modifiedContent = modifiedContent.replace(/<defs>[\s\S]*?<\/defs>/g, '');

      // Remove existing class attributes
      modifiedContent = modifiedContent.replace(/class="[^"]*"/g, '');

      // Remove inline stroke and fill color attributes
      modifiedContent = modifiedContent.replace(/stroke="[^"]*"/g, '');
      modifiedContent = modifiedContent.replace(/fill="[^"]*"/g, 'fill="none"');

      // Add theme class to all shape elements
      modifiedContent = modifiedContent.replace(/<path /g, `<path class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<line /g, `<line class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<polyline /g, `<polyline class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<circle /g, `<circle class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<rect /g, `<rect class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<polygon /g, `<polygon class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<ellipse /g, `<ellipse class="${strokeClass}" `);

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

        backgroundCircle = `<circle cx="${cx}" cy="${cy}" r="${radius}" class="MsftOfcThm_Background2_Fill_v2" />
           <circle cx="${cx}" cy="${cy}" r="${radius}" class="${themeClass}_Fill_v2" opacity="0.35" />`;
      }

      // Build SVG with theme styles including extracted properties
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${selectedSize}" height="${selectedSize}" viewBox="${viewBox}">
        <style>
          .${strokeClass} {
            stroke: ${fallbackColor};
            fill: none !important;
            stroke-width: ${adjustedStrokeWidth};
            stroke-linecap: ${strokeLinecap};
            stroke-linejoin: ${strokeLinejoin};
          }
          .${themeClass}_Fill_v2 { fill: ${fallbackColor}; }
          .MsftOfcThm_Background2_Fill_v2 { fill: #F5F5F5; }
        </style>
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

      console.log(`[PPT Fill] Extracted properties: stroke-width=${strokeWidth}, linecap=${strokeLinecap}, linejoin=${strokeLinejoin}`);

      // Scale stroke-width to maintain constant 2pt appearance across all icon sizes
      const scaleFactor = selectedSize / 24;
      const targetStrokePt = 2;
      const adjustedStrokeWidth = targetStrokePt / scaleFactor;

      console.log(`[PPT Fill] Icon size: ${selectedSize}px, Scale: ${scaleFactor}x, Adjusted stroke: ${adjustedStrokeWidth.toFixed(3)} (renders as ${targetStrokePt}pt)`);

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
  searchInput.addEventListener("input", () => {
    activeQuery = searchInput.value;
    clearSearch.classList.toggle("hidden", !activeQuery);
    renderGrid();
  });

  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    activeQuery = "";
    clearSearch.classList.add("hidden");
    searchInput.focus();
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
  circleBackgroundToggle.addEventListener("change", () => {
    circleBackground = circleBackgroundToggle.checked;
    console.log("[Background] Circle background:", circleBackground);
  });

  // ---- Fill toggle ----
  fillToggle.addEventListener("change", () => {
    fillMode = fillToggle.checked;
    console.log("[Fill] Fill mode:", fillMode);
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

  // ---- Edit Mode Toggle ----
  editModeBtn.addEventListener("click", () => {
    isEditMode = !isEditMode;

    // Toggle icons and visual state
    const normalIcon = document.getElementById("edit-icon-normal");
    const activeIcon = document.getElementById("edit-icon-active");
    if (isEditMode) {
      normalIcon.style.display = "none";
      activeIcon.style.display = "block";
      editModeBtn.classList.add("active");
      editModeBtn.title = "Exit edit mode";
      mainScreen.classList.add("edit-mode");
      showToast("Tap icons to delete");
    } else {
      normalIcon.style.display = "block";
      activeIcon.style.display = "none";
      editModeBtn.classList.remove("active");
      editModeBtn.title = "Edit library";
      mainScreen.classList.remove("edit-mode");
    }

    renderGrid(); // Re-render to show/hide delete buttons
  });

  // ---- Sign-out ----
  signoutBtn.addEventListener("click", async () => {
    try {
      await signOut();
      stopThemeRefresh(); // Stop monitoring theme changes
      themeColors = null;
      allIcons = [];
      iconGrid.innerHTML = "";
      activeCategory = "All";
      activeQuery = "";
      showScreen("auth");
    } catch (err) {
      console.log("[Auth] Sign-out not available in dev mode");
    }
  });

  // ---- Update UI based on user role ----
  function updateUIForRole() {
    const uploadBtn = document.getElementById('upload-btn');
    const editModeBtn = document.getElementById('edit-mode-btn');
    const adminPanelBtn = document.getElementById('admin-panel-btn');

    // Show/hide buttons based on role
    if (currentUserRole === 'admin') {
      if (uploadBtn) uploadBtn.style.display = 'flex';
      if (editModeBtn) editModeBtn.style.display = 'flex';
      if (adminPanelBtn) adminPanelBtn.style.display = 'flex';
    } else {
      if (uploadBtn) uploadBtn.style.display = 'none';
      if (editModeBtn) editModeBtn.style.display = 'none';
      if (adminPanelBtn) adminPanelBtn.style.display = 'none';
    }

    // Update header with user info
    const userInfoContainer = document.getElementById('user-info-container');
    if (userInfoContainer && currentUserProfile) {
      userInfoContainer.innerHTML = `
        <span class="user-tenant">${currentUserProfile.tenant.name}</span>
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
          console.log('[Profile] User role:', currentUserRole, 'Tenant:', currentUserProfile.tenant.name);
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

    // Fetch icons
    allIcons = await fetchIconsFromAPI(accessToken);
    const categories = getCategories(allIcons);
    const clients = getClients(allIcons);
    renderTabs(categories);
    renderClientTabs(clients);
    renderGrid();

    // Expose for debugging
    window.__DEBUG_ICONS = allIcons;
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

  function populateClientSelect() {
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

      // Select the newly created client
      iconClientSelect.value = newClient.id;

      showToast(`Client "${newClient.name}" created - now upload icons to assign`);
    } catch (error) {
      console.error('[Clients] Error creating:', error);
      await customAlert(error.message, 'Error Creating Client');
    }
  }

  // ---- Bulk Upload ----
  uploadBtn.addEventListener("click", async () => {
    // Load clients when opening upload modal
    await fetchClients();
    uploadModal.classList.remove("hidden");
  });

  addClientBtn.addEventListener("click", addNewClient);

  closeUpload.addEventListener("click", () => {
    uploadModal.classList.add("hidden");
  });

  // Click outside modal to close
  uploadModal.addEventListener("click", (e) => {
    if (e.target === uploadModal) {
      uploadModal.classList.add("hidden");
    }
  });

  svgFileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    console.log("[Upload] Selected", files.length, "files");

    if (files.length === 0) return;

    const category = iconCategoryInput.value || "Custom";
    uploadedIcons = [];
    const failedFiles = []; // Track validation failures

    for (const file of files) {
      console.log("[Upload] Processing:", file.name, "Type:", file.type, "Size:", file.size);

      if (!file.name.endsWith('.svg')) {
        console.log("[Upload] Skipping non-SVG file:", file.name);
        failedFiles.push({ file: file.name, reason: "Not an SVG file" });
        continue;
      }

      try {
        let svgContent = await file.text();
        console.log("[Upload] Read file content, length:", svgContent.length);

        const iconName = file.name.replace('.svg', '').replace(/[-_]/g, ' ');
        const iconId = file.name.replace('.svg', '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Clean up SVG content
        svgContent = svgContent.trim();

        // Remove XML declaration and DOCTYPE if present
        svgContent = svgContent.replace(/<\?xml[^>]*\?>/g, '');
        svgContent = svgContent.replace(/<!DOCTYPE[^>]*>/g, '');
        svgContent = svgContent.trim();

        console.log("[Upload] After cleanup, length:", svgContent.length);
        console.log("[Upload] First 200 chars:", svgContent.substring(0, 200));

        // Extract existing viewBox or width/height to determine icon bounds
        const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
        const widthMatch = svgContent.match(/width=["']([^"']+)["']/);
        const heightMatch = svgContent.match(/height=["']([^"']+)["']/);

        if (!viewBoxMatch && (widthMatch || heightMatch)) {
          // Has width/height but no viewBox - create one
          const width = widthMatch ? parseFloat(widthMatch[1]) : 24;
          const height = heightMatch ? parseFloat(heightMatch[1]) : 24;
          console.log(`[Upload] Creating viewBox from width=${width}, height=${height}`);
          svgContent = svgContent.replace('<svg', `<svg viewBox="0 0 ${width} ${height}"`);
        } else if (!viewBoxMatch) {
          // No viewBox or dimensions - use default
          console.log("[Upload] Adding default viewBox 0 0 24 24");
          svgContent = svgContent.replace('<svg', '<svg viewBox="0 0 24 24"');
        }

        // Ensure xmlns is present
        if (!svgContent.includes('xmlns=')) {
          console.log("[Upload] Adding xmlns attribute");
          svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        // STRICT VALIDATION - REJECT FILES THAT DON'T MEET STANDARDS
        const finalViewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
        const strokeWidthMatch = svgContent.match(/stroke-width[:\s=]["']?([\d.]+)/);
        const hasStroke = svgContent.includes('stroke:') || svgContent.includes('stroke=');

        // Check for fill attributes (not allowed in stroke-based icon system)
        const hasFillAttribute = /fill=["'][^"']*["']/.test(svgContent) || /fill:\s*[^;}\s]+/.test(svgContent);
        const fillMatches = svgContent.match(/fill=["']([^"']*)["']/g) || svgContent.match(/fill:\s*([^;}\s]+)/g);

        // Filter out fill="none" which is acceptable
        const hasInvalidFill = fillMatches && fillMatches.some(match =>
          !match.includes('none') && !match.includes('fill:none')
        );

        // Validate viewBox is exactly 24x24
        if (!finalViewBoxMatch) {
          console.error(`[Upload] ✗ "${iconName}": Missing viewBox`);
          failedFiles.push({ file: file.name, reason: "Missing viewBox attribute" });
          continue;
        }

        const viewBox = finalViewBoxMatch[1];
        if (viewBox !== "0 0 24 24") {
          console.error(`[Upload] ✗ "${iconName}": Invalid viewBox "${viewBox}" (must be "0 0 24 24")`);
          failedFiles.push({ file: file.name, reason: `Invalid viewBox "${viewBox}" (must be "0 0 24 24")` });
          continue;
        }

        // Validate no fill attributes (stroke-based icons only)
        if (hasInvalidFill) {
          console.error(`[Upload] ✗ "${iconName}": Contains fill attributes (stroke-based icons only)`);
          failedFiles.push({ file: file.name, reason: "Contains fill attributes (use stroke-based icons only)" });
          continue;
        }

        // Passed all validations
        console.log(`[Upload] ✓ "${iconName}": Passed all validations`);

        // Auto-fix missing stroke-width
        if (hasStroke && !strokeWidthMatch) {
          console.warn(`[Upload] ⚠️  "${iconName}": Missing stroke-width, adding default 2px`);

          // Add stroke-width to style blocks
          svgContent = svgContent.replace(/(<style[\s\S]*?)(stroke-linecap|stroke-linejoin|stroke:)/g,
            (match, before, prop) => `${before}stroke-width: 2;\n            ${prop}`);

          console.log(`[Upload] ✓ "${iconName}": Auto-added stroke-width: 2px`);
        } else if (strokeWidthMatch) {
          const strokeWidth = parseFloat(strokeWidthMatch[1]);
          const isStandardStroke = strokeWidth >= 1.5 && strokeWidth <= 2.5;

          if (!isStandardStroke) {
            console.warn(`[Upload] ⚠️  "${iconName}": Non-standard stroke-width ${strokeWidth}px (expected 2px)`);
          } else {
            console.log(`[Upload] ✓ "${iconName}": Standard stroke-width ${strokeWidth}px`);
          }
        }

        uploadedIcons.push({
          id: iconId,
          name: iconName.charAt(0).toUpperCase() + iconName.slice(1),
          category: category,
          svg: svgContent
        });

        console.log("[Upload] ✓ Added icon:", iconName);
      } catch (err) {
        console.error("[Upload] ✗ Error reading file:", file.name, err);
        failedFiles.push({ file: file.name, reason: err.message || "Error reading file" });
      }
    }

    console.log("[Upload] Total icons imported:", uploadedIcons.length);
    console.log("[Upload] Failed files:", failedFiles.length);

    // Show validation summary
    if (failedFiles.length > 0) {
      console.warn("[Upload] Failed files:", failedFiles);
      const failedList = failedFiles.map(f => `• ${f.file}: ${f.reason}`).join('\n');
      await customAlert(
        `${failedFiles.length} file(s) failed validation:\n\n${failedList}\n\nRequired:\n✓ viewBox="0 0 24 24"\n✓ No fill attributes (stroke-based only)`,
        'Validation Failed'
      );
    }

    if (uploadedIcons.length > 0) {
      console.log("[Upload] Calling renderPreview()...");
      renderPreview();
      console.log("[Upload] Showing preview section...");
      previewSection.classList.remove("hidden");

      if (failedFiles.length > 0) {
        showToast(`${uploadedIcons.length} passed, ${failedFiles.length} failed validation`);
      }
    } else {
      console.log("[Upload] No valid SVG files found");
      showToast("No valid SVG files - check requirements");
    }
  });

  function renderPreview() {
    previewGrid.innerHTML = "";
    previewCount.textContent = uploadedIcons.length;

    console.log("[Preview] Rendering", uploadedIcons.length, "icons");

    uploadedIcons.forEach((icon, index) => {
      const div = document.createElement("div");
      div.className = "preview-icon";
      div.title = icon.name;

      console.log(`[Preview] Icon ${index}:`, icon.name, "SVG length:", icon.svg.length);

      // Use data URI with base64 encoding for maximum compatibility
      try {
        let svgData = icon.svg.trim();

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

    copyCodeBtn.disabled = true;
    copyCodeBtn.textContent = `Uploading ${uploadedIcons.length} icons...`;

    try {
      const token = await getAccessToken();
      let successCount = 0;

      for (const icon of uploadedIcons) {
        try {
          const res = await fetch(`${ICON_API_BASE}/icons`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: icon.id,
              name: icon.name,
              category: icon.category,
              svg: icon.svg,
              client_id: iconClientSelect.value || null
            })
          });

          if (res.ok) {
            successCount++;
          } else {
            const error = await res.json();
            console.error('[Upload] Failed:', icon.name, error);
          }
        } catch (err) {
          console.error('[Upload] Failed:', icon.name, err);
        }
      }

      // Reload icons from API to get updated list
      await loadIcons(token);

      showToast(`Uploaded ${successCount} of ${uploadedIcons.length} icons`);

      // Close modal and reset
      uploadModal.classList.add("hidden");
      uploadedIcons = [];
      previewSection.classList.add("hidden");
      svgFileInput.value = "";
    } catch (err) {
      console.error('[Upload] Error:', err);
      showToast(`Error: ${err.message}`);
    } finally {
      copyCodeBtn.disabled = false;
      copyCodeBtn.textContent = 'Upload to Library';
    }
  });

  await bootstrap();
});

} else {
  updateDebugStatus("Script already initialized, skipping duplicate load");
}
