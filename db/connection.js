// =============================================
//  db/connection.js — PostgreSQL Connection Pool
//  Manages database connections for multi-tenant icon library
// =============================================

const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Enable SSL for production databases (e.g., Neon, Railway, Render)
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  // Connection pool configuration
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Return error if connection takes > 2s
});

// Test connection on startup
pool.on('connect', () => {
  console.log('[Database] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client:', err);
  process.exit(-1);
});

// Optional: Test query to verify database is accessible
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[Database] Connection test failed:', err.message);
  } else {
    console.log('[Database] Connection test successful:', res.rows[0].now);
  }
});

module.exports = pool;
