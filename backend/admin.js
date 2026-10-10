const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validateService, validateSiteContent } = require('./site-content');
const {
  encryptSecret,
  getInquiryConversation,
} = require('./mail');

module.exports = function adminRouter(pool) {
  const router = express.Router();
  const { ADMIN_PASSWORD, JWT_SECRET } = process.env;

  const safeEqual = (a, b) => {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    if (left.length !== right.length) return false;
    try {
      return crypto.timingSafeEqual(left, right);
    } catch {
      return false;
    }
  };

  router.post('/login', (req, res) => {
    if (!ADMIN_PASSWORD || !JWT_SECRET) {
      return res.status(500).json({ error: 'La connexion administrateur n’est pas configurée.' });
    }
    const { password } = req.body || {};
    if (!password || !safeEqual(password, ADMIN_PASSWORD)) {
      return res.status(401).json({ error: 'Mot de passe incorrect.' });
    }
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  });

  router.post('/verify-password', requireAdmin, (req, res) => {
    const { password } = req.body || {};
    if (!password || !safeEqual(password, ADMIN_PASSWORD || '')) {
      return res.status(401).json({ error: 'wrong password' });
    }
    res.json({ ok: true });
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

  router.get('/content', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT content, updated_at FROM site_content WHERE id = 1');
      if (rows.length === 0) return res.status(500).json({ error: 'Le contenu du site n’est pas initialisé.' });
      res.json(rows[0]);
    } catch (err) {
      console.error('Could not load admin site content:', err.message || err);
      res.status(500).json({ error: 'Impossible de charger le contenu du site.' });
    }
  });

  router.get('/email-sender', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT smtp_user, smtp_pass_encrypted FROM email_settings WHERE id = 1'
      );
      res.json({
        email: rows[0]?.smtp_user || '',
        configured: Boolean(rows[0]?.smtp_user && rows[0]?.smtp_pass_encrypted),
      });
    } catch (err) {
      console.error('Could not load email sender settings:', err.message || err);
      res.status(500).json({ error: 'Impossible de charger le compte Gmail.' });
    }
  });

  router.put('/email-sender', requireAdmin, async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const appPassword = typeof req.body?.app_password === 'string'
      ? req.body.app_password.replace(/\s/g, '')
      : '';
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/@(gmail\.com|googlemail\.com)$/i.test(email)
    ) {
      return res.status(400).json({ error: 'Saisissez une adresse Gmail valide.' });
    }
    if (appPassword && !/^[a-zA-Z0-9]{16}$/.test(appPassword)) {
      return res.status(400).json({ error: 'Le mot de passe d’application Google doit contenir 16 caractères.' });
    }

    try {
      const { rows } = await pool.query(
        'SELECT smtp_user, smtp_pass_encrypted FROM email_settings WHERE id = 1'
      );
      const existing = rows[0];
      const passwordUnchanged = existing?.smtp_user?.toLowerCase() === email.toLowerCase()
        && Boolean(existing.smtp_pass_encrypted);
      if (!appPassword && !passwordUnchanged) {
        return res.status(400).json({ error: 'Saisissez le mot de passe d’application pour ce compte Gmail.' });
      }
      const encryptedPassword = appPassword
        ? encryptSecret(appPassword)
        : existing.smtp_pass_encrypted;
      await pool.query(
        `INSERT INTO email_settings (id, smtp_user, smtp_pass_encrypted, updated_at)
         VALUES (1, $1, $2, now())
         ON CONFLICT (id) DO UPDATE
           SET smtp_user = EXCLUDED.smtp_user,
               smtp_pass_encrypted = EXCLUDED.smtp_pass_encrypted,
               updated_at = now()`,
        [email, encryptedPassword]
      );
      res.json({ email, configured: true });
    } catch (err) {
      console.error('Could not save email sender settings:', err.message || err);
      res.status(500).json({ error: 'Impossible d’enregistrer le compte Gmail.' });
    }
  });

  router.put('/content', requireAdmin, async (req, res) => {
    const validationError = validateSiteContent(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
      const { rows } = await pool.query(
        `INSERT INTO site_content (id, content, updated_at)
         VALUES (1, $1::jsonb, now())
         ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = now()
         RETURNING content, updated_at`,
        [JSON.stringify(req.body)]
      );
      res.json(rows[0]);
    } catch (err) {
      console.error('Could not save admin site content:', err.message || err);
      res.status(500).json({ error: 'Impossible d’enregistrer le contenu du site.' });
    }
  });

  router.post('/services', requireAdmin, async (req, res) => {
    const validationError = validateService(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    try {
      const { name, description, price_eur, duration_min } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO services (name, description, price_eur, duration_min)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, price_eur, duration_min`,
        [name.trim(), description.trim(), price_eur, duration_min]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Could not create service:', err.message || err);
      res.status(500).json({ error: 'Impossible de créer le service.' });
    }
  });

  router.put('/services/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const validationError = validateService(req.body);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'L’identifiant du service doit être un entier positif.' });
    if (validationError) return res.status(400).json({ error: validationError });
    try {
      const { name, description, price_eur, duration_min } = req.body;
      const { rows } = await pool.query(
        `UPDATE services SET name = $2, description = $3, price_eur = $4, duration_min = $5
         WHERE id = $1
         RETURNING id, name, description, price_eur, duration_min`,
        [id, name.trim(), description.trim(), price_eur, duration_min]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Service introuvable.' });
      res.json(rows[0]);
    } catch (err) {
      console.error('Could not update service:', err.message || err);
      res.status(500).json({ error: 'Impossible de modifier le service.' });
    }
  });

  router.delete('/services/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'L’identifiant du service doit être un entier positif.' });
    try {
      const { rows } = await pool.query('DELETE FROM services WHERE id = $1 RETURNING id', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Service introuvable.' });
      res.status(204).end();
    } catch (err) {
      if (err.code === '23503') {
        return res.status(409).json({ error: 'Ce service est associé à des rendez-vous ou demandes existants et ne peut pas être supprimé.' });
      }
      console.error('Could not delete service:', err.message || err);
      res.status(500).json({ error: 'Impossible de supprimer le service.' });
    }
  });

  router.get('/inquiries', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT i.id, i.customer_name, i.customer_email, i.customer_phone, i.car_model,
                i.message, i.status, i.archived, i.email_sent, i.customer_email_sent, i.created_at,
                s.name AS service_name, s.price_eur AS service_price_eur,
                s.duration_min AS service_duration_min
           FROM inquiries i
           LEFT JOIN services s ON s.id = i.service_id
          ORDER BY i.created_at DESC`
      );
      res.json(rows);
    } catch {
      res.status(500).json({ error: 'Impossible de charger les demandes.' });
    }
  });

  router.get('/inquiries/:id/conversation', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Identifiant de demande invalide.' });
    }
    try {
      const { rows } = await pool.query('SELECT id FROM inquiries WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Demande introuvable.' });
      const messages = await getInquiryConversation(pool, id);
      res.json(messages);
    } catch (err) {
      console.error('Could not load Gmail conversation:', err.message || err);
      const authError = err.code === 'AUTHENTICATIONFAILED' || err.code === 'EAUTH';
      const notConfigured = err.message === 'Gmail account is not configured';
      res.status(authError ? 502 : 503).json({
        error: notConfigured
          ? 'Configurez le compte Gmail dans Admin → E-mail pour synchroniser la conversation.'
          : authError
            ? 'Gmail a refusé la connexion IMAP. Vérifiez que l’accès IMAP est disponible pour ce compte et que son mot de passe d’application est valide.'
            : 'Impossible de synchroniser la conversation Gmail. Vérifiez la configuration Gmail et réessayez.',
      });
    }
  });

  router.delete('/inquiries/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Identifiant de demande invalide.' });
    }
    try {
      const { rows } = await pool.query('DELETE FROM inquiries WHERE id = $1 RETURNING id', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Demande introuvable.' });
      res.status(204).end();
    } catch (err) {
      console.error('Could not delete inquiry:', err.message || err);
      res.status(500).json({ error: 'Impossible de supprimer la demande.' });
    }
  });

  // new <-> handled, so a mistake can always be reversed
  router.patch('/inquiries/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const { status, archived } = req.body || {};
    if (
      !Number.isInteger(id) ||
      (status !== undefined && !['new', 'handled'].includes(status)) ||
      (archived !== undefined && typeof archived !== 'boolean') ||
      (status === undefined && archived === undefined)
    ) {
      return res.status(400).json({ error: 'Statut ou archive invalide.' });
    }
    try {
      const { rows } = await pool.query(
        `UPDATE inquiries
            SET status = COALESCE($2, status),
                archived = COALESCE($3, archived)
          WHERE id = $1
          RETURNING id, status, archived`,
        [id, status ?? null, archived ?? null]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Demande introuvable.' });
      res.json(rows[0]);
    } catch {
      res.status(500).json({ error: 'Impossible de modifier la demande.' });
    }
  });

  return router;
};
