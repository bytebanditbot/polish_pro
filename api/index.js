// Vercel serverless entry point: exports the Express app as the request handler.
// vercel.json rewrites every /api/* request to this function, and Express then
// routes on the original URL (e.g. /api/services).

// Behind Vercel's proxy, req.ip must come from X-Forwarded-For (used by the rate limiters).
if (!process.env.TRUST_PROXY) process.env.TRUST_PROXY = '1';

module.exports = require('../backend/app').app;
