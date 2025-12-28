# Single VPS Deployment (Docker Compose)

These steps target Ubuntu 22.04 and a single VPS.

## 1) Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
```

## 2) Clone and configure

```bash
git clone https://github.com/ALQASEER93/dopamine-crm-suite-playground.git
cd dopamine-crm-suite-playground
cp .env.prod.example .env.prod
```

Edit `.env.prod` and set strong secrets (especially `POSTGRES_PASSWORD` and `JWT_SECRET`).

## 3) Optional: set a domain

By default Caddy listens on `:80`. To use a domain + HTTPS, edit `Caddyfile` and
replace `:80` with your domain (example: `crm.example.com`).

## 4) Build and run

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 5) Verify

```bash
curl -fsS http://<server-ip>/api/v1/health
```

## 6) Database backups (daily)

```bash
chmod +x scripts/backup_db_daily.sh
./scripts/backup_db_daily.sh
```

Example cron entry (daily at 2 AM):

```bash
crontab -e
# add:
0 2 * * * /bin/bash /path/to/dopamine-crm-suite-playground/scripts/backup_db_daily.sh
```
