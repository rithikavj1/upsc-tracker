const { Pool, types } = require('pg');
require('dotenv').config();

// Fix timezone bug — dates come as plain strings, no UTC conversion
types.setTypeParser(1082, val => val);
types.setTypeParser(1114, val => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Database connection lost — will reconnect automatically:', err.message);
});

// Keep Neon awake — ping every 4 minutes
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (e) {
    console.error('Keep-alive ping failed:', e.message);
  }
}, 4 * 60 * 1000);

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL');
    client.release();
  } catch (err) {
    console.error('⚠️ DB not ready yet, retrying in 4s...', err.message);
    setTimeout(testConnection, 4000);
  }
};

testConnection();

module.exports = pool;