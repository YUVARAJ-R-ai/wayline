# Wayline — Geospatial API Platform

Wayline is a self-hosted maps and routing platform. It provides a web UI for location search, turn-by-turn routing, and road data access, backed by an Express API, PostGIS database, and an OSRM routing engine — all running locally in Docker.

> **New to the team?** Read this file top to bottom before touching anything. It will save you hours.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Repository Structure](#2-repository-structure)
3. [API Endpoints](#3-api-endpoints)
4. [Frontend Pages](#4-frontend-pages)
5. [Prerequisites](#5-prerequisites)
6. [First-Time Setup](#6-first-time-setup)
7. [Running the App](#7-running-the-app)
8. [Environment Variables](#8-environment-variables)
9. [Daily Git Workflow](#9-daily-git-workflow)
10. [Branch Rules](#10-branch-rules)
11. [Common Errors and Fixes](#11-common-errors-and-fixes)
12. [Quick Reference Cheat Sheet](#12-quick-reference-cheat-sheet)
13. [Team](#13-team)

---

## 1. Architecture

The app is composed of **5 Docker services** that communicate over Docker's internal network:

```
  User's browser
       │
       ▼
┌─────────────────────────┐
│  frontend               │  Next.js 14 — login, home map, dashboard
│  localhost:8080         │  NextAuth JWT sessions
└────────────┬────────────┘
             │ HTTP  (NEXT_PUBLIC_API_URL=http://localhost:3000)
             ▼
┌─────────────────────────┐         ┌──────────────────────────┐
│  api-gateway            │────────▶│  routing_engine (OSRM)   │
│  localhost:3000         │         │  localhost:5001           │
│  Node.js / Express      │         │  MLD algorithm            │
└────────────┬────────────┘         │  southern-zone map data   │
             │                      └──────────────────────────┘
             │ DATABASE_URL
             ▼
┌─────────────────────────┐         ┌──────────────────────────┐
│  postgres_db            │◀────────│  postgres_ui (pgAdmin)   │
│  localhost:5432         │         │  localhost:8888           │
│  PostgreSQL + PostGIS   │         └──────────────────────────┘
│  + hstore extension     │
└─────────────────────────┘

External dependency: OpenCage Geocoding API (geocode + reverse-geocode endpoints)
```

### Service Summary

| Container | Image | Host Port | Internal Port | Role |
|-----------|-------|-----------|---------------|------|
| `wayline_frontend` | Custom (Next.js) | **8080** | 3000 | Web UI |
| `wayline_api_gateway` | Custom (Node.js) | **3000** | 3000 | REST API |
| `postgres_database` | Custom (PostGIS) | **5432** | 5432 | Spatial database |
| `postgres_ui` | `dpage/pgadmin4` | **8888** | 80 | DB admin UI |
| `osrm_router` | `osrm/osrm-backend` | **5001** | 5000 | Route calculation |

### Service Dependencies

```
frontend      → depends on: api-gateway (HTTP)
api-gateway   → depends on: postgres_db (healthcheck), routing_engine (HTTP)
postgres_ui   → depends on: postgres_db
routing_engine → standalone (needs ./data/osrm-data volume mounted)
```

---

## 2. Repository Structure

Everything lives in **one repository**. One clone gives you the full stack.

```
wayline/
├── api-gateway/
│   ├── app.js              ← Express entry point — all 4 API endpoints
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             ← Home page (full-screen map + search bar)
│   │   ├── login/page.tsx       ← Login form (NextAuth credentials)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx       ← Dashboard shell with sidebar nav
│   │   │   ├── page.tsx         ← Dashboard overview (placeholder)
│   │   │   └── keys/page.tsx    ← API keys page (placeholder)
│   │   └── api/auth/[...nextauth]/route.ts  ← NextAuth handler
│   ├── components/
│   │   ├── Map.tsx              ← Leaflet map (OSM tiles, SSR-disabled)
│   │   ├── HomePageClient.tsx   ← Client wrapper for home page
│   │   ├── SignOutButton.tsx    ← Sign-out button component
│   │   └── providers.tsx        ← NextAuth SessionProvider wrapper
│   ├── lib/auth.ts              ← NextAuth config (mock credentials provider)
│   ├── Dockerfile
│   └── package.json
│
├── postgres/
│   ├── Dockerfile               ← PostGIS image build
│   └── init.sql                 ← Enables postgis + hstore extensions on first run
│
├── data/                        ← OSRM map files (~7 GB, NOT in git)
│   └── osrm-data/
│       └── southern-zone-latest.osrm
│
├── geo_rev/                     ← Legacy Flask geocoding service (dead code, not wired)
│
├── docs/                        ← All project documentation
├── .claude/                     ← Claude Code skills for the team
├── CLAUDE.md                    ← Claude Code project instructions
├── docker-compose.yaml
└── .env                         ← Secrets (never commit this)
```

> **`data/`** is excluded from git — it holds the OSRM map files. Get them from the project lead.
> **`geo_rev/`** is legacy code that was never integrated. It will be removed in issue [#16](https://github.com/YUVARAJ-R-ai/wayline/issues/16).

---

## 3. API Endpoints

All endpoints are served by the **api-gateway** at `http://localhost:3000`.

### `GET /api/route`

Calculates a driving route between two coordinates using OSRM.

| Query param | Format | Example |
|-------------|--------|---------|
| `from` | `lon,lat` | `80.2707,13.0827` |
| `to` | `lon,lat` | `80.2500,13.0600` |

**Response:** GeoJSON geometry object (`type: "LineString"`, `coordinates: [[lon,lat],...]`)

**Note:** OSRM returns coordinates in `[lon, lat]` order. Leaflet's `<Polyline>` expects `[lat, lon]` — always reverse before rendering.

```bash
curl "localhost:3000/api/route?from=80.2707,13.0827&to=80.2500,13.0600"
```

---

### `GET /api/geocode`

Converts a text search query to coordinates via the OpenCage API.

| Query param | Type | Example |
|-------------|------|---------|
| `q` | string | `Chennai Central` |

**Response:** `{ lat, lng, address }`

```bash
curl "localhost:3000/api/geocode?q=Chennai+Central"
```

---

### `GET /api/reverse-geocode`

Converts coordinates to a human-readable address via OpenCage.

| Query param | Type | Example |
|-------------|------|---------|
| `lat` | number | `13.0827` |
| `lng` | number | `80.2707` |

**Response:** `{ address }`

```bash
curl "localhost:3000/api/reverse-geocode?lat=13.0827&lng=80.2707"
```

---

### `GET /api/roads`

Returns up to 1000 road features from PostGIS as a GeoJSON FeatureCollection.

**Response:** `{ type: "FeatureCollection", features: [{ type: "Feature", properties: { id, type }, geometry }] }`

Queries `planet_osm_line` where `highway IS NOT NULL`. Requires OSM road data to be imported into PostgreSQL.

```bash
curl "localhost:3000/api/roads"
```

---

## 4. Frontend Pages

| Route | Auth required | Status | What it does |
|-------|--------------|--------|--------------|
| `/` | No | Working | Full-screen Leaflet map with search bar and Sign In button |
| `/login` | No | Working | NextAuth credentials login. Dev credentials: `admin@wayline.com` / `password` |
| `/dashboard` | Yes | Placeholder | Dashboard overview shell — content to be built |
| `/dashboard/keys` | Yes | Placeholder | API keys management — not yet implemented |

**Auth flow:**
- Unauthenticated users visiting `/` are shown the map with a Sign In button
- Unauthenticated users visiting `/dashboard` are redirected to `/login`
- Sessions are JWT-based (NextAuth, no database session storage)
- Currently uses a hardcoded mock user — real user table not yet wired

**Map component (`components/Map.tsx`):**
- Leaflet + react-leaflet, dynamically imported (SSR disabled)
- OpenStreetMap tiles
- Default center: Chennai area

---

## 5. Prerequisites

Install all of these before cloning. Skip any you already have.

| Tool | Version | Install |
|------|---------|---------|
| Git | any | https://git-scm.com/downloads |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |
| Node.js | 18+ | https://nodejs.org (LTS) |
| `gh` CLI | 2.x | See [docs/setup-gh-and-claude.md](docs/setup-gh-and-claude.md) |

Verify:
```bash
git --version
docker --version
node --version    # must be 18+
gh --version
```

---

## 6. First-Time Setup

Do these steps **once** when you first join the project.

### Step 1 — Clone

```bash
git clone git@github.com:YUVARAJ-R-ai/wayline.git
cd wayline
git checkout dev          # never work on main
```

### Step 2 — One-time git config

```bash
git config pull.rebase false
```

Prevents `fatal: Need to specify how to reconcile divergent branches`.

### Step 3 — Create the `.env` file

Ask the project lead (Yuvaraj) for the values, then:

```bash
cp .env.example .env
# Fill in the values
```

Required variables:

```env
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
PGADMIN_DEFAULT_EMAIL=
PGADMIN_DEFAULT_PASSWORD=
OPENCAGE_API_KEY=
```

> Get a free OpenCage key at https://opencagedata.com — 2500 req/day free tier.

### Step 4 — Get the OSRM map data

The routing engine needs ~7 GB of pre-processed map files not stored in git.

Ask Yuvaraj for `osrm-data.tar.gz`, then:

```bash
mkdir -p data
tar -xzvf osrm-data.tar.gz -C data/
# Results in: data/osrm-data/southern-zone-latest.osrm  (+ sibling files)
```

### Step 5 — Install backend dependencies (for local dev without Docker)

```bash
cd api-gateway && npm install && cd ..
cd frontend && npm install && cd ..
```

---

## 7. Running the App

```bash
# Start all 5 services (run from repo root, Docker must be open)
docker-compose up --build
```

First run downloads images and builds containers — takes 5–10 minutes. Subsequent starts take ~30 seconds.

**Verify everything started:**

| URL | Expected |
|-----|----------|
| http://localhost:8080 | Wayline home page — full-screen map |
| http://localhost:3000/api/geocode?q=Chennai | JSON response with lat/lng |
| http://localhost:8888 | pgAdmin login page |

**Stop:**
```bash
docker-compose down
```

**Stop and wipe the database:**
```bash
docker-compose down -v    # ⚠️ destroys postgres_data volume — ask lead first
```

### Known limitations (current sprint)

| Issue | Status |
|-------|--------|
| Search bar on home page — no results yet | Issue [#18](https://github.com/YUVARAJ-R-ai/wayline/issues/18) |
| Dashboard is a placeholder card | Issue [#18](https://github.com/YUVARAJ-R-ai/wayline/issues/18) |
| Auth uses a hardcoded mock user | Issue [#17](https://github.com/YUVARAJ-R-ai/wayline/issues/17) |
| `geo_rev/` folder is dead code | Issue [#16](https://github.com/YUVARAJ-R-ai/wayline/issues/16) |
| OSRM URL is hardcoded in `app.js` (ignores env var) | Issue [#16](https://github.com/YUVARAJ-R-ai/wayline/issues/16) |

---

## 8. Environment Variables

### Root `.env` (consumed by docker-compose)

| Variable | Used by | What it is |
|----------|---------|-----------|
| `POSTGRES_DB` | postgres_db, api-gateway | Database name |
| `POSTGRES_USER` | postgres_db, api-gateway | DB username |
| `POSTGRES_PASSWORD` | postgres_db, api-gateway | DB password |
| `PGADMIN_DEFAULT_EMAIL` | postgres_ui | pgAdmin login email |
| `PGADMIN_DEFAULT_PASSWORD` | postgres_ui | pgAdmin login password |
| `OPENCAGE_API_KEY` | api-gateway | Key for geocoding/reverse-geocode calls |

### `frontend/.env.local` (consumed by Next.js)

| Variable | Value | What it is |
|----------|-------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Base URL for API calls from the browser |
| `NEXTAUTH_URL` | `http://localhost:8080` | Must match the frontend port, not the API port |
| `NEXTAUTH_SECRET` | any random string | Signs NextAuth JWTs |

> **Important:** `NEXTAUTH_URL` must be `http://localhost:8080` (frontend port). Setting it to `3000` (the API port) breaks sign-out redirects.

---

## 9. Daily Git Workflow

Follow these steps every time you sit down to work.

```bash
# 1. Pull latest before writing a single line
git checkout dev
git pull origin dev

# 2. Create a branch for your task
git checkout -b feature/issue-N-short-description

# 3. Work, then commit in small chunks (never git add .)
git add api-gateway/app.js
git commit -m "issue #N: short description"

# 4. Push your branch
git push origin feature/issue-N-short-description

# 5. When done — run the app, verify, then merge into dev
git checkout dev
git pull origin dev
git merge --no-ff feature/issue-N-short-description -m "issue #N: merge"
git push origin dev

# 6. Raise PR from dev → main (project lead reviews)
gh pr create --base main --head dev --title "issue #N: ..." --body "Closes #N"

# 7. Clean up after merge
git branch -d feature/issue-N-short-description
```

> **Never use `git add .`** — the `data/` folder is ~7 GB. Always add specific files.

> **Never push directly to `main`** — it is branch-protected. Only the lead merges via PR.

Using Claude Code? Run `/start-task` to handle all of this automatically.

---

## 10. Branch Rules

| Branch | Purpose | Push directly? |
|--------|---------|---------------|
| `main` | Stable, production-ready | ❌ Protected — PR + review only |
| `dev` | Active development | ❌ Merge feature branches in |
| `feature/issue-N-*` | Your work | ✅ This is your branch |
| `fix/issue-N-*` | Bug fixes | ✅ This is your branch |

Flow:
```
feature/issue-N → merge into dev → PR from dev → main (lead only)
```

---

## 11. Common Errors and Fixes

### `rejected — fetch first` on git push
```bash
git pull origin dev
git push origin dev
```

### `fatal: Need to specify how to reconcile divergent branches`
```bash
git config pull.rebase false    # permanent fix
git pull --no-rebase origin dev # one-time fix
```

### `Please commit your changes or stash them before you merge`
```bash
git stash
git pull origin dev
git stash pop
```

### Merge conflict
1. Open the conflicting file, find `<<<<<<< HEAD` markers
2. Keep the correct version, delete the markers
3. `git add the-file.js && git commit`

### Docker container won't start
1. Make sure Docker Desktop is open and shows "Engine running"
2. Check terminal logs for the specific error
3. Try: `docker-compose down && docker-compose up --build`

### `routing_engine` exits immediately
The OSRM data files are missing or in the wrong path. Check:
```bash
ls data/osrm-data/southern-zone-latest.osrm
```
If missing, get the data from Yuvaraj and re-extract.

### pgAdmin shows "connection refused" for the server
The server entry in pgAdmin needs to use the Docker hostname `postgres_database`, not `localhost`.
- Host: `postgres_database`
- Port: `5432`
- Username / Password: from your `.env`

### `OPENCAGE_API_KEY` missing warning in api-gateway logs
Add your key to `.env`. Get a free key at https://opencagedata.com.

---

## 12. Quick Reference Cheat Sheet

```bash
# === SETUP (once) ===
git clone git@github.com:YUVARAJ-R-ai/wayline.git && cd wayline
git checkout dev
git config pull.rebase false
cp .env.example .env   # fill in values

# === EVERY WORK SESSION ===
git checkout dev && git pull origin dev

# === START A TASK ===
git checkout -b feature/issue-N-description

# === SAVE PROGRESS ===
git add path/to/file.js
git commit -m "issue #N: what you did"

# === RUN THE APP ===
docker-compose up --build      # start everything
docker-compose down            # stop
docker-compose down -v         # stop + wipe DB

# === DONE — MERGE AND RAISE PR ===
git checkout dev && git pull origin dev
git merge --no-ff feature/issue-N-description -m "issue #N: merge"
git push origin dev
gh pr create --base main --head dev --title "issue #N: ..." --body "Closes #N"
git branch -d feature/issue-N-description

# === PROJECT BOARD ===
# https://github.com/users/YUVARAJ-R-ai/projects/2
```

---

## 13. Team

| Person | GitHub | Role |
|--------|--------|------|
| Yuvaraj | [@YUVARAJ-R-ai](https://github.com/YUVARAJ-R-ai) | Project lead — all areas, merges to main |
| Indhra | [@Indhracha-05](https://github.com/Indhracha-05) | Backend + Frontend |

---

*Questions? Open an issue on the repo or message the lead directly.*
