// =============================================
//  knexfile.js — Knex Configuration
//  Database migration and seed configuration
// =============================================

const path = require('path');
require('dotenv').config({ path: '../.env' });

// Absolute paths so the config works both from the knex CLI and when
// required programmatically at server boot (cwd differs between the two)
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SEEDS_DIR = path.join(__dirname, 'seeds');

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: MIGRATIONS_DIR,
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: SEEDS_DIR
    }
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: MIGRATIONS_DIR,
      tableName: 'knex_migrations'
    }
  }
};
