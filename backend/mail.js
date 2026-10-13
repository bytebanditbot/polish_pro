const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = process.env;

function createTransporter(mailConfig) {
  const user = mailConfig?.user || SMTP_USER;
  const pass = mailConfig?.password || SMTP_PASS;
  if (!user || !pass) return null;

  if (mailConfig) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
    });
  }
  if (!SMTP_HOST) return null;
  const port = Number(SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function isConfigured(mailConfig) {
  return Boolean(createTransporter(mailConfig));
}

async function sendMail({ to, subject, html, text }, mailConfig) {
  const transporter = createTransporter(mailConfig);
  if (!transporter) {
    throw new Error('mail is not configured');
  }
  return transporter.sendMail({
    from: mailConfig?.user || MAIL_FROM || SMTP_USER,
    replyTo: mailConfig?.user || SMTP_USER,
    to,
    subject,
    html,
    text,
  });
}

// Mail credentials are encrypted with their own key (ENCRYPTION_KEY), separate from JWT_SECRET,
// so rotating the login-token secret never makes the stored Gmail password unreadable.
//   v2: encrypted with ENCRYPTION_KEY (current format)
//   v1: legacy format, encrypted with a key derived from JWT_SECRET (still readable, upgraded on first use)
const keyFromSecret = (secret) => crypto.createHash('sha256').update(secret).digest();

function currentKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY (at least 32 characters) is required for mail credentials. Generate one with: openssl rand -hex 32'
    );
  }
  return keyFromSecret(secret);
}

function legacyKey() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required to read mail credentials saved in the legacy format');
  }
  return keyFromSecret(process.env.JWT_SECRET);
}

const hasCurrentKey = () => Boolean(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32);

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', currentKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v2:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptSecret(value) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(':');
  if ((version !== 'v1' && version !== 'v2') || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Stored mail credential has an unsupported format');
  }
  const key = version === 'v2' ? currentKey() : legacyKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

async function getStoredMailConfig(pool) {
  const { rows } = await pool.query(
    'SELECT smtp_user, smtp_pass_encrypted FROM email_settings WHERE id = 1'
  );
  const row = rows[0];
  if (!row?.smtp_user || !row.smtp_pass_encrypted) return null;
  const password = decryptSecret(row.smtp_pass_encrypted);
  // Upgrade a legacy (v1) value to the dedicated key as soon as ENCRYPTION_KEY is available.
  if (row.smtp_pass_encrypted.startsWith('v1:') && hasCurrentKey()) {
    try {
      await pool.query(
        'UPDATE email_settings SET smtp_pass_encrypted = $1 WHERE id = 1 AND smtp_pass_encrypted = $2',
        [encryptSecret(password), row.smtp_pass_encrypted]
      );
    } catch (err) {
      console.error('Could not upgrade stored mail credential:', err.message || err);
    }
  }
  return { user: row.smtp_user, password };
}

