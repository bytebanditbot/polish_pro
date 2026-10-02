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

  // pending -> confirmed | cancelled
  // confirmed -> cancelled
  // cancelled -> pending (restore, only if the time slot is still free)
  router.patch('/bookings/:id/status', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!Number.isInteger(id) || !['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    try {
      const current = await pool.query('SELECT status FROM bookings WHERE id = $1', [id]);
      if (current.rows.length === 0) {
        return res.status(404).json({ error: 'booking not found' });
      }
      const from = current.rows[0].status;

      const allowed =
        (from === 'pending' && ['confirmed', 'cancelled'].includes(status)) ||
        (from === 'confirmed' && status === 'cancelled') ||
        (from === 'cancelled' && status === 'pending');
      if (!allowed) {
        return res.status(400).json({ error: `cannot change ${from} to ${status}` });
      }

      // Restoring: make sure nobody booked the slot in the meantime
      if (from === 'cancelled') {
        const conflict = await pool.query(
          `SELECT 1
             FROM bookings me
             JOIN services ms ON ms.id = me.service_id
             JOIN bookings o ON o.id <> me.id AND o.status <> 'cancelled'
             JOIN services os ON os.id = o.service_id
            WHERE me.id = $1
              AND o.slot_start < me.slot_start + make_interval(mins => ms.duration_min)
              AND o.slot_start + make_interval(mins => os.duration_min) > me.slot_start
            LIMIT 1`,
          [id]
        );
        if (conflict.rows.length > 0) {
          return res.status(409).json({
            error: 'This time slot has been booked by someone else, so it cannot be restored.',
          });
        }
      }

      const { rows } = await pool.query(
        'UPDATE bookings SET status = $2 WHERE id = $1 RETURNING id, status',
        [id, status]
      );
      res.json(rows[0]);
    } catch {
      res.status(500).json({ error: 'could not update booking' });
    }
  });

  return router;
};
