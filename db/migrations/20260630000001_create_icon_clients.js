// =============================================
//  Migration: icon_clients join table (icons ↔ clients many-to-many)
//  Replaces the single icons.client_id with multi-group assignment.
//  Backfills existing single assignments. icons.client_id is left in place
//  (no longer the source of truth) for rollback safety.
// =============================================

exports.up = async function(knex) {
  await knex.schema.createTable('icon_clients', (table) => {
    table.uuid('icon_id').references('id').inTable('icons').onDelete('CASCADE').notNullable();
    table.uuid('client_id').references('id').inTable('clients').onDelete('CASCADE').notNullable();
    table.primary(['icon_id', 'client_id']);
    table.index('icon_id');
    table.index('client_id');
  });

  // Backfill from the existing single client_id
  await knex.raw(`
    INSERT INTO icon_clients (icon_id, client_id)
    SELECT id, client_id FROM icons
    WHERE client_id IS NOT NULL
    ON CONFLICT DO NOTHING
  `);
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('icon_clients');
};
