const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

app.listen(4000, () => console.log('API listening on port 4000'));
