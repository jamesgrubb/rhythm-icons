// =============================================
//  Migration: Create Icons Table
//  Stores icon library with multi-tenant support
// =============================================

exports.up = function(knex) {
  return knex.schema.createTable('icons', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('icon_id').notNullable(); // e.g., "heart-rate", "stethoscope"
    table.string('name').notNullable();
    table.string('category').notNullable();
    table.text('svg').notNullable(); // SVG markup
    table.boolean('is_public').defaultTo(false); // Shared across all tenants if true
    table.timestamps(true, true);

    // Composite unique constraint: icon_id must be unique per tenant
    table.unique(['tenant_id', 'icon_id']);

    // Indexes for faster queries
    table.index('tenant_id');
    table.index('category');
    table.index('is_public');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('icons');
};
