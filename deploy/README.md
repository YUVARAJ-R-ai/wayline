# Wayline — Deployment & CI/CD

This directory holds everything needed to run Wayline in production on the
self-hosted server and to deploy it automatically via GitHub Actions.

## Architecture

```
                 Internet / Tailscale / LAN
                            │
                       :80  ▼
                 ┌─────────────────────┐
                 │  nginx (container)   │  reverse_proxy
                 │  same-origin routing │
                 └──────────┬──────────┘
            /api/auth/ , /  │  /api/* , /auth/*
                  ┌─────────┴──────────┐
                  ▼                    ▼
          ┌──────────────┐    ┌──────────────────┐
          │  frontend    │    │  api-gateway      │
          │  Next.js     │    │  Express          │
          └──────────────┘    └───────┬───────────┘
                                       │
                        ┌──────────────┼───────────────┐
                        ▼              ▼                ▼
                 postgres_db    routing_engine     OpenCage API
                 (PostGIS)      (OSRM, MLD)        (external)
```

Only the nginx container publishes a host port (`80`). Postgres (`5432`) and
pgAdmin (`8888`) are bound to `127.0.0.1` only.

## Files

| File | Purpose |
|------|---------|
| `../docker-compose.prod.yaml` | Self-contained production stack |
| `../frontend/Dockerfile.prod` | Multi-stage Next.js standalone build |
| `nginx/wayline.conf` | Reverse-proxy + same-origin routing |
| `deploy.sh` | Pull + build + restart (run by the CI runner) |
| `../.github/workflows/ci.yml` | Build/lint checks on PRs to dev/main |
| `../.github/workflows/deploy.yml` | Auto-deploy on push to main (self-hosted) |

## One-time server setup

1. **Clone** to `/srv/wayline` (already done) using the SSH deploy key.

2. **Create `.env`** from the template and fill in real secrets:
   ```bash
   cd /srv/wayline
   cp .env.example .env
   # edit .env — set strong POSTGRES_PASSWORD, PGADMIN password,
   # OPENCAGE_API_KEY, and a JWT_SECRET (openssl rand -hex 32).
   # set OSRM_DATA_DIR=/data/wayline/osrm-data
   ```

3. **OSRM map data** must exist at `OSRM_DATA_DIR` and contain
   `southern-zone-latest.osrm` plus its companion files.

4. **Docker group:** the deploy user must be in the `docker` group
   (`sudo usermod -aG docker <user>`), then re-login.

5. **Install the self-hosted runner** (see below).

## Self-hosted GitHub Actions runner

The server sits behind NAT, so the runner *dials out* to GitHub — no inbound
ports or port-forwarding needed.

```bash
# On the server, as the deploy user:
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o runner.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-x64-2.319.1.tar.gz
tar xzf runner.tar.gz

# Get a registration token:
#   gh api -X POST repos/YUVARAJ-R-ai/wayline/actions/runners/registration-token --jq .token
./config.sh --url https://github.com/YUVARAJ-R-ai/wayline \
  --token <REGISTRATION_TOKEN> \
  --name wayline-server --labels wayline --unattended

# Install + start as a systemd service so it survives reboots:
sudo ./svc.sh install <deploy-user>
sudo ./svc.sh start
```

The deploy workflow targets `runs-on: [self-hosted, wayline]`, matching the
`wayline` label above.

## Manual deploy

```bash
/srv/wayline/deploy/deploy.sh
```

## Day-to-day

```bash
cd /srv/wayline
docker compose -f docker-compose.prod.yaml ps          # status
docker compose -f docker-compose.prod.yaml logs -f api-gateway
docker compose -f docker-compose.prod.yaml down         # stop
```

## Exposing the app

The stack listens on host port `80`. Choose how to reach it:

- **Tailscale** (already installed): browse to `http://100.117.185.51/`
  from any device on your tailnet. Private, zero router config.
- **LAN:** `http://192.168.0.112/` from the local network.
- **Public:** forward router port 80 → `192.168.0.112:80`, ideally with
  dynamic-DNS (residential IP). Add HTTPS once a domain points at it
  (Let's Encrypt cannot issue certs for a bare IP).
- **Cloudflare Tunnel:** public HTTPS URL without port-forwarding.

## TLS / HTTPS

HTTPS needs a domain name. Once you have one pointing at the server, add a
certbot/Caddy sidecar or terminate TLS at Cloudflare, and update
`nginx/wayline.conf` to listen on 443.
