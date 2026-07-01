// =============================================
//  lib/svgProcess.js — per-icon SVG extraction
//  - Maps Gemini pixel-space boxes → SVG coordinate space
//  - Crops/normalizes each icon to viewBox "0 0 24 24"
//  - Classifies stroke-based vs outlined (filled) icons
//  Dependency: svgson (SVG ⇄ JSON AST)
// =============================================

const { parse, stringify } = require("svgson");
const svgpath = require("svgpath");

const DRAW_TAGS = new Set(["path", "line", "polyline", "polygon", "rect", "circle", "ellipse"]);
const TARGET = 24;       // library viewBox is "0 0 24 24"
const CONTENT = 20;      // icon content size (2-unit padding)
const STROKE_WIDTH = 2;  // library convention

// ---------------------------------------------
// Bake an affine (independent X/Y scale + translate, so a negative sy flips
// the PostScript y-up axis to SVG y-down) into an element's geometry, then
// stamp the canonical library paint (literal stroke-width 2, no fill,
// themable currentColor stroke). The result is in true 0–24 coordinates with
// NO transform — matching the curated-library convention the PowerPoint
// theme-recolor path expects, so segmented icons behave like hand-authored ones.
// ---------------------------------------------
function bakeTransform(node, sx, sy, tx, ty, effective) {
  const a = { ...node.attributes };
  const s = (n) => String(+(+n).toFixed(3));
  const px = (x) => Number(x) * sx + tx;
  const py = (y) => Number(y) * sy + ty;
  const asx = Math.abs(sx), asy = Math.abs(sy);

  switch (node.name) {
    case "path":
      if (a.d) a.d = svgpath(a.d).matrix([sx, 0, 0, sy, tx, ty]).round(3).toString();
      break;
    case "line": {
      a.x1 = s(px(a.x1 || 0)); a.y1 = s(py(a.y1 || 0));
      a.x2 = s(px(a.x2 || 0)); a.y2 = s(py(a.y2 || 0));
      break;
    }
    case "polyline":
    case "polygon":
      if (a.points) {
        const nums = (a.points.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi) || []).map(Number);
        const out = [];
        for (let i = 0; i + 1 < nums.length; i += 2) out.push(`${s(px(nums[i]))},${s(py(nums[i + 1]))}`);
        a.points = out.join(" ");
      }
      break;
    case "rect": {
      // transform both corners; a y-flip swaps top/bottom so recompute min + size
      const x0 = px(a.x || 0), x1 = px((Number(a.x) || 0) + (Number(a.width) || 0));
      const y0 = py(a.y || 0), y1 = py((Number(a.y) || 0) + (Number(a.height) || 0));
      a.x = s(Math.min(x0, x1)); a.y = s(Math.min(y0, y1));
      if (a.width != null) a.width = s(Math.abs(x1 - x0));
      if (a.height != null) a.height = s(Math.abs(y1 - y0));
      if (a.rx != null) a.rx = s((Number(a.rx) || 0) * asx);
      if (a.ry != null) a.ry = s((Number(a.ry) || 0) * asy);
      break;
    }
    case "circle": {
      a.cx = s(px(a.cx || 0)); a.cy = s(py(a.cy || 0));
      a.r = s((Number(a.r) || 0) * asx);
      break;
    }
    case "ellipse": {
      a.cx = s(px(a.cx || 0)); a.cy = s(py(a.cy || 0));
      a.rx = s((Number(a.rx) || 0) * asx);
      a.ry = s((Number(a.ry) || 0) * asy);
      break;
    }
  }

  a.fill = "none";
  a.stroke = "currentColor";
  // Preserve the source stroke weight: scale the element's own stroke-width by
  // the same factor as its geometry, so the icon keeps its designed line
  // weight (dense icons stay thin) instead of being forced to a fixed value.
  const swRaw = parseFloat(effective["stroke-width"]);
  a["stroke-width"] = String(+(((swRaw > 0 ? swRaw : 8)) * Math.abs(sx)).toFixed(3));
  a["stroke-linecap"] = effective["stroke-linecap"] || "round";
  a["stroke-linejoin"] = effective["stroke-linejoin"] || "round";
  delete a.transform;
  delete a.id;
  delete a.class;

  return { ...node, attributes: a, children: node.children || [] };
}

