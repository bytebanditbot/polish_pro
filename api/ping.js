// Diagnostic endpoint: no Express, no database. Open /api/ping to see that serverless functions
// work at all and which commit is deployed. Safe to leave in place (exposes no secrets).
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(JSON.stringify({
    ok: true,
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || 'unknown').slice(0, 7),
    node: process.version,
    database_url_set: Boolean(process.env.DATABASE_URL),
    admin_password_set: Boolean(process.env.ADMIN_PASSWORD),
    jwt_secret_set: Boolean(process.env.JWT_SECRET),
    encryption_key_set: Boolean(process.env.ENCRYPTION_KEY),
  }));
};
