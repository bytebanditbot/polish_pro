const express = require('express');
const fs = require('fs');
const cors = require('cors');
const { Pool } = require('pg');
const {
  sendInquiryNotification,
  sendCustomerConfirmation,
  getStoredMailConfig,
  isConfigured,
} = require('./mail');
const { DEFAULT_SITE_CONTENT } = require('./site-content');
const { rateLimit } = require('./rate-limit');
const { UPLOAD_DIR, UPLOAD_URL_PREFIX } = require('./uploads');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(UPLOAD_URL_PREFIX.slice(0, -1), express.static(UPLOAD_DIR, {
  maxAge: '7d',
  index: false,
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

// Behind a reverse proxy (nginx, Traefik...) set TRUST_PROXY=1 so req.ip is the real client IP.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.INQUIRY_RATE_LIMIT) || 10,
  message: 'Trop de demandes envoyées. Réessayez dans quelques minutes.',
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const isValidEmail = (s) =>
  typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

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

app.get('/api/content', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT content FROM site_content WHERE id = 1');
    if (rows.length === 0) return res.status(500).json({ error: 'site content is not initialized' });
    res.json(rows[0].content);
  } catch (err) {
    console.error('Could not load site content:', err.message || err);
    res.status(500).json({ error: 'could not load site content' });
  }
});

app.post('/api/inquiries', inquiryLimiter, async (req, res) => {
  const { service_id, customer_name, customer_email, customer_phone, car_model, message } = req.body || {};

  if (
    !customer_name || String(customer_name).trim().length < 2 ||
    !isValidEmail(customer_email) ||
    !message || String(message).trim().length < 5
  ) {
    return res.status(400).json({
      error: 'customer_name, customer_email and message are required',
    });
  }

  if (service_id !== undefined && service_id !== null && !Number.isInteger(Number(service_id))) {
    return res.status(400).json({ error: 'service_id must be an integer when provided' });
  }

  try {
    const numericService = service_id === undefined || service_id === null ? null : Number(service_id);
    const { rows } = await pool.query(
      `INSERT INTO inquiries (service_id, customer_name, customer_email, customer_phone, car_model, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
       numericService,
       String(customer_name).trim(),
       customer_email,
       customer_phone || null,
       car_model || null,
       String(message).trim(),
      ]
    );

    const inquiry = rows[0];
    const serviceName = inquiry.service_id
      ? (await pool.query('SELECT name FROM services WHERE id = $1', [inquiry.service_id])).rows[0]?.name || null
      : null;
    const mailConfig = await getStoredMailConfig(pool);
    const notificationRecipient = mailConfig?.user || process.env.SMTP_USER || '';
    let emailSent = false;
    let customerEmailSent = false;

    if (isConfigured(mailConfig)) {
      if (notificationRecipient) {
        try {
          await sendInquiryNotification(
            { ...inquiry, service_name: serviceName },
            notificationRecipient,
            mailConfig
          );
          emailSent = true;
        } catch (mailErr) {
          console.error('Could not send inquiry notification:', mailErr.message || mailErr);
        }
      }

      try {
        await sendCustomerConfirmation({ ...inquiry, service_name: serviceName }, mailConfig);
        customerEmailSent = true;
      } catch (mailErr) {
        console.error('Could not send customer confirmation:', mailErr.message || mailErr);
      }
    }

    await pool.query(
      'UPDATE inquiries SET email_sent = $1, customer_email_sent = $2 WHERE id = $3',
      [emailSent, customerEmailSent, inquiry.id]
    );
    res.status(201).json({
      ...inquiry,
      email_sent: emailSent,
      customer_email_sent: customerEmailSent,
      service_name: serviceName,
    });
  } catch (err) {
    console.error('Could not create inquiry:', err.message || err);
    res.status(500).json({ error: 'could not create inquiry' });
  }
});

app.post('/api/admin/login', loginLimiter);
app.use('/api/admin', require('./admin')(pool));

async function start() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      content JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query('ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS customer_email_sent BOOLEAN');
  await pool.query('ALTER TABLE inquiries ALTER COLUMN customer_email_sent DROP NOT NULL, ALTER COLUMN customer_email_sent DROP DEFAULT');
  await pool.query('ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inquiry_replies (
      id SERIAL PRIMARY KEY,
      inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_settings (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      notification_email TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query('ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS smtp_user TEXT');
  await pool.query('ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS smtp_pass_encrypted TEXT');
  await pool.query(
    'INSERT INTO site_content (id, content) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING',
    [JSON.stringify(DEFAULT_SITE_CONTENT)]
  );
  app.listen(4000, () => console.log('API listening on port 4000'));
}

start().catch((err) => {
  console.error('Could not initialize database:', err.message || err);
  pool.end();
  process.exitCode = 1;
});
