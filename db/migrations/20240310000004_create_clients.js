// =============================================
//  Migration: Create Clients Table
//  Stores client/project groups (Rhythm, Otsuka, J&J, etc.)
// =============================================

exports.up = function(knex) {
  return knex.schema.createTable('clients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    table.string('name').notNullable();
    table.timestamps(true, true);

    // Client name must be unique per tenant
    table.unique(['tenant_id', 'name']);

    // Index for faster queries
    table.index('tenant_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('clients');
};
