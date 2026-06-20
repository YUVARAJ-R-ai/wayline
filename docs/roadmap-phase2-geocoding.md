# Roadmap — Phase 2: Custom Geocoding & Dynamic Data Pipeline

> **Status:** Planned (not yet active work). These are *future-phase* tasks. They start once the current MVP issues (#6–#18) are mostly closed. This document explains each task so it can be turned into GitHub issues later via `/new-issue` or `/plan-project sprint`.

---

## Why this phase exists

Today Wayline geocodes addresses by calling the **OpenCage** third-party API (`/api/geocode`, `/api/reverse-geocode`). That works for an MVP but has three limits:

1. **No control over data** — coverage, ranking, and place names are OpenCage's, not ours
2. **No custom data** — we can't index our own POIs, regional datasets, or business records
3. **External dependency** — rate limits, costs, and an outside service in the request path

Phase 2 replaces OpenCage with our **own geocoding engine** — [Pelias](https://github.com/pelias/pelias) backed by **Elasticsearch** — plus a **dynamic ETL pipeline** that can ingest *any* geographic dataset (CSV, shapefile, GeoJSON, PostGIS), normalize it, and index it for search.

**Routing stays on OSRM** — it's best-in-class open source and is not changing. This phase is geocoding/data only.

---

## Target architecture

```
 Data sources (CSV, shapefile, GeoJSON, PostGIS, feeds)
        │
        ▼
 ETL pipeline (Python: GeoPandas + Shapely)   ← normalize to EPSG:4326, clean, structure
        │  bulk index
        ▼
 Elasticsearch  ◀── Pelias (geocoding engine reads/writes ES indexes)
        ▲
        │ HTTP
 api-gateway (Express)   /api/geocode → Pelias   (was: OpenCage)
                         /api/route   → OSRM      (unchanged)
                         /api/data/import → triggers ETL
```

---

## Tasks

Each task below is issue-ready. **Domain ownership** follows the same conflict-free rule as Phase 1: backend/infra/data → **@sarathy-cloud** (Indhra stays on frontend). New Python files under `etl/` don't touch existing code, so they're conflict-free regardless of owner.

---

### A. Stand up Elasticsearch + Pelias in Docker Compose
**Type:** infra · **Size:** M · **Owner:** @sarathy-cloud · **Touches:** `docker-compose.yaml`, new `pelias.json`

**What:** Add two services to `docker-compose.yaml` — an `elasticsearch` container (single-node, capped heap) and a `pelias` container that reads its config from a mounted `pelias.json`. Expose ES on `9200` and Pelias on `3100`.

**Why:** Nothing else in this phase works without the index store (ES) and the geocoding engine (Pelias) running. This is the foundation.

**How / acceptance:**
- `elasticsearch:8.x` with `discovery.type=single-node` and `ES_JAVA_OPTS=-Xms512m -Xmx512m`
- `pelias` service with `PELIAS_CONFIG=/etc/pelias/pelias.json`, `depends_on: elasticsearch`
- A named volume for ES data so indexes survive restarts
- `docker-compose up` brings both up cleanly; `curl localhost:9200` returns ES info; `curl localhost:3100` responds
- ES heap is capped so it doesn't starve OSRM/Postgres on a dev machine

**Dependencies:** none — start here.

---

### B. Build the dynamic ETL normalizer (Python)
**Type:** data · **Size:** L · **Owner:** @sarathy-cloud · **Touches:** **new** `etl/` directory only

**What:** A Python service (`etl/normalizer.py`) that loads geographic data from multiple formats, normalizes it to a common schema, and bulk-indexes it into Elasticsearch.

**Why:** This is the "handle any kind of data" engine. It's what makes the system *ours* — feed it a shapefile of roads or a CSV of businesses and it produces clean, searchable indexes.

**How / acceptance:**
- Loaders for **CSV** (lat/lon columns), **shapefile**, **GeoJSON**, and **PostGIS** → all via GeoPandas/Fiona
- **Normalize:** reproject everything to `EPSG:4326`, add `dataset`, `indexed_at`, `geometry_type`; simplify oversized polygons (Shapely, ~100-vertex target) so ES queries stay fast
- **Index:** bulk-write documents to a named ES index via `elasticsearch-py` helpers
- `etl/requirements.txt` pins versions; `etl/Dockerfile` containerizes it
- Acceptance: importing a sample CSV **and** a sample shapefile each produce a queryable ES index with correct WGS84 coordinates and no memory blow-up on large files (stream with Fiona, process in chunks)

**Dependencies:** A (needs ES running).

**Note:** This is **deterministic** parsing — no LLM. Structured data (known columns, standard geometry) should never go through an LLM; it's 100× slower and risks hallucinated coordinates. See task E for where an LLM *does* help.

---

### C. Swap `/api/geocode` + `/api/reverse-geocode` from OpenCage to Pelias
**Type:** backend · **Size:** M · **Owner:** @sarathy-cloud · **Touches:** `api-gateway/app.js`

**What:** Repoint the two geocoding endpoints at the local Pelias service instead of the OpenCage HTTP API. Keep the **same request/response contract** so the frontend (#10, #18) needs zero changes.

**Why:** This is the actual cut-over to our own engine. Because the endpoint shape stays identical, it's a drop-in from the frontend's perspective.

**How / acceptance:**
- `/api/geocode?q=...` → `GET http://pelias:3100/v1/search?text=<q>` → map Pelias's GeoJSON features to the existing `{ lat, lng, address }` shape
- `/api/reverse-geocode?lat=&lng=` → `GET http://pelias:3100/v1/reverse?point.lat=&point.lon=` → existing `{ address }` shape
- Read the Pelias base URL from `PELIAS_URL` env var (don't hardcode), mirroring how OSRM should use `OSRM_URL` (#16)
- Remove the OpenCage key dependency from these two routes
- Acceptance: existing frontend search + reverse lookups work unchanged; responses come from Pelias; `OPENCAGE_API_KEY` no longer needed for geocoding

**Dependencies:** A (Pelias running) and at least one indexed dataset (B) so search returns results.

---

### D. Add `POST /api/data/import` to trigger the ETL
**Type:** backend · **Size:** S · **Owner:** @sarathy-cloud · **Touches:** `api-gateway/app.js`

**What:** An endpoint that kicks off the Python ETL for a given dataset/file/format and reports status, so data can be imported without SSH-ing into the box.

**Why:** Turns the ETL from a manual script into a usable platform feature — the start of a "bring your own data" capability.

**How / acceptance:**
- `POST /api/data/import` with `{ dataset_name, file_path, format }` → invokes the ETL (child process or a small job queue) → returns a job/status response
- Protected by the API-key middleware (#8) or JWT — not public
- Acceptance: posting a valid import request indexes the file and the data becomes searchable via `/api/geocode`; bad input returns 400, not a crash

**Dependencies:** B (the ETL) and C (so imported data is searchable). Same owner as #8 — sequence the `app.js` edits.

---

### E. *(Optional, ~Week 2)* LLM-assisted normalization for messy data
**Type:** AI/data · **Size:** M · **Owner:** @sarathy-cloud · **Touches:** **new** `etl/` files

**What:** A LangChain/LangGraph agent that handles the **20% of inputs that deterministic parsing can't** — free-text locations ("near the old temple, Kilpauk"), inconsistent address formats, entity de-duplication ("NH44" = "National Highway 44"), and data-quality flagging.

**Why:** Structured data → deterministic (task B). But real-world data is often messy. An LLM is genuinely useful for extraction/cleaning/matching where rules fail. Run it on a **local model via Ollama** (e.g. `mistral:7b`) on the gaming-PC GPU — no per-token cloud cost, no data leaving your network.

**How / acceptance:**
- A hybrid router: structured input → task B's deterministic path; messy input → the LLM path
- LLM extracts `{ name, lat, lng, confidence }` from free text; low-confidence records are flagged, not silently indexed
- Points at `http://<gaming-pc>:11434` (Ollama) so it's swappable for a cloud model later

**Decision gate:** only build this **after** confirming the Ollama setup actually runs the model acceptably on your friend's GPU. Until then it stays optional — don't block Phase 2 on it.

**Dependencies:** B (extends the ETL).

---

### F. *(Optional)* Real-time PostGIS → Elasticsearch sync
**Type:** infra · **Size:** M · **Owner:** @sarathy-cloud · **Touches:** `docker-compose.yaml`, Logstash config

**What:** A Logstash pipeline that streams changes from PostGIS tables into Elasticsearch automatically, so the index stays fresh without manual re-imports.

**Why:** Task B/D are batch imports. If you later have data that changes continuously (e.g. live road updates), Logstash keeps ES in sync in near-real-time.

**How / acceptance:** Logstash JDBC input on the relevant PostGIS table → ES output with `geo_point`/`geo_shape` mapping; new/changed rows appear in the index within seconds.

**Dependencies:** A. Lowest priority — only do this if a real-time data source actually appears.

---

## Suggested sequencing

```
A (ES + Pelias up)
└─► B (ETL normalizer) ──► D (import endpoint)
└─► C (swap geocode to Pelias)        │
                                      └─► E (LLM layer, optional, after GPU check)
                                      └─► F (Logstash, optional, only if real-time data)
```

Core cut-over = **A → B → C → D**. E and F are opt-in extensions.

---

## Why this isn't on the active board yet

- It's **Phase 2** — it replaces a working part (OpenCage) rather than finishing the in-flight MVP (#6–#18)
- The whole epic is backend/infra/data, which all falls to **@sarathy-cloud**; running it in parallel with the Phase 1 backend work would overload one person
- Tasks E/F have **open decisions** (local LLM viability, whether a real-time source exists) that shouldn't be committed prematurely

**When to activate:** once #6–#18 are mostly closed, run `/plan-project sprint` (or `/new-issue` per task above) to turn A–D into a sprint, keeping E/F in the backlog.
