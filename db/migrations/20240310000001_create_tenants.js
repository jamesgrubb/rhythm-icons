// =============================================
//  Migration: Create Tenants Table
//  Multi-tenant organizations table
// =============================================

exports.up = function(knex) {
  return knex.schema.createTable('tenants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('azure_tenant_id').unique();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true); // created_at, updated_at
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('tenants');
};
