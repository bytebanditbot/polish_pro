const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const OPEN_HOUR = 9;
const CLOSE_HOUR = 18;

const isValidDate = (s) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const isValidEmail = (s) =>
  typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// True if no active booking overlaps [start, start + duration)
async function isFree(start, durationMin) {
  const { rows } = await pool.query(
    `SELECT 1
       FROM bookings b
       JOIN services s ON s.id = b.service_id
      WHERE b.status <> 'cancelled'
        AND b.slot_start < $1::timestamp + make_interval(mins => $2::int)
        AND b.slot_start + make_interval(mins => s.duration_min) > $1::timestamp
      LIMIT 1`,
    [start, durationMin]
  );
  return rows.length === 0;
}

function fitsOpeningHours(hour, durationMin) {
  return hour >= OPEN_HOUR && hour * 60 + durationMin <= CLOSE_HOUR * 60;
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'database error' });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, price_eur, duration_min FROM services ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'could not load services' });
  }
});

app.get('/api/slots', async (req, res) => {
  const { service_id, date } = req.query;
  if (!Number.isInteger(Number(service_id)) || !isValidDate(date)) {
    return res.status(400).json({ error: 'service_id and date (YYYY-MM-DD) are required' });
  }
  try {
    const svc = await pool.query('SELECT duration_min FROM services WHERE id = $1', [service_id]);
    if (svc.rows.length === 0) return res.status(404).json({ error: 'service not found' });
    const duration = svc.rows[0].duration_min;

    const slots = [];
    for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
      if (!fitsOpeningHours(hour, duration)) continue;
      const start = `${date} ${String(hour).padStart(2, '0')}:00`;
      if (await isFree(start, duration)) slots.push(start);
    }
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: 'could not load slots' });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { service_id, customer_name, customer_email, customer_phone, car_model, slot_start } =
    req.body || {};

  const match = typeof slot_start === 'string' && slot_start.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):00$/);
  if (
    !Number.isInteger(service_id) ||
    !customer_name || String(customer_name).trim().length < 2 ||
    !isValidEmail(customer_email) ||
    !match || !isValidDate(match[1])
  ) {
    return res.status(400).json({
      error: 'service_id, customer_name, customer_email and slot_start ("YYYY-MM-DD HH:00") are required',
    });
  }

  try {
    const svc = await pool.query('SELECT duration_min FROM services WHERE id = $1', [service_id]);
    if (svc.rows.length === 0) return res.status(404).json({ error: 'service not found' });
    const duration = svc.rows[0].duration_min;

    if (!fitsOpeningHours(Number(match[2]), duration)) {
      return res.status(400).json({ error: 'slot is outside opening hours' });
    }
    if (!(await isFree(slot_start, duration))) {
      return res.status(409).json({ error: 'slot is no longer available' });
    }

    const { rows } = await pool.query(
      `INSERT INTO bookings (service_id, customer_name, customer_email, customer_phone, car_model, slot_start)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, service_id, customer_name, slot_start, status`,
      [service_id, String(customer_name).trim(), customer_email, customer_phone || null, car_model || null, slot_start]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'could not create booking' });
  }
});

app.use('/api/admin', require('./admin')(pool));

app.listen(4000, () => console.log('API listening on port 4000'));
