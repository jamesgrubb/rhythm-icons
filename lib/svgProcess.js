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
  a["stroke-width"] = String(STROKE_WIDTH);
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

/**
 * Extract per-icon candidates from a converted sheet.
 *
 * @param {object} opts
 *   svgText      — pstoedit output SVG (sheet of icons)
 *   detections   — [{ box_2d: [ymin,xmin,ymax,xmax] 0-1000 normalized, label }]
 *   pngWidth/pngHeight — rendered PNG dims (Gemini saw this image)
 *   boundingBox  — EPS %%BoundingBox {x,y,width,height} (unused if SVG has its own viewBox)
 * @returns [{ name, svg, stroke_status, box_pct }]
 */
async function extractCandidates({ svgText, detections, pngWidth, pngHeight, boundingBox }) {
  const ast = await parse(svgText);

  const allElements = collectDrawElements(ast);
  let withBounds = allElements
    .map((el) => ({ ...el, bounds: elementBounds(el.node) }))
    .filter((el) => el.bounds)
    // pstoedit emits a synthetic <rect id="background"> — never icon content
    .filter((el) => (el.node.attributes?.id || "").toLowerCase() !== "background");

  if (withBounds.length === 0) {
    throw new Error("Converted SVG contains no drawable elements");
  }

  // ---- Coordinate space ----
  // pstoedit emits geometry in EPS user-space (points) — the SAME space the
  // EPS %%BoundingBox is defined in and that Ghostscript rendered the PNG
  // Gemini saw. So the BoundingBox is the authoritative mapping space.
  // (pstoedit's own viewBox/width/height are unreliable — often "0 0 1 1".)
  // EPS is y-UP; the PNG/Gemini are y-DOWN, so Y is flipped deterministically.
  // Fall back to element extent only when no BoundingBox is available.
  let space;
  if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
    space = { x: boundingBox.x || 0, y: boundingBox.y || 0, width: boundingBox.width, height: boundingBox.height, flipY: true };
  } else {
    const ex = {
      minX: Math.min(...withBounds.map((e) => e.bounds.minX)),
      minY: Math.min(...withBounds.map((e) => e.bounds.minY)),
      maxX: Math.max(...withBounds.map((e) => e.bounds.maxX)),
      maxY: Math.max(...withBounds.map((e) => e.bounds.maxY)),
    };
    space = { x: ex.minX, y: ex.minY, width: (ex.maxX - ex.minX) || 1, height: (ex.maxY - ex.minY) || 1, flipY: false };
  }

  // Drop off-artboard junk: pstoedit keeps elements Ghostscript clips away.
  // Keep only what falls within the BoundingBox (small margin).
  const mX = space.width * 0.02, mY = space.height * 0.02;
  withBounds = withBounds.filter((el) =>
    el.bounds.maxX >= space.x - mX && el.bounds.minX <= space.x + space.width + mX &&
    el.bounds.maxY >= space.y - mY && el.bounds.minY <= space.y + space.height + mY
  );

  // Drop full-page frames/borders (span ~the whole sheet)
  if (withBounds.length > 4) {
    withBounds = withBounds.filter((el) =>
      !((el.bounds.maxX - el.bounds.minX) > 0.9 * space.width &&
        (el.bounds.maxY - el.bounds.minY) > 0.9 * space.height)
    );
  }
  if (withBounds.length === 0) {
    throw new Error("No drawable elements remain after clipping to the BoundingBox");
  }

  // Map a Gemini box (0-1000, image space, y-down) to EPS coordinates.
  const mapBox = (det) => {
    const bb = det.box_2d || det.box || det.bbox || [];
    const [ymin, xmin, ymax, xmax] = bb;
    const minX = space.x + (xmin / 1000) * space.width;
    const maxX = space.x + (xmax / 1000) * space.width;
    // y-down image -> EPS y-up: image top (small y) maps to high EPS y
    const minY = space.flipY ? space.y + space.height - (ymax / 1000) * space.height : space.y + (ymin / 1000) * space.height;
    const maxY = space.flipY ? space.y + space.height - (ymin / 1000) * space.height : space.y + (ymax / 1000) * space.height;
    return { minX, maxX, minY, maxY };
  };

  const centerInBox = (b, box) => {
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    return cx >= box.minX && cx <= box.maxX && cy >= box.minY && cy <= box.maxY;
  };

  const candidates = [];
  const usedNames = new Set();

  for (const det of detections) {
    const box = mapBox(det);

    // Prefer center-in-box (an element belongs to exactly one icon);
    // fall back to intersection for boxes that clip everything they touch
    let members = withBounds.filter((el) => centerInBox(el.bounds, box));
    if (members.length === 0) {
      members = withBounds.filter((el) => boundsIntersect(el.bounds, box));
    }
    if (members.length === 0) continue;

    // Sheets caption each icon with text, which EPS delivers as *filled*
    // paths sharing the icon's box. When stroke-painted elements exist,
    // they ARE the icon — drop fill-only elements (captions, decoration).
    // Only all-filled candidates are truly outlined (and blocked).
    const strokeMembers = members.filter(({ effective }) => {
      const stroke = (effective.stroke || "").trim().toLowerCase();
      return stroke && stroke !== "none";
    });
    let stroke_status;
    if (strokeMembers.length > 0) {
      members = strokeMembers;
      stroke_status = "valid";
    } else {
      stroke_status = classifyElements(members); // 'outlined'
    }

    // Tight bounds of the final member elements (better than Gemini's box,
    // and unskewed by any dropped caption text)
    const minX = Math.min(...members.map((m) => m.bounds.minX));
    const minY = Math.min(...members.map((m) => m.bounds.minY));
    const maxX = Math.max(...members.map((m) => m.bounds.maxX));
    const maxY = Math.max(...members.map((m) => m.bounds.maxY));
    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 0 || h <= 0) continue;

    const scale = CONTENT / Math.max(w, h);
    // Center the icon in the 24x24 box. EPS is y-up, the library SVG is
    // y-down, so the Y axis is flipped (sy negative): the icon's top edge
    // (maxY in EPS) maps to the small-y top of the 0–24 viewBox.
    const sx = scale, sy = space.flipY ? -scale : scale;
    const tx = (TARGET - w * scale) / 2 - minX * sx;
    const ty = space.flipY
      ? (TARGET - h * scale) / 2 + maxY * scale   // y' = -scale*y + ty
      : (TARGET - h * scale) / 2 - minY * scale;

    // Bake the affine into each element's geometry so the icon lands in true
    // 0–24 coordinates with a literal stroke-width of 2 and no transform —
    // identical in shape to the curated library icons, which the PowerPoint
    // theme-recolor path already handles correctly.
    const children = members.map(({ node, effective }) =>
      bakeTransform(node, sx, sy, tx, ty, effective)
    );

    const iconAst = {
      name: "svg",
      type: "element",
      value: "",
      attributes: {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
      },
      children,
    };

    // De-duplicate names: shield, shield-2, shield-3...
    let name = det.label || "icon";
    let n = 2;
    while (usedNames.has(name)) name = `${det.label}-${n++}`;
    usedNames.add(name);

    candidates.push({
      name,
      svg: stringify(iconAst),
      tags: det.tags || [],
      stroke_status,
      // Percentages of the sheet PNG — lets the review UI show the original
      // region via CSS cropping without any server-side image processing.
      box_pct: {
        left: +(det.box_2d[1] / 10).toFixed(2),
        top: +(det.box_2d[0] / 10).toFixed(2),
        width: +((det.box_2d[3] - det.box_2d[1]) / 10).toFixed(2),
        height: +((det.box_2d[2] - det.box_2d[0]) / 10).toFixed(2),
      },
    });
  }

  return candidates;
}

module.exports = { extractCandidates, classifyElements, elementBounds, parseViewBox };