// ---------------------------------------------
// Approximate element bounds from coordinates.
// pstoedit emits absolute coordinates, so collecting all numbers in
// coordinate attributes gives a usable (slightly loose) bounding box.
// ---------------------------------------------
function elementBounds(node) {
  const xs = [];
  const ys = [];
  const a = node.attributes || {};

  const pushPairs = (str) => {
    const nums = (str.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi) || []).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      xs.push(nums[i]);
      ys.push(nums[i + 1]);
    }
  };

  switch (node.name) {
    case "path":
      if (a.d) pushPairs(a.d.replace(/[a-zA-Z]/g, " "));
      break;
    case "polyline":
    case "polygon":
      if (a.points) pushPairs(a.points);
      break;
    case "line":
      xs.push(Number(a.x1) || 0, Number(a.x2) || 0);
      ys.push(Number(a.y1) || 0, Number(a.y2) || 0);
      break;
    case "rect": {
      const x = Number(a.x) || 0, y = Number(a.y) || 0;
      xs.push(x, x + (Number(a.width) || 0));
      ys.push(y, y + (Number(a.height) || 0));
      break;
    }
    case "circle":
    case "ellipse": {
      const cx = Number(a.cx) || 0, cy = Number(a.cy) || 0;
      const rx = Number(a.rx ?? a.r) || 0, ry = Number(a.ry ?? a.r) || 0;
      xs.push(cx - rx, cx + rx);
      ys.push(cy - ry, cy + ry);
      break;
    }
    default:
      return null;
  }

  if (xs.length === 0) return null;
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function boundsIntersect(b, box) {
  return b.minX <= box.maxX && b.maxX >= box.minX && b.minY <= box.maxY && b.maxY >= box.minY;
}

// Flatten the AST into drawing elements, carrying inherited group attributes
// (fill/stroke set on <g> wrappers, common in pstoedit output).
function collectDrawElements(node, inherited = {}, out = []) {
  const merged = { ...inherited, ...(node.attributes || {}) };
  if (DRAW_TAGS.has(node.name)) {
    out.push({ node, effective: merged });
  }
  for (const child of node.children || []) {
    collectDrawElements(child, node.name === "svg" ? {} : merged, out);
  }
  return out;
}

// ---------------------------------------------
// Stroke-vs-outline classification (deterministic)
// outlined  = any element painted by fill (fill set, not "none")
// valid     = every element stroke-painted with fill none/absent
// ---------------------------------------------
function classifyElements(elements) {
  let hasFillPaint = false;
  let hasStrokePaint = false;

  for (const { effective } of elements) {
    const fill = (effective.fill || "").trim().toLowerCase();
    const stroke = (effective.stroke || "").trim().toLowerCase();
    const fillPaints = fill && fill !== "none" && fill !== "transparent";
    const strokePaints = stroke && stroke !== "none";

    if (fillPaints) hasFillPaint = true;
    if (strokePaints) hasStrokePaint = true;
  }

  if (hasFillPaint && !hasStrokePaint) return "outlined";
  if (hasFillPaint && hasStrokePaint) return "ambiguous";
  if (hasStrokePaint) return "valid";
  // Nothing explicitly painted — SVG default paint is black fill → outlined
  return "outlined";
}

function parseViewBox(svgNode) {
  const vb = svgNode.attributes?.viewBox;
  if (vb) {
    const [x, y, w, h] = vb.split(/[\s,]+/).map(Number);
    if (w > 0 && h > 0) return { x, y, width: w, height: h };
  }
  const w = parseFloat(svgNode.attributes?.width);
  const h = parseFloat(svgNode.attributes?.height);
  if (w > 0 && h > 0) return { x: 0, y: 0, width: w, height: h };
  return null;
}

// ---------------------------------------------
// Group elements into icons by spatial proximity (union-find on bbox gap).
// An icon's strokes are tightly packed; gaps between icons are larger. This
// is far more robust than mapping AI boxes onto geometry, because it uses
// only RELATIVE distances — immune to the unreliable pstoedit viewBox/flip.
// ---------------------------------------------
function clusterByProximity(elements, gap) {
  const parent = elements.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i].bounds, b = elements[j].bounds;
      const dx = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
      const dy = Math.max(0, a.minY - b.maxY, b.minY - a.maxY);
      if (Math.hypot(dx, dy) < gap) { const ra = find(i), rb = find(j); if (ra !== rb) parent[ra] = rb; }
    }
  }
  const groups = new Map();
  elements.forEach((el, i) => { const r = find(i); (groups.get(r) || groups.set(r, []).get(r)).push(el); });
  return [...groups.values()];
}

