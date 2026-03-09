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
  const toast          = document.getElementById("toast");
  const sizeBtns       = document.querySelectorAll(".size-btn");
  const colorBtns      = document.querySelectorAll(".color-btn");

  // ---- State ----
  let allIcons       = [];
  let activeCategory = "All";
  let activeQuery    = "";
  let selectedSize   = 48;   // px — inserted icon size
  let selectedColor  = "Accent1";  // PowerPoint theme color
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

      // Remove currentColor and fill="none" - we'll handle these via CSS
      modifiedContent = modifiedContent.replace(/stroke="currentColor"/g, '');
      modifiedContent = modifiedContent.replace(/fill="none"/g, '');

      // Add theme class to all shape elements
      const strokeClass = `${themeClass}_Stroke_v2`;
      modifiedContent = modifiedContent.replace(/<path /g, `<path class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<line /g, `<line class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<polyline /g, `<polyline class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<circle /g, `<circle class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<rect /g, `<rect class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<polygon /g, `<polygon class="${strokeClass}" `);
      modifiedContent = modifiedContent.replace(/<ellipse /g, `<ellipse class="${strokeClass}" `);

      // Build SVG with internal CSS style block - PowerPoint will override with theme color
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${selectedSize}" height="${selectedSize}" viewBox="0 0 24 24">
        <style>
          .${strokeClass} { stroke: ${fallbackColor}; fill: none; }
        </style>
        ${modifiedContent}
      </svg>`;
    } else {
      // For fill icons
      const fillClass = `${themeClass}_Fill_v2`;
      let modifiedContent = svgContent;
      modifiedContent = modifiedContent.replace(/<path /g, `<path class="${fillClass}" `);
      modifiedContent = modifiedContent.replace(/<circle /g, `<circle class="${fillClass}" `);
      modifiedContent = modifiedContent.replace(/<rect /g, `<rect class="${fillClass}" `);
      modifiedContent = modifiedContent.replace(/<polygon /g, `<polygon class="${fillClass}" `);
      modifiedContent = modifiedContent.replace(/<ellipse /g, `<ellipse class="${fillClass}" `);

      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${selectedSize}" height="${selectedSize}" viewBox="0 0 24 24">
        <style>
          .${fillClass} { fill: ${fallbackColor}; }
        </style>
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

  await bootstrap();
});
