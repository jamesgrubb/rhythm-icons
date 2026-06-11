// =============================================
//  lib/svgProcess.js — per-icon SVG extraction
//  - Maps Gemini pixel-space boxes → SVG coordinate space
//  - Crops/normalizes each icon to viewBox "0 0 24 24"
//  - Classifies stroke-based vs outlined (filled) icons
//  Dependency: svgson (SVG ⇄ JSON AST)
// =============================================

const { parse, stringify } = require("svgson");

const DRAW_TAGS = new Set(["path", "line", "polyline", "polygon", "rect", "circle", "ellipse"]);
const TARGET = 24;       // library viewBox is "0 0 24 24"
const CONTENT = 20;      // icon content size (2-unit padding)
const STROKE_WIDTH = 2;  // library convention

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
async function extractCandidates({ svgText, detections, pngWidth, pngHeight }) {
  const ast = await parse(svgText);
  const vb = parseViewBox(ast);
  if (!vb) {
    throw new Error("Converted SVG has no viewBox/width/height — cannot map coordinates");
  }

  const allElements = collectDrawElements(ast);
  const withBounds = allElements
    .map((el) => ({ ...el, bounds: elementBounds(el.node) }))
    .filter((el) => el.bounds);

  const candidates = [];
  const usedNames = new Set();

  for (const det of detections) {
    const [ymin, xmin, ymax, xmax] = det.box_2d;

    // Gemini normalized (0-1000, image space) → SVG user units.
    // The PNG is a render of the full SVG viewBox, so the mapping is linear.
    const box = {
      minX: vb.x + (xmin / 1000) * vb.width,
      maxX: vb.x + (xmax / 1000) * vb.width,
      minY: vb.y + (ymin / 1000) * vb.height,
      maxY: vb.y + (ymax / 1000) * vb.height,
    };

    const members = withBounds.filter((el) => boundsIntersect(el.bounds, box));
    if (members.length === 0) continue;

    // Tight bounds of the actual member elements (better than Gemini's box)
    const minX = Math.min(...members.map((m) => m.bounds.minX));
    const minY = Math.min(...members.map((m) => m.bounds.minY));
    const maxX = Math.max(...members.map((m) => m.bounds.maxX));
    const maxY = Math.max(...members.map((m) => m.bounds.maxY));
    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 0 || h <= 0) continue;

    const scale = CONTENT / Math.max(w, h);
    // Center the icon in the 24x24 box
    const tx = (TARGET - w * scale) / 2 - minX * scale;
    const ty = (TARGET - h * scale) / 2 - minY * scale;

    const stroke_status = classifyElements(members);

    // Rebuild member nodes, normalizing paint to library conventions:
    // stroke inherits via currentColor, fixed stroke-width, no fills.
    const children = members.map(({ node, effective }) => ({
      ...node,
      attributes: {
        ...node.attributes,
        fill: "none",
        stroke: "currentColor",
        // Scale-corrected stroke width so it renders as 2 units post-transform
        "stroke-width": String(+(STROKE_WIDTH / scale).toFixed(3)),
        "stroke-linecap": effective["stroke-linecap"] || "round",
        "stroke-linejoin": effective["stroke-linejoin"] || "round",
      },
      children: node.children || [],
    }));

    const iconAst = {
      name: "svg",
      type: "element",
      value: "",
      attributes: {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
      },
      children: [
        {
          name: "g",
          type: "element",
          value: "",
          attributes: { transform: `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(5)})` },
          children,
        },
      ],
    };

    // De-duplicate names: shield, shield-2, shield-3...
    let name = det.label || "icon";
    let n = 2;
    while (usedNames.has(name)) name = `${det.label}-${n++}`;
    usedNames.add(name);

    candidates.push({
      name,
      svg: stringify(iconAst),
      stroke_status,
      // Percentages of the sheet PNG — lets the review UI show the original
      // region via CSS cropping without any server-side image processing.
      box_pct: {
        left: +(xmin / 10).toFixed(2),
        top: +(ymin / 10).toFixed(2),
        width: +((xmax - xmin) / 10).toFixed(2),
        height: +((ymax - ymin) / 10).toFixed(2),
      },
    });
  }

  return candidates;
}

module.exports = { extractCandidates, classifyElements, elementBounds, parseViewBox };