function clusterBounds(cluster) {
  return {
    minX: Math.min(...cluster.map((e) => e.bounds.minX)),
    minY: Math.min(...cluster.map((e) => e.bounds.minY)),
    maxX: Math.max(...cluster.map((e) => e.bounds.maxX)),
    maxY: Math.max(...cluster.map((e) => e.bounds.maxY)),
  };
}

/**
 * Extract per-icon candidates from a converted sheet.
 *
 * Strategy: cluster the artwork's stroke elements into icons by proximity
 * (each cluster = one complete icon), classify, normalize each to a flat
 * 0–24 / stroke-width-2 / currentColor SVG (matching curated icons), then
 * name in reading order from the AI detections. The AI boxes are NOT used
 * for cropping — they distort badly on wide sheets — only for naming/count.
 *
 * @param {object} opts
 *   svgText      — pstoedit output SVG (sheet of icons)
 *   detections   — [{ box_2d, label, tags }] (names, reading order)
 *   boundingBox  — EPS %%BoundingBox {x,y,width,height}; defines y-up flip + clip
 *   layout       — { iconGrid:[ymin,xmin,ymax,xmax], panels:[...], iconCount } from Gemini
 *                  (image space 0-1000). Used to discard branding/panels and
 *                  to reconcile the segmentation toward the real icon count.
 * @returns [{ name, svg, tags, stroke_status }]
 */
