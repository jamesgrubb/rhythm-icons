// =============================================
//  Migration: Create Ingest Jobs Table
//  Tracks Shutterstock license → EPS → AI segmentation jobs.
//  results jsonb holds candidate icons awaiting admin review:
//    [{ name, svg, png_preview, stroke_status }]
// =============================================

exports.up = function(knex) {
  return knex.schema.createTable('ingest_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    table.string('shutterstock_image_id').notNullable();
    table.string('shutterstock_license_id').nullable();
    // queued | licensing | downloading | converting | segmenting | review_ready | failed | done
    table.string('status').notNullable().defaultTo('queued');
    table.integer('progress').notNullable().defaultTo(0); // 0-100
    table.jsonb('results').nullable();
    table.text('error').nullable();
    table.string('created_by').nullable(); // admin email
    table.timestamps(true, true);

    table.index('tenant_id');
    table.index(['tenant_id', 'status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('ingest_jobs');
};
