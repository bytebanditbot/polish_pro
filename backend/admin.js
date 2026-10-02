const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = function adminRouter(pool) {
  const router = express.Router();
  const { ADMIN_PASSWORD, JWT_SECRET } = process.env;

  // Constant-time comparison so response timing doesn't leak the password
  const safeEqual = (a, b) =>
    crypto.timingSafeEqual(
      crypto.createHash('sha256').update(String(a)).digest(),
      crypto.createHash('sha256').update(String(b)).digest()
    );

  router.post('/login', (req, res) => {
    if (!ADMIN_PASSWORD || !JWT_SECRET) {
      return res.status(500).json({ error: 'admin login is not configured' });
    }
    const { password } = req.body || {};
    if (!password || !safeEqual(password, ADMIN_PASSWORD)) {
      return res.status(401).json({ error: 'wrong password' });
    }
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  });

  function requireAdmin(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    try {
      jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: 'unauthorized' });
    }
  }

  router.get('/bookings', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT b.id, b.customer_name, b.customer_email, b.customer_phone, b.car_model,
                b.slot_start, b.status, b.created_at,
                s.name AS service_name, s.price_eur
           FROM bookings b
           JOIN services s ON s.id = b.service_id
          ORDER BY b.slot_start DESC`
      );
      res.json(rows);
    } catch {
      res.status(500).json({ error: 'could not load bookings' });
    }
  });

  // Allowed: pending/confirmed -> confirmed or cancelled. Cancelled stays cancelled.
  router.patch('/bookings/:id/status', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!Number.isInteger(id) || !['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'status must be "confirmed" or "cancelled"' });
    }
    try {
      const { rows } = await pool.query(
        `UPDATE bookings SET status = $2
          WHERE id = $1 AND status <> 'cancelled'
          RETURNING id, status`,
        [id, status]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'booking not found or already cancelled' });
      }
      res.json(rows[0]);
    } catch {
      res.status(500).json({ error: 'could not update booking' });
    }
  });

  return router;
};