async function extractCandidates({ svgText, detections, pngWidth, pngHeight, boundingBox, layout }) {
  const ast = await parse(svgText);

  let elements = collectDrawElements(ast)
    .map((el) => ({ ...el, bounds: elementBounds(el.node) }))
    .filter((el) => el.bounds)
    .filter((el) => (el.node.attributes?.id || "").toLowerCase() !== "background");
  if (elements.length === 0) throw new Error("Converted SVG contains no drawable elements");

  // ---- Coordinate space ----
  // pstoedit emits EPS user-space points = the BoundingBox space Ghostscript
  // rendered from. EPS is y-up; the library SVG is y-down → flip. Without a
  // BoundingBox, fall back to the element extent (no flip).
  let space;
  if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
    space = { x: boundingBox.x || 0, y: boundingBox.y || 0, width: boundingBox.width, height: boundingBox.height, flipY: true };
  } else {
    const ex = {
      minX: Math.min(...elements.map((e) => e.bounds.minX)), minY: Math.min(...elements.map((e) => e.bounds.minY)),
      maxX: Math.max(...elements.map((e) => e.bounds.maxX)), maxY: Math.max(...elements.map((e) => e.bounds.maxY)),
    };
    space = { x: ex.minX, y: ex.minY, width: (ex.maxX - ex.minX) || 1, height: (ex.maxY - ex.minY) || 1, flipY: false };
  }

  // Clip off-artboard junk (pstoedit keeps what Ghostscript clips)
  const mX = space.width * 0.02, mY = space.height * 0.02;
  elements = elements.filter((el) =>
    el.bounds.maxX >= space.x - mX && el.bounds.minX <= space.x + space.width + mX &&
    el.bounds.maxY >= space.y - mY && el.bounds.minY <= space.y + space.height + mY
  );
  // Drop full-page frames/borders AND sheet-spanning divider lines: an element
  // spanning most of EITHER dimension would bridge every cluster into one.
  if (elements.length > 4) {
    elements = elements.filter((el) =>
      !((el.bounds.maxX - el.bounds.minX) > 0.9 * space.width || (el.bounds.maxY - el.bounds.minY) > 0.9 * space.height)
    );
  }
  // Keep only stroke-painted elements — drops filled caption text/titles, and
  // means each cluster is genuine stroke-icon content.
  const strokeEls = elements.filter((el) => {
    const s = (el.effective.stroke || "").trim().toLowerCase();
    return s && s !== "none";
  });
  // If nothing is stroke-painted, the asset is outlined/filled — surface that.
  let workingEls = strokeEls.length ? strokeEls : elements;
  if (workingEls.length === 0) throw new Error("No drawable elements remain after clipping");

  // ---- Discard surplus graphics (branding / info panels) ----
  // Gemini's layout pass reports (in image space, y-down) where the real icons
  // are (iconGrid) and where branding/panels are. Map those to EPS space and
  // drop any stroke element whose centre is outside the grid or inside a panel.
  const toEps = (b) => {
    const [ymin, xmin, ymax, xmax] = b;
    return {
      minX: space.x + (xmin / 1000) * space.width,
      maxX: space.x + (xmax / 1000) * space.width,
      minY: space.flipY ? space.y + space.height - (ymax / 1000) * space.height : space.y + (ymin / 1000) * space.height,
      maxY: space.flipY ? space.y + space.height - (ymin / 1000) * space.height : space.y + (ymax / 1000) * space.height,
    };
  };
  const centreIn = (el, box) => {
    const cx = (el.bounds.minX + el.bounds.maxX) / 2, cy = (el.bounds.minY + el.bounds.maxY) / 2;
    return cx >= box.minX && cx <= box.maxX && cy >= box.minY && cy <= box.maxY;
  };
  if (layout && Array.isArray(layout.panels) && layout.panels.length) {
    // Pad panels slightly to catch panel content near their edges.
    const panels = layout.panels.map((p) => {
      const e = toEps(p), padX = (e.maxX - e.minX) * 0.05, padY = (e.maxY - e.minY) * 0.05;
      return { minX: e.minX - padX, maxX: e.maxX + padX, minY: e.minY - padY, maxY: e.maxY + padY };
    });
    const kept = workingEls.filter((el) => !panels.some((p) => centreIn(el, p)));
    if (kept.length >= workingEls.length * 0.3) workingEls = kept; // guard against an over-broad panel box wiping everything
  }
  if (layout && Array.isArray(layout.iconGrid) && layout.iconGrid.length === 4) {
    const g = toEps(layout.iconGrid);
    // Gemini compresses boxes on wide sheets, so only trust the grid for the
    // panel-side cull: keep a generous margin and never drop the majority.
    const padX = (g.maxX - g.minX) * 0.08, padY = (g.maxY - g.minY) * 0.08;
    const grid = { minX: g.minX - padX, maxX: g.maxX + padX, minY: g.minY - padY, maxY: g.maxY + padY };
    const kept = workingEls.filter((el) => centreIn(el, grid));
    if (kept.length >= workingEls.length * 0.5) workingEls = kept;
  }
  if (workingEls.length === 0) throw new Error("No drawable elements remain after discarding panels");

  // Adaptive clustering gap: a fraction of typical icon size. Median element
  // height approximates icon scale; gap well below that joins an icon's
  // strokes without merging neighbours.
  const heights = workingEls.map((e) => e.bounds.maxY - e.bounds.minY).sort((a, b) => a - b);
  const medH = heights[heights.length >> 1] || space.height / 8;
  const gap = Math.min(250, Math.max(40, medH * 0.15));

  let clusters = clusterByProximity(workingEls, gap);

  // Drop size outliers: the title/branding block (much larger than an icon)
  // and stray noise (much smaller). Median of the cluster max-dimension.
  const dims = clusters.map((c) => { const b = clusterBounds(c); return Math.max(b.maxX - b.minX, b.maxY - b.minY); }).sort((a, b) => a - b);
  const medDim = dims[dims.length >> 1] || 1;
  clusters = clusters.filter((c) => {
    const b = clusterBounds(c);
    const d = Math.max(b.maxX - b.minX, b.maxY - b.minY);
    return d > medDim * 0.3 && d < medDim * 2.4;
  });
  if (clusters.length === 0) throw new Error("No icon-sized clusters found in the sheet");

  // ---- Reconcile toward the AI icon count (whole-but-fewer bias) ----
  // A cluster spanning ~2 grid cells is two icons merged. Split it ONLY at a
  // clear internal gap along its long axis — never force a split that would
  // create fragments. Recurse so a triple can split twice.
  const splitOnGap = (cluster) => {
    const b = clusterBounds(cluster);
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    if (Math.max(w, h) <= medDim * 1.55) return [cluster]; // icon-sized → keep
    const horiz = w >= h;
    const sorted = cluster.slice().sort((p, q) =>
      horiz ? ((p.bounds.minX + p.bounds.maxX) - (q.bounds.minX + q.bounds.maxX))
            : ((p.bounds.minY + p.bounds.maxY) - (q.bounds.minY + q.bounds.maxY)));
    let bestGap = 0, bestAt = -1;
    for (let i = 0; i < sorted.length - 1; i++) {
      const aEnd = horiz ? sorted[i].bounds.maxX : sorted[i].bounds.maxY;
      const bStart = horiz ? sorted[i + 1].bounds.minX : sorted[i + 1].bounds.minY;
      const g = bStart - aEnd;
      if (g > bestGap) { bestGap = g; bestAt = i; }
    }
    // Require a genuine gap (well above the intra-icon clustering gap)
    if (bestAt < 0 || bestGap < gap * 1.4) return [cluster];
    return [...splitOnGap(sorted.slice(0, bestAt + 1)), ...splitOnGap(sorted.slice(bestAt + 1))];
  };
  clusters = clusters.flatMap(splitOnGap).filter((c) => {
    const b = clusterBounds(c);
    return Math.max(b.maxX - b.minX, b.maxY - b.minY) > medDim * 0.3; // drop slivers from splits
  });

  // Reading order: top→bottom rows (EPS y-up → high maxY first), then left→right
  clusters.sort((A, B) => {
    const a = clusterBounds(A), b = clusterBounds(B);
    if (space.flipY ? (Math.abs(b.maxY - a.maxY) > medDim * 0.6) : (Math.abs(a.minY - b.minY) > medDim * 0.6)) {
      return space.flipY ? b.maxY - a.maxY : a.minY - b.minY;
    }
    return a.minX - b.minX;
  });

  // AI labels/tags in reading order, matched to clusters by index
  const names = detections.map((d) => ({
    label: d.label || "icon",
    tags: Array.isArray(d.tags) ? d.tags : [],
  }));

  const candidates = [];
  const usedNames = new Set();

  clusters.forEach((members, idx) => {
    const b = clusterBounds(members);
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    if (w <= 0 || h <= 0) return;

    const stroke_status = classifyElements(members); // stroke-only → 'valid'

    const scale = CONTENT / Math.max(w, h);
    // EPS y-up → library y-down: flip Y so the icon's top (maxY) maps to the
    // small-y top of the 0–24 viewBox.
    const sx = scale, sy = space.flipY ? -scale : scale;
    const tx = (TARGET - w * scale) / 2 - b.minX * sx;
    const ty = space.flipY
      ? (TARGET - h * scale) / 2 + b.maxY * scale
      : (TARGET - h * scale) / 2 - b.minY * scale;

    const children = members.map(({ node, effective }) => bakeTransform(node, sx, sy, tx, ty, effective));
    const iconAst = {
      name: "svg", type: "element", value: "",
      attributes: { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none" },
      children,
    };

    const meta = names[idx] || { label: "icon", tags: [] };
    let name = meta.label;
    let n = 2;
    while (usedNames.has(name)) name = `${meta.label}-${n++}`;
    usedNames.add(name);

    candidates.push({ name, svg: stringify(iconAst), tags: meta.tags, stroke_status });
  });

  return candidates;
}

