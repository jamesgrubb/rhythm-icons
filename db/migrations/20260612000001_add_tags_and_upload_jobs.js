// =============================================
//  Migration: AI tags on icons + manually-uploaded sheet jobs
//  - icons.tags: jsonb array of lowercase keywords (Gemini-generated,
//    admin-editable) powering library search
//  - ingest_jobs.source: 'shutterstock' | 'upload'; uploaded sheets have
//    no Shutterstock image id, so that column becomes nullable
// =============================================

exports.up = async function(knex) {
  await knex.schema.alterTable('icons', (table) => {
    table.jsonb('tags').notNullable().defaultTo('[]');
  });
  await knex.schema.alterTable('ingest_jobs', (table) => {
    table.string('source').notNullable().defaultTo('shutterstock');
    table.string('shutterstock_image_id').nullable().alter();
    table.string('upload_filename').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('icons', (table) => {
    table.dropColumn('tags');
  });
  await knex.schema.alterTable('ingest_jobs', (table) => {
    table.dropColumn('source');
    table.dropColumn('upload_filename');
    table.string('shutterstock_image_id').notNullable().alter();
  });
};
