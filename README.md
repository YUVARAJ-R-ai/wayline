# Wayline — Self-Hosted Geospatial Infrastructure & Routing Platform

Wayline is an open, self-hosted spatial mapping, geocoding, and routing platform engineered as a private alternative to proprietary APIs like Google Maps and Mapbox.

It features a high-performance **Next.js 15** frontend, an **Express API Gateway**, a **PostgreSQL 16 / PostGIS 3.4** spatial database, an **Elasticsearch 8.13** fuzzy geocoding engine, a native **OSRM C++** routing machine, and a dedicated **Python GDAL/GeoPandas ETL pipeline**—all orchestrated cleanly via Docker Compose and deployed in production on AWS.

---

## Table of Contents

1. [Architecture & System Design](#1-architecture--system-design)
2. [ETL Pipeline (Extract, Transform, Load)](#2-etl-pipeline-extract-transform-load)
3. [Container Services](#3-container-services)
4. [Repository Structure](#4-repository-structure)
5. [API Endpoints](#5-api-endpoints)
6. [Frontend Capabilities](#6-frontend-capabilities)
7. [AWS Cloud Production Deployment](#7-aws-cloud-production-deployment)
8. [Local Development & Getting Started](#8-local-development--getting-started)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Team](#10-team)

---

## 1. Architecture & System Design

Wayline uses a containerized microservice topology behind an **Nginx reverse proxy**. All browser requests arrive at a single origin (Port 80), eliminating cross-origin (CORS) complexity and preventing internal database or search engine ports from being exposed to the public internet.

```
                            Public Internet / Browser
                                       │
                                       ▼ HTTP :80
                     ┌────────────────────────────────────┐
                     │           reverse_proxy            │
                     │          Nginx 1.27 Alpine         │
                     └───────────────┬────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │ Path: / , /_next , /api/auth/                     │ Path: /api/* , /auth/*
           ▼                                                   ▼
┌─────────────────────────────┐                     ┌─────────────────────────────┐
│      wayline_frontend       │                     │     wayline_api_gateway     │
│       Next.js 15 SSR        │                     │       Node.js Express       │
│      (Standalone Mode)      │                     │      JWT Auth & Proxy       │
└─────────────────────────────┘                     └──────────────┬──────────────┘
                                                                   │
                  ┌───────────────────────┬────────────────────────┼───────────────────────┐
                  │ Internal SQL          │ Internal Search        │ Internal Routing      │ Internal HTTP
                  ▼                       ▼                        ▼                       ▼
      ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
      │   postgres_database   │ │wayline_elastic-   │ │    osrm_router    │ │wayline_etl_runner │
      │   PostgreSQL 16 +     │ │    search 8.13    │ │  OSRM 5.26 Engine │ │ Python 3.11 GDAL  │
      │     PostGIS 3.4       │ │Fuzzy Geocoder /   │ │  MLD Multi-Level  │ │GeoPandas/Shapely  │
      │ 94,325 Streets/pg_trgm│ │111,641 Spatial Rec│ │6.4GB Road Network │ │Internal Port 5055 │
      └───────────▲───────────┘ └─────────▲─────────┘ └───────────────────┘ └─────────┬─────────┘
                  │                       │                                           │
                  │                       └───────────────────────────────────────────┘
                  │                                  Bulk Ingestion Pipeline
                  ▼
      ┌───────────────────────┐
      │      postgres_ui      │
      │     pgAdmin 4 Web     │
      │  (Port 8888 - Admin)  │
      └───────────────────────┘
```

---

## 2. ETL Pipeline (Extract, Transform, Load)

### Why a Dedicated Python Microservice?
The API Gateway is built with Node.js for low-latency asynchronous I/O. However, Node.js lacks native C++ bindings for heavy GIS vector mathematics. Rather than bloating the API Gateway container, geospatial ingestion is isolated inside `wayline_etl_runner`—a Python 3.11 service running on internal port `5055` equipped with **GDAL, Fiona, GeoPandas, and Shapely**.

### Supported Input Formats
* **ESRI Shapefiles (`.shp`, `.dbf`, `.shx`, `.prj`)**
* **GeoJSON (`.geojson`, `.json`)**
* **Delimited CSVs** with automated coordinate header detection (`lat`, `latitude`, `y` and `lon`, `longitude`, `lng`, `x`)
* **Spatial SQLite / Geopackage databases**

### Ingestion Flow & Geometry Normalization

```
Raw Spatial Dataset (.shp / .csv / .geojson)
                     │
                     ▼
             [ 1. Extraction ]
      GeoPandas + Fiona streaming loader
                     │
                     ▼
            [ 2. Transformation ]
      • CRS Detection & Reprojection → Standard WGS84 (EPSG:4326)
      • Shapely Topology Simplification (removes redundant vertices)
      • Centroid calculation for geo_point indexing
      • Attribute extraction (road names, zones, speeds)
                     │
                     ▼
               [ 3. Loading ]
      ┌──────────────┴──────────────┐
      ▼                             ▼
Elasticsearch (wayline_geo)     PostgreSQL (gcc_streets)
- geo_point center point        - PostGIS geometry
- geo_shape geometries          - GiST R-tree spatial index
- edge-ngram typeahead          - pg_trgm similarity index
```

### Triggering the ETL Pipeline
The ETL pipeline can be executed via CLI or dynamically through the API Gateway:

#### 1. CLI Execution (inside container)
```bash
docker exec -it wayline_etl_runner python normalizer.py /imports/GCRoad_Network.shp --recreate
```

#### 2. Programmatic API Ingestion
```bash
curl -X POST http://localhost/api/data/import \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "file_path": "GCRoad_Network.shp",
    "dataset_name": "chennai_gcc_streets",
    "recreate": true
  }'
```

---

## 3. Container Services

| Service | Container Name | Base Image | Host Port | Internal Port | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Reverse Proxy** | `wayline_proxy` | `nginx:1.27-alpine` | `80` | `80` | Same-origin ingress; routes UI and API traffic |
| **Frontend** | `wayline_frontend` | `node:18-alpine` | — | `3000` | Next.js 15 standalone server |
| **API Gateway** | `wayline_api_gateway` | `node:18-alpine` | — | `3000` | Express API, JWT auth, key validation |
| **Routing Engine** | `osrm_router` | `osrm/osrm-backend:latest` | — | `5000` | OSRM MLD route calculation |
| **Geocoding Engine** | `wayline_elasticsearch` | `elasticsearch:8.13.4` | — | `9200` | Spatial search, autocomplete, fuzzy match |
| **Spatial Database** | `postgres_database` | `postgis/postgis:16-3.4` | `127.0.0.1:5432` | `5432` | PostGIS spatial tables & relational data |
| **ETL Runner** | `wayline_etl_runner` | `python:3.11-slim` | — | `5055` | GDAL/GeoPandas normalization microservice |
| **Database UI** | `postgres_ui` | `dpage/pgadmin4` | `127.0.0.1:8888` | `80` | pgAdmin 4 database administration |

---

## 4. Repository Structure

```
wayline/
├── api-gateway/                    # Express API Gateway
│   ├── app.js                      # Core API server: auth, routing, fuzzy geocoder
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                       # Next.js 15 Web Application
│   ├── app/
│   │   ├── page.tsx                # Geospatial map interface & landing
│   │   ├── login/page.tsx          # Authentication (Login / Signup)
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Operational metrics & status
│   │   │   ├── explorer/page.tsx   # Spatial Explorer (CSV/GeoJSON viewer)
│   │   │   ├── keys/page.tsx       # Dynamic API Key generation & telemetry
│   │   │   └── analytics/page.tsx  # API latency & usage breakdown
│   │   └── api/                    # Next.js server route proxies
│   ├── components/
│   │   ├── RoutingMap.tsx          # Leaflet routing map with multi-stop & bus transit
│   │   ├── Map.tsx                 # Core map component
│   │   └── ui/                     # Design system (InteractiveDotGrid, Badges, Modals)
│   ├── Dockerfile.prod             # Multi-stage production build (output: standalone)
│   └── Dockerfile                  # Local dev container
│
├── etl/                            # Spatial ETL Microservice
│   ├── normalizer.py               # GDAL/GeoPandas CRS converter & ES bulk loader
│   ├── llm_normalizer.py           # LLM-assisted schema normalizer for messy data
│   ├── server.py                   # Flask microservice running on internal port 5055
│   ├── requirements.txt            # Python dependencies (gdal, geopandas, shapely)
│   └── Dockerfile
│
├── postgres/                       # PostGIS Database
│   ├── Dockerfile                  # PostGIS 16-3.4 image
│   ├── init.sql                    # Initializes PostGIS, hstore, and pg_trgm
│   └── load_gcc_streets.sh         # Script for bulk loading shapefiles into PostGIS
│
├── deploy/
│   └── nginx/
│       └── wayline.conf            # Nginx upstream rules & same-origin path mapping
│
├── GCRoad_Network/                 # Greater Chennai Corporation road network shapefiles
├── docker-compose.prod.yaml        # Self-contained production stack
├── docker-compose.yaml             # Development stack
└── .env.example                    # Sample environment configurations
```

---

## 5. API Endpoints

### Geocoding & Routing

#### `GET /api/geocode?q={query}`
Converts text queries into coordinates using a resilient 3-tier cascade:
1. **Elasticsearch**: Multi-match fuzzy search across `properties.name`, `properties.road_name`, `properties.area` (`fuzziness: "AUTO"`).
2. **PostGIS Trigram**: Fallback to PostgreSQL `gcc_streets` using `pg_trgm` similarity + `ILIKE` substring search.
3. **OpenStreetMap Nominatim**: Global fallback for landmarks outside Chennai.
```bash
curl -H "Referer: http://localhost" "http://localhost/api/geocode?q=sydenhm"
# Returns: {"lat": 13.08593, "lng": 80.27026, "address": "Sydenhams Road, Choolai, Zone 05"}
```

#### `GET /api/reverse-geocode?lat={lat}&lng={lng}`
Converts coordinates to nearest address:
1. **Elasticsearch**: Distance-sorted nearest feature via `_geo_distance`.
2. **PostGIS Spatial KNN**: Sub-meter spatial accuracy via `geom <-> point` distance operator.
3. **OpenStreetMap Nominatim**: Worldwide reverse geocoding fallback.
```bash
curl -H "Referer: http://localhost" "http://localhost/api/reverse-geocode?lat=13.0827&lng=80.2707"
# Returns: {"address": "Raja Muthiah Road, secondary, Chennai", "distance_m": 8}
```

#### `GET /api/route?from={lon,lat}&to={lon,lat}`
Calculates turn-by-turn driving and transit routes via the native C++ OSRM backend with automatic upstream fallback.
```bash
curl -H "Referer: http://localhost" "http://localhost/api/route?from=80.2707,13.0827&to=80.2137,13.0534"
# Returns: GeoJSON LineString coordinates
```

#### `GET /api/streets?bbox={minLng,minLat,maxLng,maxLat}`
Returns level-of-detail (LOD) street geometries from PostGIS within the requested bounding box.

#### `GET /api/health`
Returns infrastructure status and API latency.

---

### Authentication & Keys

* `POST /auth/register` — Creates user account with bcrypt password hashing (10 salt rounds).
* `POST /auth/login` — Verifies credentials and returns a signed HS256 JWT.
* `GET /api/keys` — Lists API keys and call counts for the authenticated user.
* `POST /api/keys` — Generates cryptographically secure API keys (`crypto.randomBytes(24)`), returning the plaintext key once and storing only the SHA-256 hash.
* `DELETE /api/keys/:prefix` — Revokes an active API key.

---

## 6. Frontend Capabilities

* **Map Engine**: Dynamic Leaflet / MapLibre integration with custom OpenStreetMap raster/vector tile sets.
* **Transit Profiles**: Toggle between Car driving and Bus transit modes with immediate checkpoint recalculations.
* **Spatial Explorer (`/dashboard/explorer`)**: Direct drag-and-drop CSV mapping, automated latitude/longitude column detection, batch address geocoding, and GeoJSON export.
* **API Telemetry (`/dashboard/keys`)**: Real-time counter of API calls made per key with instant key generation and copy-to-clipboard modal.
* **Theme System**: Full Dark and Light mode support with cursor-proximity reactive dot grid lighting.

---

## 7. AWS Cloud Production Deployment

Wayline runs in production on an **AWS EC2 `m7i-flex.large`** (2 vCPUs, 8 GB RAM, 30 GB gp3 SSD) in `ap-south-1` (Mumbai).

### Deploying to AWS via CLI

1. **Launch EC2 Instance**:
   ```bash
   aws ec2 run-instances \
     --image-id ami-0c0fd09cfe77b59dc \
     --instance-type m7i-flex.large \
     --key-name wayline-deploy-key \
     --security-group-ids sg-wayline \
     --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]'
   ```

2. **Configure Security Group**:
   * Inbound: Port 80 (HTTP), Port 443 (HTTPS), Port 22 (SSH).
   * Restrict ports 5432, 9200, 5000, 5055 from public access.

3. **Deploy the Production Stack**:
   ```bash
   git clone -b dev https://github.com/YUVARAJ-R-ai/wayline.git /home/ubuntu/wayline
   cd /home/ubuntu/wayline
   cp .env.example .env
   # Update FRONTEND_ORIGIN and NEXTAUTH_URL to your EC2 public IP or domain
   docker compose -f docker-compose.prod.yaml up -d --build
   ```

4. **Populate PostGIS & Elasticsearch**:
   ```bash
   # Restore PostgreSQL dump
   zcat wayline_db.sql.gz | docker exec -i postgres_database psql -U admin -d wayline
   
   # Run ETL Normalizer for Elasticsearch
   docker exec wayline_etl_runner python normalizer.py /imports/GCRoad_Network.shp --recreate
   ```

---

## 8. Local Development & Getting Started

### Prerequisites
* Docker & Docker Compose plugin
* Node.js 18+ (optional, for local linting)
* Git

### Step-by-Step Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/YUVARAJ-R-ai/wayline.git
   cd wayline
   git checkout dev
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```

3. **Start the Development Stack**:
   ```bash
   docker compose up --build
   ```

4. **Access Applications**:
   * Web App: [http://localhost:8080](http://localhost:8080) (or [http://localhost](http://localhost) on production stack)
   * API Gateway: [http://localhost:3000](http://localhost:3000)
   * pgAdmin: [http://localhost:8888](http://localhost:8888) (`admin@example.com` / `admin`)

---

## 9. Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `POSTGRES_DB` | PostGIS database name | `wayline` |
| `POSTGRES_USER` | Database superuser username | `admin` |
| `POSTGRES_PASSWORD` | Database password | `admin` |
| `FRONTEND_ORIGIN` | Allowed origin for API key bypass | `http://localhost` |
| `JWT_SECRET` | Secret string for signing auth tokens | *(random 64-char hex)* |
| `OSRM_DATA_DIR` | Host path holding compiled `.osrm` graphs | `/data/wayline/osrm-data` |
| `IMPORT_DATA_DIR` | Host path holding raw GIS files for ETL | `/data/imports` |
| `NEXTAUTH_SECRET` | Secret key used by NextAuth for JWT encrypt | *(random string)* |
| `NEXTAUTH_URL` | Public canonical URL for NextAuth callbacks | `http://localhost` |

---

## 10. Team

* **Yuvaraj Rajesh** ([@YUVARAJ-R-ai](https://github.com/YUVARAJ-R-ai)) — Project Lead, Architecture, Cloud Infrastructure & Backend
* **Indhra** ([@Indhracha-05](https://github.com/Indhracha-05)) — GIS Engineering, Data ETL & Frontend UI/UX