// =============================================
//  GROUPED-SVG path — the accurate route.
//  An original Illustrator SVG keeps each icon as its own top-level <g>, so we
//  segment by group (no heuristics) and normalize each to the flat 0-24 /
//  currentColor / preserved-weight form. EPS conversion destroys this grouping,
//  which is why the EPS path can only ever be heuristic.
// =============================================

// Parse a <style> block into { className: { 'stroke-width':..., stroke:..., fill:... } }
function parseStyleClasses(svgText) {
  const map = {};
  const styleBlocks = svgText.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of styleBlocks) {
    const css = block.replace(/<\/?style[^>]*>/gi, "");
    // selectors like ".cls-1, .cls-2 { props }"
    const ruleRe = /([^{}]+)\{([^}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(css))) {
      const selectors = m[1].split(",").map((s) => s.trim());
      const props = {};
      for (const decl of m[2].split(";")) {
        const [k, v] = decl.split(":").map((x) => (x || "").trim());
        if (k) props[k.toLowerCase()] = v;
      }
      for (const sel of selectors) {
        const cm = sel.match(/\.([A-Za-z0-9_-]+)/);
        if (cm) map[cm[1]] = { ...(map[cm[1]] || {}), ...props };
      }
    }
  }
  return map;
}

// Resolve an element's effective paint (class styles + inline attrs).
function effectivePaint(node, classMap, inherited) {
  const a = node.attributes || {};
  let style = { ...inherited };
  (a.class || "").split(/\s+/).filter(Boolean).forEach((c) => { if (classMap[c]) style = { ...style, ...classMap[c] }; });
  // inline style="" then presentation attributes win
  if (a.style) for (const decl of a.style.split(";")) { const [k, v] = decl.split(":").map((x) => (x || "").trim()); if (k) style[k.toLowerCase()] = v; }
  for (const k of ["stroke", "fill", "stroke-width", "stroke-linecap", "stroke-linejoin"]) if (a[k] != null) style[k] = a[k];
  return style;
}

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

