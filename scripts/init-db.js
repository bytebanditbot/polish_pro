// One-time database setup: runs db/init.sql (tables + default services).
// Usage:  DATABASE_URL="postgres://..." npm run db:init
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL first.');
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT to_regclass('public.services') AS t");
    if (rows[0].t) {
      console.log('Tables already exist - nothing to do.');
      return;
    }
    const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'init.sql'), 'utf8');
    await client.query(sql);
    console.log('Database initialized.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Could not initialize database:', err.message || err);
  process.exit(1);
});
