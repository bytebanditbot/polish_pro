const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const UPLOAD_URL_PREFIX = '/api/uploads/';
// On Vercel (no persistent disk) images are stored in the database instead of UPLOAD_DIR.
// Set UPLOAD_STORAGE=db to use the database elsewhere too.
const USE_DB_UPLOADS = Boolean(process.env.VERCEL) || process.env.UPLOAD_STORAGE === 'db';
// Vercel functions reject request bodies above 4.5 MB, so stay below that.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const IMAGE_TYPES = {
  'image/jpeg': { ext: '.jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  'image/png': { ext: '.png', magic: (b) => b.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) },
  'image/webp': { ext: '.webp', magic: (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' },
  'image/gif': { ext: '.gif', magic: (b) => b.slice(0, 3).toString() === 'GIF' },
};

module.exports = { UPLOAD_DIR, UPLOAD_URL_PREFIX, USE_DB_UPLOADS, MAX_UPLOAD_BYTES, IMAGE_TYPES };
