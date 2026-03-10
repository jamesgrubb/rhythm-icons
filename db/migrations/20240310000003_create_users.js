// =============================================
//  Migration: Create Users Table
//  Links Azure AD users to tenants
// =============================================

exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('azure_user_id').notNullable().unique(); // Azure AD Object ID
    table.string('email').notNullable();
    table.string('name');
    table.string('role').defaultTo('user'); // 'admin', 'user', 'viewer'
    table.timestamps(true, true);

    // Indexes
    table.index('tenant_id');
    table.index('azure_user_id');
    table.index('email');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};
