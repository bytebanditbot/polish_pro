# Deploying Polish Pro on Vercel (site + API + database in one project)

One Vercel project serves the React site (static files) and the Express API (a single serverless
function, `api/index.js`). The existing Docker/VPS setup in `DEPLOY.md` still works unchanged.

Vercel has no database of its own: use **Neon Postgres** from the Vercel Marketplace (free plan is enough).

## 1. Database

Vercel dashboard -> your project -> **Storage** -> **Create Database** -> **Neon**. Connect it to the project:
this adds the `DATABASE_URL` environment variable. **Nothing else to do**: on the first request the API creates
the tables and the default services by itself (from `db/init.sql`, once, safe to restart).
`npm run db:init` still exists if you prefer to initialize the database by hand.

## 2. Environment variables (Vercel -> Settings -> Environment Variables)

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | set by the Neon integration |
| `ADMIN_PASSWORD` | your admin password |
| `JWT_SECRET` | long random value |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` - keep a copy: without it the saved Gmail password cannot be read |
| `SMTP_*`, `MAIL_FROM`, `MAIL_TO` | optional fallback mail settings (the admin "E-mail" page overrides them) |

## 3. Deploy

Import the GitHub repo in Vercel with the **Root Directory left empty**. `vercel.json` sets the build
command (`frontend/`), the output folder and the `/api/*` -> function rewrite.
Then check `https://YOUR-APP.vercel.app/api/health` -> `{"status":"ok"}`, open `/#/admin`,
log in and set the Gmail account under **E-mail**.

## What is different on Vercel

- **Uploaded images** are stored in the database (`uploads` table) and served from `/api/uploads/...`,
  because Vercel functions have no persistent disk. Maximum size is **4 MB** (Vercel rejects bigger request bodies).
  Images already uploaded on a VPS are not moved automatically.
- **Rate limiting** (login, inquiries) is in memory, so it is per function instance: it slows brute-force
  attempts but is not an exact global limit.
- **Gmail conversation sync** (IMAP) opens a new connection per request; the function timeout is set to 30 s.
- Cold starts re-run the idempotent schema checks once per instance; the very first request on an empty database also creates the tables.
- The Docker `backup` service does not apply here: use Neon's backups / point-in-time restore.
