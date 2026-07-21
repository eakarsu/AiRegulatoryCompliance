const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLROOTCERT ? { rejectUnauthorized: true, ca: fs.readFileSync(process.env.PGSSLROOTCERT, 'utf8') } : undefined });

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
