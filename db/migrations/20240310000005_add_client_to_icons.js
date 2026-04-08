// =============================================
//  Migration: Add Client ID to Icons Table
//  Links icons to clients (projects/brands)
// =============================================

exports.up = function(knex) {
  return knex.schema.table('icons', (table) => {
    table.uuid('client_id').references('id').inTable('clients').onDelete('SET NULL');
    table.index('client_id');
  });
};

exports.down = function(knex) {
  return knex.schema.table('icons', (table) => {
    table.dropColumn('client_id');
  });
};
