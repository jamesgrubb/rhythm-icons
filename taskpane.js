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

Office.onReady(async ({ host }) => {
  updateDebugStatus(`Office.onReady fired! Host: ${host}`);
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
  const categoryTabs   = document.getElementById("category-tabs");
  const iconGrid       = document.getElementById("icon-grid");
  const emptyState     = document.getElementById("empty-state");
  const emptyQuery     = document.getElementById("empty-query");
  const resultCount    = document.getElementById("result-count");
  const toast                = document.getElementById("toast");
  const sizeBtns             = document.querySelectorAll(".size-btn");
  const colorBtns            = document.querySelectorAll(".color-btn");
  const circleBackgroundToggle = document.getElementById("circle-background-toggle");
  const uploadBtn            = document.getElementById("upload-btn");
  const uploadModal          = document.getElementById("upload-modal");
  const closeUpload          = document.getElementById("close-upload");
  const svgFileInput         = document.getElementById("svg-file-input");
  const iconCategoryInput    = document.getElementById("icon-category");
  const previewSection       = document.getElementById("preview-section");
  const previewGrid          = document.getElementById("preview-grid");
  const previewCount         = document.getElementById("preview-count");
  const copyCodeBtn          = document.getElementById("copy-code-btn");

  // ---- State ----
  let allIcons       = [];
  let activeCategory = "All";
  let activeQuery    = "";
  let selectedSize   = 48;   // px — inserted icon size
  let selectedColor  = "Accent1";  // PowerPoint theme color
  let circleBackground = false;  // Add circle background to icons
  let uploadedIcons  = [];  // Temporary storage for bulk uploaded icons
  let toastTimer     = null;

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

  // ---- Render ----
  function renderTabs(categories) {
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

  function renderGrid() {
    const visible = filterIcons(allIcons, { category: activeCategory, query: activeQuery });
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
      card.innerHTML = `${icon.svg}<span class="icon-name">${icon.name}</span>`;
      card.addEventListener("click", () => insertIcon(icon, card));
      iconGrid.appendChild(card);
    });
  }

  // ---- Insert icon into document ----
  async function insertIcon(icon, cardEl) {
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

  // ---- PowerPoint insertion: Insert SVG with theme color support ----
  async function insertIntoPowerPoint(icon) {
    console.log("[PPT] Preparing SVG with theme colors...");
    console.log("[PPT] Using theme color:", selectedColor);
    console.log("[PPT] Original SVG:", icon.svg.substring(0, 500));

    // Fallback colors for each theme color (Office default theme)
    const themeColorMap = {
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

    const fallbackColor = themeColorMap[selectedColor] || "#4472C4";
    const themeClass = `MsftOfcThm_${selectedColor}`;

    // Prepare SVG with proper structure and theme color classes
    let svg = icon.svg;

    // Extract the SVG content (between tags)
    const svgContentMatch = svg.match(/<svg[^>]*>(.*?)<\/svg>/s);
    const svgContent = svgContentMatch ? svgContentMatch[1] : svg;

    // Determine if icon uses stroke or fill
    const usesStroke = svg.includes('stroke="currentColor"') || svg.includes('stroke-width');

    if (usesStroke) {
      // For stroke icons: Use internal CSS with theme class (BrightCarbon method)
      let modifiedContent = svgContent;
      const strokeClass = `${themeClass}_Stroke_v2`;

      // Extract stroke-width and other properties from existing styles
      const styleMatch = modifiedContent.match(/<style[\s\S]*?<\/style>/);
      let strokeWidth = '1.5'; // default
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
            stroke-width: ${strokeWidth}px;
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

      // Extract properties from existing styles (though fill icons rarely have stroke-width)
      const styleMatch = modifiedContent.match(/<style[\s\S]*?<\/style>/);
      let strokeWidth = '';
      if (styleMatch) {
        const styleContent = styleMatch[0];
        const swMatch = styleContent.match(/stroke-width:\s*([\d.]+)px/);
        if (swMatch) strokeWidth = `stroke-width: ${swMatch[1]}px;`;
      }

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
          .${fillClass} { fill: ${fallbackColor}; ${strokeWidth} }
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

  // ---- Sign-in ----
  signinBtn.addEventListener("click", async () => {
    signinBtn.disabled = true;
    signinBtn.textContent = "Signing in…";
    setAuthError("");
    try {
      const token = await signIn();
      await loadIcons(token);
      showScreen("main");
    } catch (err) {
      console.error("[Auth] Sign-in failed:", err);
      setAuthError("Sign-in failed. Please try again.");
      signinBtn.disabled = false;
      signinBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11.5 2.75h-8a.75.75 0 00-.75.75v17a.75.75 0 00.75.75h8M16 7.5l4.5 4.5-4.5 4.5M20.5 12h-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Sign in with Microsoft`;
    }
  });

  // ---- Sign-out ----
  signoutBtn.addEventListener("click", async () => {
    try {
      await signOut();
      allIcons = [];
      iconGrid.innerHTML = "";
      activeCategory = "All";
      activeQuery = "";
      showScreen("auth");
    } catch (err) {
      console.log("[Auth] Sign-out not available in dev mode");
    }
  });

  // ---- Load icons ----
  async function loadIcons(accessToken) {
    allIcons = await fetchIconsFromAPI(accessToken);
    const categories = getCategories(allIcons);
    renderTabs(categories);
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
      await loadIcons(null); // null token = uses SAMPLE_ICONS fallback
      updateDebugStatus(`${allIcons.length} icons loaded`);
      updateDebugStatus("Switching to main screen");
      showScreen("main");
      return;
    }

    // Production auth flow
    try {
      await initMsal();
      const token = await tryRestoreSession();
      if (token) {
        await loadIcons(token);
        showScreen("main");
      } else {
        showScreen("auth");
      }
    } catch (err) {
      console.error("[Bootstrap] Error:", err);
      showScreen("auth");
    }
  }

  // ---- Bulk Upload ----
  uploadBtn.addEventListener("click", () => {
    uploadModal.classList.remove("hidden");
  });

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

    for (const file of files) {
      console.log("[Upload] Processing:", file.name, "Type:", file.type, "Size:", file.size);

      if (!file.name.endsWith('.svg')) {
        console.log("[Upload] Skipping non-SVG file:", file.name);
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

        // AUTO-FIX AND VALIDATE DESIGN SYSTEM STANDARDS
        const finalViewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
        const strokeWidthMatch = svgContent.match(/stroke-width[:\s=]["']?([\d.]+)/);
        const hasStroke = svgContent.includes('stroke:') || svgContent.includes('stroke=');

        // Validate viewBox
        if (finalViewBoxMatch) {
          const viewBox = finalViewBoxMatch[1];
          const isStandardViewBox = viewBox === "0 0 24 24";

          if (!isStandardViewBox) {
            console.warn(`[Upload] ⚠️  "${iconName}": Non-standard viewBox "${viewBox}" (expected "0 0 24 24")`);
          } else {
            console.log(`[Upload] ✓ "${iconName}": Standard viewBox`);
          }
        }

        // Auto-fix missing stroke-width
        if (hasStroke && !strokeWidthMatch) {
          console.warn(`[Upload] ⚠️  "${iconName}": Missing stroke-width, adding default 1.5px`);

          // Add stroke-width to style blocks
          svgContent = svgContent.replace(/(<style[\s\S]*?)(stroke-linecap|stroke-linejoin|stroke:)/g,
            (match, before, prop) => `${before}stroke-width: 1.5;\n            ${prop}`);

          console.log(`[Upload] ✓ "${iconName}": Auto-added stroke-width: 1.5px`);
        } else if (strokeWidthMatch) {
          const strokeWidth = parseFloat(strokeWidthMatch[1]);
          const isStandardStroke = strokeWidth >= 1.0 && strokeWidth <= 2.0;

          if (!isStandardStroke) {
            console.warn(`[Upload] ⚠️  "${iconName}": Non-standard stroke-width ${strokeWidth}px (expected 1.5px)`);
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
      }
    }

    console.log("[Upload] Total icons imported:", uploadedIcons.length);

    if (uploadedIcons.length > 0) {
      console.log("[Upload] Calling renderPreview()...");
      renderPreview();
      console.log("[Upload] Showing preview section...");
      previewSection.classList.remove("hidden");
    } else {
      console.log("[Upload] No valid SVG files found");
      showToast("No valid SVG files found");
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

  copyCodeBtn.addEventListener("click", () => {
    const code = uploadedIcons.map(icon => {
      // Escape backticks and backslashes in SVG content
      const escapedSvg = icon.svg.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
      // Escape double quotes in strings
      const escapedName = icon.name.replace(/"/g, '\\"');
      const escapedCategory = icon.category.replace(/"/g, '\\"');

      return `  { id: "${icon.id}", name: "${escapedName}", category: "${escapedCategory}", svg: \`${escapedSvg}\` }`;
    }).join(',\n');

    // Show preview in console for verification
    console.log("[Upload] Generated code:");
    console.log(code);

    navigator.clipboard.writeText(code).then(() => {
      // Add uploaded icons to main library
      allIcons = [...allIcons, ...uploadedIcons];

      // Refresh categories and grid
      const categories = getCategories(allIcons);
      renderTabs(categories);
      renderGrid();

      showToast(`${uploadedIcons.length} icons added to library!`);

      // Close modal and reset
      uploadModal.classList.add("hidden");
      uploadedIcons = [];
      previewSection.classList.add("hidden");
      svgFileInput.value = "";
    }).catch(err => {
      console.error("Copy failed:", err);
      showToast("Copy failed");
    });
  });

  await bootstrap();
});