async function getInquiryConversation(pool, inquiryId) {
  const mailConfig = await getStoredMailConfig(pool);
  const messages = [];
  const { rows: savedReplies } = await pool.query(
    'SELECT id, body, sent_at FROM inquiry_replies WHERE inquiry_id = $1 ORDER BY sent_at',
    [inquiryId]
  );
  if (!mailConfig && savedReplies.length === 0) {
    throw new Error('Gmail account is not configured');
  }

  if (mailConfig) {
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: mailConfig.user, pass: mailConfig.password },
      logger: false,
      socketTimeout: 30000,
    });

    await client.connect();
    try {
      const mailboxes = await client.list();
      const allMail = mailboxes.find((mailbox) => mailbox.specialUse === '\\All');
      const targetMailboxes = allMail
        ? [allMail]
        : mailboxes.filter((mailbox) => mailbox.specialUse === '\\Inbox' || mailbox.specialUse === '\\Sent');
      const marker = `[PP-${inquiryId}]`;

      for (const mailbox of targetMailboxes) {
        const lock = await client.getMailboxLock(mailbox.path);
        try {
          const uids = await client.search({ header: { subject: marker } }, { uid: true });
          if (uids.length === 0) continue;
          for await (const message of client.fetch(
            uids.join(','),
            { source: true, internalDate: true },
            { uid: true }
          )) {
            if (!message.source) continue;
            const parsed = await simpleParser(message.source);
            const sender = parsed.from?.value[0]?.address || '';
            const body = parsed.text?.trim() || '';
            if (!body) continue;
            messages.push({
              id: parsed.messageId || `${mailbox.path}-${message.uid}`,
              from: sender,
              to: parsed.to?.text || '',
              date: (parsed.date || message.internalDate || new Date()).toISOString(),
              subject: parsed.subject || '',
              body,
              direction: sender.toLowerCase() === mailConfig.user.toLowerCase() ? 'admin' : 'customer',
            });
          }
        } finally {
          lock.release();
        }
      }
    } finally {
      await client.logout();
    }
  }

  messages.push(...savedReplies.map((reply) => ({
    id: `saved-reply-${reply.id}`,
    from: mailConfig?.user || 'Polish Pro',
    to: '',
    date: new Date(reply.sent_at).toISOString(),
    subject: '',
    body: reply.body,
    direction: 'admin',
  })));
  return messages.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendInquiryNotification(inquiry, recipient, mailConfig) {
  if (!recipient) return null;

  const text = [
    'New inquiry received:',
    '',
    `Name: ${inquiry.customer_name}`,
    `Email: ${inquiry.customer_email}`,
    `Phone: ${inquiry.customer_phone || '—'}`,
    `Car: ${inquiry.car_model || '—'}`,
    `Service: ${inquiry.service_name || '—'}`,
    '',
    'Message:',
    inquiry.message,
  ].join('\n');

  return sendMail({
    to: recipient,
    subject: `New inquiry: ${inquiry.customer_name}`,
    text,
    html: `<h3>New inquiry received</h3><p><strong>Name:</strong> ${escapeHtml(inquiry.customer_name)}</p><p><strong>Email:</strong> ${escapeHtml(inquiry.customer_email)}</p><p><strong>Phone:</strong> ${escapeHtml(inquiry.customer_phone || '—')}</p><p><strong>Car:</strong> ${escapeHtml(inquiry.car_model || '—')}</p><p><strong>Service:</strong> ${escapeHtml(inquiry.service_name || '—')}</p><p><strong>Message:</strong><br>${escapeHtml(inquiry.message).replace(/\n/g, '<br>')}</p>`,
  }, mailConfig);
}

async function sendCustomerConfirmation(inquiry, mailConfig) {
  if (!inquiry.customer_email) return null;
  const serviceName = inquiry.service_name || 'votre service';
  const reference = `[PP-${inquiry.id}]`;
  const subject = `Demande de rendez-vous – ${serviceName} ${reference}`;

  const text = [
    `${subject} – Polish Pro`,
    '',
    'Merci pour votre confiance. Notre équipe vous contactera prochainement afin d’échanger avec vous et de confirmer les détails du rendez-vous.',
    '',
    `Nom : ${inquiry.customer_name}`,
    `E-mail : ${inquiry.customer_email}`,
    `Votre demande : ${inquiry.message}`,
  ].join('\n');

  return sendMail({
    to: inquiry.customer_email,
    subject,
    text,
    html: `<h3>Nous avons bien reçu votre demande de rendez-vous</h3><p>Merci pour votre confiance. Notre équipe vous contactera prochainement afin d’échanger avec vous et de confirmer les détails du rendez-vous.</p><p><strong>Nom :</strong> ${escapeHtml(inquiry.customer_name)}</p><p><strong>E-mail :</strong> ${escapeHtml(inquiry.customer_email)}</p><p><strong>Votre demande :</strong><br>${escapeHtml(inquiry.message).replace(/\n/g, '<br>')}</p>`,
  }, mailConfig);
}

module.exports = {
  isConfigured,
  encryptSecret,
  getStoredMailConfig,
  getInquiryConversation,
  sendInquiryNotification,
  sendCustomerConfirmation,
  sendMail,
};
