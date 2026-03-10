// =============================================
//  Seed: Default Tenant
//  Creates a default organization for testing
// =============================================

exports.seed = async function(knex) {
  // Delete existing entries
  await knex('tenants').del();

  // Insert default tenant
  await knex('tenants').insert([
    {
      id: 'a0a0a0a0-0000-0000-0000-000000000001',
      name: 'Default Organization',
      azure_tenant_id: null, // Set to your Azure tenant ID if needed
      description: 'Default tenant for development and testing',
      is_active: true
    }
  ]);
};
