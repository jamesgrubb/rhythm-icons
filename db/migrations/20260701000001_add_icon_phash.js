// Add a perceptual hash column and backfill existing icons so visually-
// identical icons can be detected regardless of name/SVG code.
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn("icons", "phash");
  if (!has) {
    await knex.schema.alterTable("icons", (t) => {
      t.string("phash", 64).nullable();
      t.index("phash");
    });
  }

  // Backfill (best-effort — skip anything that won't render)
  let computePhash;
  try { ({ computePhash } = require("../../lib/phash")); } catch { return; }

  const rows = await knex("icons").select("id", "svg").whereNull("phash");
  for (const r of rows) {
    try {
      const h = computePhash(r.svg);
      if (h) await knex("icons").where("id", r.id).update({ phash: h });
    } catch (_) { /* skip */ }
  }
  console.log(`[Migration] Backfilled phash for ${rows.length} icon(s)`);
};

exports.down = function (knex) {
  return knex.schema.alterTable("icons", (t) => { t.dropColumn("phash"); });
};