// Convert any drawable element to an SVG path `d` string (so a single code path
// can bake transforms — including rotation — via svgpath matrices).
function shapeToPath(node) {
  const a = node.attributes || {};
  switch (node.name) {
    case "path": return a.d || "";
    case "line": return `M${num(a.x1)} ${num(a.y1)}L${num(a.x2)} ${num(a.y2)}`;
    case "polyline":
    case "polygon": {
      const nums = (a.points || "").match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi);
      if (!nums || nums.length < 4) return "";
      let d = `M${nums[0]} ${nums[1]}`;
      for (let i = 2; i + 1 < nums.length; i += 2) d += `L${nums[i]} ${nums[i + 1]}`;
      return node.name === "polygon" ? d + "Z" : d;
    }
    case "rect": { const x = num(a.x), y = num(a.y), w = num(a.width), h = num(a.height); return w && h ? `M${x} ${y}H${x + w}V${y + h}H${x}Z` : ""; }
    case "circle": { const cx = num(a.cx), cy = num(a.cy), r = num(a.r); return r ? `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z` : ""; }
    case "ellipse": { const cx = num(a.cx), cy = num(a.cy), rx = num(a.rx), ry = num(a.ry); return rx && ry ? `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z` : ""; }
    default: return "";
  }
}

// Bounds of a path `d` via svgpath segment iteration (handles H/V/arc/curve
// command syntax correctly, unlike naive number-pairing). Uses segment
// endpoints + control points — a tight-enough box for centering/fitting.
function pathBounds(d) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const upd = (x, y) => {
    if (typeof x === "number" && isFinite(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    if (typeof y === "number" && isFinite(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  };
  try {
    svgpath(d).abs().unarc().iterate((seg, i, x, y) => {
      const cmd = seg[0];
      if (cmd === "H") upd(seg[1], y);
      else if (cmd === "V") upd(x, seg[1]);
      else if (cmd === "Z" || cmd === "z") { /* no coords */ }
      else {
        // M/L/T: [x,y]; Q/S: [..,x,y]; C: [x1,y1,x2,y2,x,y] — all params are
        // coordinate pairs after unarc(), so walk them in pairs.
        for (let k = 1; k + 1 < seg.length; k += 2) upd(seg[k], seg[k + 1]);
      }
    });
  } catch { return null; }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

/**
 * Extract one candidate per top-level icon group of an original (grouped) SVG.
 * @param {object} opts
 *   svgText    — the original SVG
 *   detections — [{label, tags}] for naming in reading order (optional)
 *   layout     — { panels:[[ymin,xmin,ymax,xmax] 0-1000] } to drop branding (optional)
 * @returns [{ name, svg, tags, stroke_status: 'valid' }]
 */
async function extractFromGroups({ svgText, detections = [], layout }) {
  const ast = await parse(svgText);
  const vb = parseViewBox(ast);
  if (!vb) throw new Error("SVG has no usable viewBox");
  const classMap = parseStyleClasses(svgText);

  // Find the level that actually holds the icons. Some sheets keep each icon
  // as a top-level <g>; others wrap all icons inside one container <g> (or
  // nest deeper). The icon container is the node with the most direct <g>
  // children anywhere in the tree — its children are the per-icon groups.
  let topGroups = [];
  (function findIconLevel(node) {
    const gs = (node.children || []).filter((c) => c.name === "g");
    if (gs.length > topGroups.length) topGroups = gs;
    for (const g of gs) findIconLevel(g);
  })(ast);
  if (topGroups.length === 0) throw new Error("SVG has no groups to segment by");

  // Flatten a group → absolute baked sub-paths (transforms applied), carrying
  // each element's effective stroke-width. Returns { paths:[{d, sw}], bounds }.
  const flattenGroup = (group) => {
    const paths = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    (function walk(node, inheritedTf, inheritedStyle) {
      const tf = (inheritedTf ? inheritedTf + " " : "") + (node.attributes?.transform || "");
      const style = effectivePaint(node, classMap, inheritedStyle);
      if (DRAW_TAGS.has(node.name)) {
        const stroke = (style.stroke || "").trim().toLowerCase();
        const sw = parseFloat(style["stroke-width"]);
        // keep only stroke-painted geometry (drops fills/branding)
        if (stroke && stroke !== "none" && sw > 0) {
          let d = shapeToPath(node);
          if (d) {
            try { d = svgpath(d).transform(tf.trim() || "translate(0 0)").abs().round(3).toString(); } catch { d = ""; }
            if (d) {
              const b = pathBounds(d);
              if (b) { minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY); maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY); }
              paths.push({ d, sw });
            }
          }
        }
      }
      for (const c of node.children || []) walk(c, tf, style);
    })(group, "", {});
    const bounds = minX === Infinity ? null : { minX, minY, maxX, maxY };
    return { paths, bounds };
  };

  // Panel regions (image space 0-1000) → viewBox space for discarding branding.
  const panelBoxes = (layout && Array.isArray(layout.panels) ? layout.panels : []).map((p) => {
    const [ymin, xmin, ymax, xmax] = p;
    return { minX: vb.x + (xmin / 1000) * vb.width, maxX: vb.x + (xmax / 1000) * vb.width, minY: vb.y + (ymin / 1000) * vb.height, maxY: vb.y + (ymax / 1000) * vb.height };
  });
  const centreInPanel = (b) => {
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    return panelBoxes.some((p) => cx >= p.minX && cx <= p.maxX && cy >= p.minY && cy <= p.maxY);
  };

  // Collect icon groups (have stroke geometry, sane size, not in a panel)
  let icons = topGroups.map(flattenGroup).filter((g) => g.paths.length && g.bounds);
  const dims = icons.map((g) => Math.max(g.bounds.maxX - g.bounds.minX, g.bounds.maxY - g.bounds.minY)).sort((a, b) => a - b);
  const medDim = dims[dims.length >> 1] || 1;
  icons = icons.filter((g) => {
    const d = Math.max(g.bounds.maxX - g.bounds.minX, g.bounds.maxY - g.bounds.minY);
    return d > medDim * 0.3 && d < medDim * 2.4 && !centreInPanel(g.bounds);
  });
  if (icons.length === 0) throw new Error("No icon groups found in the SVG");

  // Reading order: top→bottom (y-down), then left→right
  icons.sort((a, b) => {
    if (Math.abs(a.bounds.minY - b.bounds.minY) > medDim * 0.5) return a.bounds.minY - b.bounds.minY;
    return a.bounds.minX - b.bounds.minX;
  });

  // Names come from a Gemini pass over a render of THIS SVG, so detection
  // boxes share the icons' normalized positions. Match each group to the
  // nearest detection by position (not by index) — counts differ, so an
  // index zip would drift every name after the first mismatch.
  const dets = detections
    .map((d) => {
      const bb = d.box_2d || d.box || d.bbox;
      if (!Array.isArray(bb) || bb.length !== 4) return null;
      return { cx: (bb[1] + bb[3]) / 2 / 1000, cy: (bb[0] + bb[2]) / 2 / 1000, label: d.label || "icon", tags: Array.isArray(d.tags) ? d.tags : [], used: false };
    })
    .filter(Boolean);

  const used = new Set();
  const candidates = [];

  icons.forEach((g) => {
    const b = g.bounds, w = b.maxX - b.minX, h = b.maxY - b.minY;
    // normalized icon centre in the sheet (matches detection normalization)
    const gcx = ((b.minX + b.maxX) / 2 - vb.x) / vb.width;
    const gcy = ((b.minY + b.maxY) / 2 - vb.y) / vb.height;
    let best = -1, bestD = Infinity;
    dets.forEach((d, i) => { if (d.used) return; const dd = Math.hypot(d.cx - gcx, d.cy - gcy); if (dd < bestD) { bestD = dd; best = i; } });
    let meta = { label: "icon", tags: [] };
    if (best >= 0 && bestD < 0.12) { dets[best].used = true; meta = { label: dets[best].label, tags: dets[best].tags }; }

    const scale = CONTENT / Math.max(w, h);
    const tx = (TARGET - w * scale) / 2 - b.minX * scale;
    const ty = (TARGET - h * scale) / 2 - b.minY * scale; // y-down already → no flip
    const children = g.paths.map((p) => ({
      name: "path", type: "element", value: "", children: [],
      attributes: {
        d: svgpath(p.d).matrix([scale, 0, 0, scale, tx, ty]).round(3).toString(),
        fill: "none", stroke: "currentColor",
        "stroke-width": String(+(((p.sw > 0 ? p.sw : 8)) * scale).toFixed(3)),
        "stroke-linecap": "round", "stroke-linejoin": "round",
      },
    }));
    const iconAst = { name: "svg", type: "element", value: "", attributes: { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none" }, children };
    let name = meta.label, n = 2;
    while (used.has(name)) name = `${meta.label}-${n++}`;
    used.add(name);
    candidates.push({ name, svg: stringify(iconAst), tags: meta.tags, stroke_status: "valid" });
  });

  return candidates;
}

// Normalize a single pasted/uploaded icon to a clean "0 0 24 24" library icon:
// flatten all stroke geometry (baking transforms), scale + centre it into the
// 24 box with the library's padding, and compensate stroke-width — the same
// treatment a sheet segment gets. Returns the normalized svg string, or null if
// no stroke geometry is found (e.g. a filled/outlined icon).
async function normalizeIconSvg(svgText) {
  const ast = await parse(svgText);
  const classMap = parseStyleClasses(svgText);

  const paths = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  (function walk(node, inheritedTf, inheritedStyle) {
    const tf = (inheritedTf ? inheritedTf + " " : "") + (node.attributes?.transform || "");
    const style = effectivePaint(node, classMap, inheritedStyle);
    if (DRAW_TAGS.has(node.name)) {
      const stroke = (style.stroke || "").trim().toLowerCase();
      const sw = parseFloat(style["stroke-width"]);
      if (stroke && stroke !== "none") {
        let d = shapeToPath(node);
        if (d) {
          try { d = svgpath(d).transform(tf.trim() || "translate(0 0)").abs().round(3).toString(); } catch { d = ""; }
          if (d) {
            const b = pathBounds(d);
            if (b) { minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY); maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY); }
            paths.push({ d, sw: sw > 0 ? sw : 0 });
          }
        }
      }
    }
    for (const c of node.children || []) walk(c, tf, style);
  })(ast, "", {});

  if (!paths.length || minX === Infinity) return null;

  const w = maxX - minX, h = maxY - minY;
  const scale = CONTENT / Math.max(w, h || 1);
  const tx = (TARGET - w * scale) / 2 - minX * scale;
  const ty = (TARGET - h * scale) / 2 - minY * scale;
  const children = paths.map((p) => ({
    name: "path", type: "element", value: "", children: [],
    attributes: {
      d: svgpath(p.d).matrix([scale, 0, 0, scale, tx, ty]).round(3).toString(),
      fill: "none", stroke: "currentColor",
      "stroke-width": String(+(((p.sw > 0 ? p.sw : 8)) * scale).toFixed(3)),
      "stroke-linecap": "round", "stroke-linejoin": "round",
    },
  }));
  const iconAst = { name: "svg", type: "element", value: "", attributes: { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none" }, children };
  return stringify(iconAst);
}

module.exports = { extractCandidates, extractFromGroups, normalizeIconSvg, classifyElements, elementBounds, parseViewBox, clusterByProximity };
