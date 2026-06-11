// =============================================
//  lib/epsConvert.js — EPS → PNG + SVG conversion
//  Requires ghostscript (gs) and pstoedit on PATH
//  (installed via Dockerfile in production,
//   `brew install ghostscript pstoedit` locally).
// =============================================

const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const execFileAsync = promisify(execFile);

const EXEC_TIMEOUT_MS = 60_000;
const PNG_DPI = 150;

/**
 * Parse the %%BoundingBox comment from an EPS file (PostScript points).
 * Returns { x, y, width, height } or null.
 */
function parseBoundingBox(epsText) {
  // Prefer HiResBoundingBox when present
  const hires = epsText.match(/%%HiResBoundingBox:\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)/);
  const plain = epsText.match(/%%BoundingBox:\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)/);
  const m = hires || plain;
  if (!m) return null;
  const [x1, y1, x2, y2] = m.slice(1, 5).map(Number);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/**
 * Parse PNG pixel dimensions from the IHDR chunk (bytes 16-23).
 */
function pngDimensions(pngBuffer) {
  return {
    width: pngBuffer.readUInt32BE(16),
    height: pngBuffer.readUInt32BE(20),
  };
}

async function run(cmd, args, label) {
  try {
    return await execFileAsync(cmd, args, { timeout: EXEC_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 });
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`${label}: '${cmd}' not found on PATH — is it installed? (Dockerfile installs ghostscript + pstoedit)`);
    }
    throw new Error(`${label} failed: ${err.stderr?.toString().slice(0, 500) || err.message}`);
  }
}

/**
 * Convert an EPS buffer to:
 *  - PNG (for Gemini image recognition), via Ghostscript
 *  - SVG (for the final deliverable), via pstoedit
 * Returns { pngBuffer, pngWidth, pngHeight, svgText, boundingBox }.
 */
async function convertEps(epsBuffer) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rhythm-eps-"));
  const epsPath = path.join(tmpDir, "input.eps");
  const pngPath = path.join(tmpDir, "render.png");
  const svgPath = path.join(tmpDir, "output.svg");

  try {
    await fs.writeFile(epsPath, epsBuffer);

    const boundingBox = parseBoundingBox(epsBuffer.toString("latin1", 0, Math.min(epsBuffer.length, 8192)));
    if (!boundingBox) {
      throw new Error("EPS file has no %%BoundingBox — cannot map coordinates");
    }

    // EPS → PNG (Ghostscript)
    await run("gs", [
      "-dSAFER", "-dBATCH", "-dNOPAUSE", "-dQUIET",
      "-sDEVICE=png16m",
      `-r${PNG_DPI}`,
      "-dEPSCrop",
      "-dTextAlphaBits=4", "-dGraphicsAlphaBits=4",
      `-sOutputFile=${pngPath}`,
      epsPath,
    ], "Ghostscript EPS→PNG");

    // EPS → SVG (pstoedit)
    await run("pstoedit", [
      "-q",
      "-dt",            // draw text as polygons (avoids font dependencies)
      "-f", "plot-svg",
      epsPath, svgPath,
    ], "pstoedit EPS→SVG");

    const pngBuffer = await fs.readFile(pngPath);
    const svgText = await fs.readFile(svgPath, "utf8");
    const { width: pngWidth, height: pngHeight } = pngDimensions(pngBuffer);

    if (!svgText.includes("<svg")) {
      throw new Error("pstoedit produced no usable SVG output");
    }

    console.log(`[EPSConvert] PNG ${pngWidth}x${pngHeight}px, SVG ${(svgText.length / 1024).toFixed(0)} KB, bbox ${boundingBox.width}x${boundingBox.height}pt`);
    return { pngBuffer, pngWidth, pngHeight, svgText, boundingBox };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { convertEps, parseBoundingBox, pngDimensions };
