const fs = require('fs');
const { app, pool, ensureSchema } = require('./app');
const { UPLOAD_DIR, USE_DB_UPLOADS } = require('./uploads');

// Local / Docker entry point. On Vercel this file is not used (see ../api/index.js).
async function start() {
  if (!USE_DB_UPLOADS) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await ensureSchema();
  app.listen(4000, () => console.log('API listening on port 4000'));
}

start().catch((err) => {
  console.error('Could not initialize database:', err.message || err);
  pool.end();
  process.exitCode = 1;
});
