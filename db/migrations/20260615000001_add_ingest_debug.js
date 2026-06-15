// =============================================
//  Migration: temporary debug capture column on ingest_jobs
//  Holds conversion intermediates (rendered PNG, pstoedit SVG, Gemini
//  detections) so the segmentation algorithm can be tuned against real data.
//  Not returned by getJob() — invisible to the frontend.
// =============================================

exports.up = function(knex) {
  return knex.schema.alterTable('ingest_jobs', (table) => {
    table.text('debug_data').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('ingest_jobs', (table) => {
    table.dropColumn('debug_data');
  });
};
