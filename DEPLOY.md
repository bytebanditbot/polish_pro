# Putting Polish Pro online

The production stack (`docker-compose.prod.yml`) runs four containers:

| Container | Role |
| --- | --- |
| `web` | Caddy: serves the built site, sends `/api` to the backend, gets and renews the HTTPS certificate by itself |
| `backend` | The API (not reachable from the internet, only through `web`) |
| `db` | PostgreSQL (not reachable from the internet) |
| `backup` | Saves the database and uploaded images every day into `./backups` |

Only ports 80 and 443 are open to the internet. The Vite dev server is not used.

## What you need

- A small Linux server (a VPS) with Docker and the Docker Compose plugin installed.
- A domain name, for example `polishpro.fr`, with an **A record** pointing to the server's IP address.
- Ports **80 and 443** open in the server's firewall (80 is needed for the certificate).

## First deployment

```bash
git clone https://github.com/bytebanditbot/polish_pro.git
cd polish_pro
cp .env.example .env
```

Edit `.env` and set real values (nothing in it should keep its `change_...` placeholder):

- `DOMAIN` — your domain without `https://`, for example `polishpro.fr`
- `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, `JWT_SECRET` — long random values
- `ENCRYPTION_KEY` — `openssl rand -hex 32` (keep a copy in a password manager: without it the saved Gmail password cannot be read)
- `SMTP_*`, `MAIL_FROM`, `MAIL_TO` — your mail settings

Then start everything:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Open `https://your-domain`. The first certificate takes a few seconds. If it does not appear, look at
`docker compose -f docker-compose.prod.yml logs web` (the usual cause is a DNS record that has not spread yet,
or port 80/443 closed).

To try the stack on your own computer first, keep `DOMAIN=localhost` and open `https://localhost`
(the browser will warn about a self-signed certificate; that is expected).

## Updating the site

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Data lives in Docker volumes (`pgdata`, `uploads`), so a rebuild does not erase it.

## Backups

The `backup` container writes to `./backups` every 24 hours and keeps 14 days:

- `db_YYYY-MM-DD_HHMM.dump` — the database
- `uploads_YYYY-MM-DD_HHMM.tar.gz` — images imported from the admin

These files are on the **same server**. If the server is lost, so are they. Copy `./backups` to another place
regularly, for example from your computer:

```bash
rsync -av user@your-server:~/polish_pro/backups/ ./polish-pro-backups/
```

Check the log from time to time: `docker compose -f docker-compose.prod.yml logs backup`.

### Restoring

```bash
# Database (replace the file name; this replaces the current data)
docker compose -f docker-compose.prod.yml exec -T db \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < backups/db_2026-10-13_0300.dump

# Images
docker compose -f docker-compose.prod.yml exec -T backend \
  tar xzf - -C /app/uploads < backups/uploads_2026-10-13_0300.tar.gz
```

Load your `.env` values into the shell first (or write the user and database names directly).
