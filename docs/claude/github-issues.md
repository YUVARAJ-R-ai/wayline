# Wayline — GitHub Project Issues
*Created by Claude Code, 2026-06-09 | Project board: YUVARAJ-R-ai/projects/2*

All 13 issues were filed on the `wayline` repo and added to the GitHub Project board.

---

## Sprint 1 — Bugs & Foundation

### Issue #1 — Fix DB connection in api-gateway (use DATABASE_URL)
**Label:** bug, sprint-1, backend

The Pool was configured using `POSTGRES_USER` and `POSTGRES_PASSWORD` env vars directly,
but docker-compose only passes `DATABASE_URL`. Causes `/api/roads` to silently fail.

**Fix applied:** `new Pool({ connectionString: process.env.DATABASE_URL })`

---

### Issue #2 — Fix syntax errors in postgres/init.sql
**Label:** bug, sprint-1, backend

Used `#` for a comment (invalid SQL) and `USER postgres` (invalid SQL).
Breaks container startup on a fresh build.

**Fix applied:** Both lines removed.

---

### Issue #3 — Add users and api_keys tables to init.sql
**Label:** sprint-1, backend

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INT DEFAULT 0
);
```

---

## Sprint 2 — Authentication

### Issue #4 — Add POST /auth/register endpoint to api-gateway
**Label:** sprint-2, backend

- Accept `{ email, password }`
- Hash password with `bcryptjs`
- Save to `users` table
- Return `201` on success, `409` if email already exists
- Install: `npm install bcryptjs jsonwebtoken uuid` in api-gateway/

---

### Issue #5 — Add POST /auth/login endpoint to api-gateway
**Label:** sprint-2, backend

- Accept `{ email, password }`
- Compare password hash using `bcrypt.compare()`
- On success, return a signed JWT via `jwt.sign()`
- JWT payload: `{ userId, email }`

---

### Issue #6 — Wire NextAuth to real DB instead of mock users
**Label:** sprint-2, frontend
**Repo:** `wayline-nextjs`

Replace the hardcoded `mockUsers` array in `frontend/lib/auth.ts`.
Call `fetch(process.env.BACKEND_URL + '/auth/login', ...)` inside `authorize()`.
Add `BACKEND_URL` to `frontend/.env.local`.

---

## Sprint 3 — API Key System

### Issue #7 — Add API key CRUD endpoints to api-gateway
**Label:** sprint-3, backend

- `POST /api/keys` — generate `wlk_` + UUID key, store SHA-256 hash, return plain key **once**
- `GET /api/keys` — list key prefixes for authenticated user (JWT required)
- `DELETE /api/keys/:prefix` — delete key by prefix (JWT required)

---

### Issue #8 — Add protectWithApiKey middleware
**Label:** sprint-3, backend

- Read `X-API-Key` header
- SHA-256 hash the incoming key
- Look up hash in `api_keys` table
- If found: call `next()` + increment `usage_count`
- If not found: return `401 Unauthorized`
- Apply to: `/api/route`, `/api/geocode`, `/api/reverse-geocode`

---

## Sprint 4 — Frontend

### Issue #9 — Wire up API Keys dashboard page
**Label:** sprint-4, frontend
**Repo:** `wayline-nextjs` — file: `frontend/app/dashboard/keys/page.tsx`

- `useEffect` to fetch `GET /api/keys` on mount (JWT in Authorization header)
- List key prefixes with Delete button
- Generate New Key button → `POST /api/keys` → show key in modal (one-time display warning)

---

### Issue #10 — Connect search bar to geocode API
**Label:** sprint-4, frontend
**Repo:** `wayline-nextjs` — file: `frontend/components/HomePageClient.tsx`

- On Enter/button click, call `GET /api/geocode?q=...`
- Pan map to returned coordinates
- Add marker at result location

---

### Issue #11 — Add click-to-route functionality to Map component
**Label:** sprint-4, frontend
**Repo:** `wayline-nextjs` — file: `frontend/components/Map.tsx`

- First click: set start point (green marker)
- Second click: set end point (red marker) + call `GET /api/route?from=lon,lat&to=lon,lat`
- Render returned GeoJSON as blue polyline
- Third click: reset and start over
- Include `X-API-Key` header in requests

---

## Sprint 5 — Infrastructure

### Issue #12 — Set up Cloudflare Tunnel for Vercel → local backend
**Label:** sprint-5, infrastructure

Vercel-hosted frontend cannot reach local backend directly (behind NAT).

```bash
cloudflared tunnel login
cloudflared tunnel create wayline-backend
cloudflared tunnel route dns wayline-backend api.yourdomain.com
```

Alternative for dev: `ngrok http 3000`

Output: a public HTTPS URL to use as `NEXT_PUBLIC_API_URL` in Vercel.

---

### Issue #13 — Configure NEXT_PUBLIC_API_URL for Vercel deployment
**Label:** sprint-5, infrastructure

1. Vercel dashboard → Settings → Environment Variables
2. `NEXT_PUBLIC_API_URL` = tunnel URL
3. `NEXTAUTH_URL` = Vercel deployment URL
4. `NEXTAUTH_SECRET` = `openssl rand -base64 32`
5. Update docker-compose CORS to allow Vercel domain
