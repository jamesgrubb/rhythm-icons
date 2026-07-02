// Add is_active to clients so groups can be disabled (hidden) without losing
// their icon assignments.
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn("clients", "is_active");
  if (!has) {
    await knex.schema.alterTable("clients", (t) => {
      t.boolean("is_active").notNullable().defaultTo(true);
    });
  }
};

exports.down = function (knex) {
  return knex.schema.alterTable("clients", (t) => { t.dropColumn("is_active"); });
};
