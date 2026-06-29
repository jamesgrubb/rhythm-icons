// =============================================
//  lib/jobs.js — In-process ingest job worker
//  Pipeline: license → download EPS → convert (PNG+SVG)
//            → Gemini segmentation/naming → stroke validation
//  Single-instance design (Railway runs one replica).
//  Jobs lost on restart are marked failed at boot.
// =============================================

const pool = require("../db/connection");
const shutterstock = require("./shutterstock");

const TERMINAL_STATUSES = ["review_ready", "failed", "done"];

async function updateJob(jobId, fields) {
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = $${i++}`);
    values.push(key === "results" && value !== null ? JSON.stringify(value) : value);
  }
  sets.push(`updated_at = NOW()`);
  values.push(jobId);
  await pool.query(`UPDATE ingest_jobs SET ${sets.join(", ")} WHERE id = $${i}`, values);
}

/**
 * Mark any jobs left in a non-terminal state (e.g. after a restart) as failed.
 * Call once at server boot.
 */
async function failStaleJobs() {
  try {
    const result = await pool.query(
      `UPDATE ingest_jobs
       SET status = 'failed', error = 'Server restarted while job was running', updated_at = NOW()
       WHERE status NOT IN (${TERMINAL_STATUSES.map((_, idx) => `$${idx + 1}`).join(", ")})
       RETURNING id`,
      TERMINAL_STATUSES
    );
    if (result.rowCount > 0) {
      console.warn(`[Jobs] Marked ${result.rowCount} stale ingest job(s) as failed after restart`);
    }
  } catch (err) {
    // Table may not exist yet on first boot before migrations — non-fatal
    console.warn("[Jobs] Could not check stale jobs:", err.message);
  }
}

/**
 * Create an ingest job row and start the pipeline asynchronously.
 * Returns the job row immediately ({ id, status }).
 */
async function createIngestJob({ tenantId, imageId, createdBy }) {
  const result = await pool.query(
    `INSERT INTO ingest_jobs (tenant_id, shutterstock_image_id, status, progress, created_by)
     VALUES ($1, $2, 'queued', 0, $3)
     RETURNING id, status, progress`,
    [tenantId, imageId, createdBy || null]
  );
  const job = result.rows[0];

  // Fire and forget — errors are recorded on the job row
  runIngestJob(job.id, imageId).catch(async (err) => {
    console.error(`[Jobs] Job ${job.id} failed:`, err);
    await updateJob(job.id, { status: "failed", error: err.message }).catch(() => {});
  });

  return job;
}

/**
 * Create a job for a manually-uploaded sheet. Accepts either an EPS
 * (heuristic segmentation) or — preferred for accuracy — an original
 * grouped SVG (Illustrator "Save As SVG"), which segments by its real icon
 * groups for complete, accurate icons.
 */
async function createUploadJob({ tenantId, buffer, filename, createdBy }) {
  // Detect SVG vs EPS by content
  const head = buffer.subarray(0, 512).toString("latin1");
  const isSvg = /<svg[\s>]/i.test(head) || (/^\s*<\?xml/i.test(head) && buffer.toString("latin1").includes("<svg"));

  const result = await pool.query(
    `INSERT INTO ingest_jobs (tenant_id, source, upload_filename, status, progress, created_by)
     VALUES ($1, 'upload', $2, 'queued', 0, $3)
     RETURNING id, status, progress`,
    [tenantId, filename || null, createdBy || null]
  );
  const job = result.rows[0];

  const run = isSvg ? runPipelineFromSvg(job.id, buffer.toString("utf8")) : runPipelineFromEps(job.id, buffer);
  run.catch(async (err) => {
    console.error(`[Jobs] Upload job ${job.id} failed:`, err);
    await updateJob(job.id, { status: "failed", error: err.message }).catch(() => {});
  });

  return job;
}

/**
 * Pipeline for an original grouped SVG: segment by icon groups (accurate),
 * name via Gemini on a rendered PNG. No ghostscript/pstoedit needed.
 */
async function runPipelineFromSvg(jobId, svgText) {
  const gemini = require("./gemini");
  const svgProcess = require("./svgProcess");

  // 1. Segment by icon groups (exact — this is the whole point of the SVG path)
  await updateJob(jobId, { status: "segmenting", progress: 40 });
  const candidates = await svgProcess.extractFromGroups({ svgText });
  console.log(`[Jobs] Job ${jobId}: ${candidates.length} icon(s) from SVG groups`);
  if (candidates.length === 0) throw new Error("No icon groups found in the uploaded SVG");

  // 2. Name each EXTRACTED icon (so the name always matches the icon): render
  //    the clean icons into a grid and have Gemini name them in order.
  await updateJob(jobId, { status: "segmenting", progress: 75 });
  try {
    const { png, cols } = renderIconGrid(candidates);
    const names = await gemini.nameIconGrid(png, candidates.length, cols);
    const used = new Set();
    candidates.forEach((c, i) => {
      const meta = names[i];
      if (!meta) return;
      let name = meta.label, n = 2;
      while (used.has(name)) name = `${meta.label}-${n++}`;
      used.add(name);
      c.name = name; c.tags = meta.tags;
    });
    console.log(`[Jobs] Job ${jobId}: named ${names.length}/${candidates.length} icons from grid`);
  } catch (e) {
    console.warn(`[Jobs] Job ${jobId}: grid naming failed (${e.message}); icons left with placeholder names`);
  }

  await updateJob(jobId, { status: "review_ready", progress: 100, results: candidates });
}

// Render extracted candidate icons into one grid PNG (left→right, top→bottom)
// for the naming pass. Returns { png, cols }.
function renderIconGrid(candidates) {
  const { Resvg } = require("@resvg/resvg-js");
  const { PNG } = require("pngjs");
  const cell = 96, pad = 4;
  const cols = Math.min(8, Math.max(1, Math.ceil(Math.sqrt(candidates.length))));
  const rows = Math.ceil(candidates.length / cols);
  const W = cols * (cell + pad) + pad, H = rows * (cell + pad) + pad;
  const out = new PNG({ width: W, height: H });
  for (let i = 0; i < out.data.length; i += 4) { out.data[i] = out.data[i + 1] = out.data[i + 2] = 255; out.data[i + 3] = 255; }
  candidates.forEach((c, k) => {
    let img;
    try { img = PNG.sync.read(new Resvg(c.svg.replace("<svg ", `<svg width="${cell - 16}" height="${cell - 16}" `), { background: "white" }).render().asPng()); }
    catch { return; }
    const ox = (k % cols) * (cell + pad) + pad + 8, oy = Math.floor(k / cols) * (cell + pad) + pad + 8;
    for (let y = 0; y < Math.min(cell - 16, img.height); y++)
      for (let x = 0; x < Math.min(cell - 16, img.width); x++) {
        const si = (y * img.width + x) << 2, di = ((oy + y) * W + (ox + x)) << 2;
        out.data[di] = img.data[si]; out.data[di + 1] = img.data[si + 1]; out.data[di + 2] = img.data[si + 2]; out.data[di + 3] = 255;
      }
  });
  return { png: PNG.sync.write(out), cols };
}

/**
 * The pipeline. Each stage updates status + progress so the frontend
 * can render meaningful feedback while polling.
 */
async function runIngestJob(jobId, imageId) {
  // 1. License (or reuse an existing license)
  await updateJob(jobId, { status: "licensing", progress: 5 });
  const { downloadUrl, licenseId } = await shutterstock.licenseVector(imageId);
  await updateJob(jobId, { shutterstock_license_id: licenseId, progress: 15 });

  // 2. Download EPS
  await updateJob(jobId, { status: "downloading", progress: 20 });
  const epsBuffer = await shutterstock.downloadAsset(downloadUrl);
  console.log(`[Jobs] Job ${jobId}: downloaded EPS (${(epsBuffer.length / 1024).toFixed(0)} KB)`);

  await runPipelineFromEps(jobId, epsBuffer);
}

/**
 * Shared conversion pipeline: EPS buffer → candidates ready for review.
 * Used by both Shutterstock-licensed and manually-uploaded sheets.
 */
async function runPipelineFromEps(jobId, epsBuffer) {
  // Lazy-require the heavier pipeline deps so the server boots even if
  // conversion tooling is missing (job will fail with a clear error instead).
  const epsConvert = require("./epsConvert");
  const gemini = require("./gemini");
  const svgProcess = require("./svgProcess");

  // 3. Convert EPS → PNG (for AI) and EPS → SVG (for deliverable)
  await updateJob(jobId, { status: "converting", progress: 30 });
  const converted = await epsConvert.convertEps(epsBuffer);
  // converted: { pngBuffer, pngWidth, pngHeight, svgText, boundingBox: {x, y, width, height} }

  // 4a. Gemini layout pass: locate the real icons vs branding/info panels and
  //     estimate the icon count (coarse vision reasoning Gemini is good at).
  await updateJob(jobId, { status: "segmenting", progress: 45 });
  const layout = await gemini.analyzeLayout(converted.pngBuffer);
  console.log(`[Jobs] Job ${jobId}: layout — iconCount≈${layout.iconCount}, panels=${layout.panels.length}, grid=${layout.iconGrid ? "yes" : "no"}`);

  // 4b. Mask out the branding/panel regions so the naming pass sees ONLY the
  //     real icons — keeps the count honest and names aligned with segments.
  const namingPng = gemini.maskRegions(converted.pngBuffer, layout.panels);

  // 4c. Gemini naming pass: per-icon names + tags (tiled for accurate order)
  await updateJob(jobId, { status: "segmenting", progress: 55 });
  const detections = await gemini.detectIcons(namingPng, {
    width: converted.pngWidth,
    height: converted.pngHeight,
  });
  console.log(`[Jobs] Job ${jobId}: Gemini named ${detections.length} icon(s)`);

  if (detections.length === 0 && !layout.iconCount) {
    throw new Error("Gemini detected no icons in the rendered sheet");
  }

  // 5. Segment geometry into per-icon SVGs (cluster + discard panels +
  //    reconcile to count), normalize to 24x24, classify stroke vs outlined
  await updateJob(jobId, { status: "segmenting", progress: 70 });
  const candidates = await svgProcess.extractCandidates({
    svgText: converted.svgText,
    detections,
    pngBuffer: converted.pngBuffer,
    pngWidth: converted.pngWidth,
    pngHeight: converted.pngHeight,
    boundingBox: converted.boundingBox,
    layout,
  });
  // candidates: [{ name, svg, tags, stroke_status: 'valid'|'outlined'|'ambiguous' }]

  const validCount = candidates.filter((c) => c.stroke_status === "valid").length;
  console.log(`[Jobs] Job ${jobId}: ${candidates.length} candidate(s), ${validCount} stroke-valid`);

  // 6. Ready for admin review — never auto-insert into icons
  await updateJob(jobId, { status: "review_ready", progress: 100, results: candidates });
}

async function getJob(jobId, tenantId) {
  const result = await pool.query(
    `SELECT id, source, upload_filename, shutterstock_image_id, shutterstock_license_id, status, progress, results, error, created_at, updated_at
     FROM ingest_jobs
     WHERE id = $1 AND tenant_id = $2`,
    [jobId, tenantId]
  );
  return result.rows[0] || null;
}

async function markJobDone(jobId, tenantId) {
  await pool.query(
    `UPDATE ingest_jobs SET status = 'done', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
    [jobId, tenantId]
  );
}

module.exports = { createIngestJob, createUploadJob, getJob, markJobDone, failStaleJobs };
