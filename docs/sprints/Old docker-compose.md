```yaml
# /geospatial_project/docker-compose.yml

# This master file orchestrates both services from their respective sub-folders.

  

services:

# =======================================================

# Wayline Application Services (Node.js)

# =======================================================

  

# Wayline's Main PostgreSQL Database

postgres_db:

build: ./wayline/postgres

container_name: postgres_database

environment:

- POSTGRES_DB=${POSTGRES_DB}

- POSTGRES_USER=${POSTGRES_USER}

- POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

ports:

- "5432:5432"

volumes:

- postgres_data:/var/lib/postgresql/data

- ./wayline/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

healthcheck:

test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]

interval: 5s

timeout: 5s

retries: 5

  

# The pgAdmin web interface for managing Wayline's database

postgres_ui:

image: dpage/pgadmin4

container_name: postgres_ui

environment:

- PGADMIN_DEFAULT_EMAIL=${PGADMIN_DEFAULT_EMAIL}

- PGADMIN_DEFAULT_PASSWORD=${PGADMIN_DEFAULT_PASSWORD}

ports:

- "8080:80"

depends_on:

- postgres_db

  

# =======================================================

# Elasticsearch for Pelias

# =======================================================

elasticsearch:

build: ./elasticsearch # <-- Tells Docker Compose to build the image from the Dockerfile in this directory

container_name: pelias_elasticsearch

environment:

- discovery.type=single-node

- "ES_JAVA_OPTS=-Xms2g -Xmx2g"

- cluster.name=pelias

- node.name=pelias_node

- network.host=0.0.0.0

- http.port=9200

- action.auto_create_index=true

- xpack.security.enabled=false

- xpack.ml.enabled=false

- xpack.monitoring.enabled=false

- xpack.watcher.enabled=false

- bootstrap.memory_lock=true

ulimits:

memlock:

soft: -1

hard: -1

volumes:

- elasticsearch_data:/usr/share/elasticsearch/data

ports:

- "9200:9200"

- "9300:9300"

healthcheck:

test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]

interval: 30s

timeout: 10s

retries: 5

start_period: 60s

  

# =======================================================

# Pelias Services

# =======================================================

  

# Pelias Schema - Sets up Elasticsearch indices

pelias_schema:

image: pelias/schema:latest

container_name: pelias_schema

environment:

- PELIAS_CONFIG=/config/pelias.json

volumes:

- ./pelias/pelias.json:/config/pelias.json

depends_on:

elasticsearch:

condition: service_healthy

command: ["node", "scripts/create_index.js"]

  

# Pelias API - The main geocoding service

pelias_api:

image: pelias/api:latest

container_name: pelias_api

environment:

- PELIAS_CONFIG=/config/pelias.json

volumes:

- ./pelias/pelias.json:/config/pelias.json

ports:

- "4000:4000"

depends_on:

elasticsearch:

condition: service_healthy

healthcheck:

test: ["CMD-SHELL", "curl -f http://localhost:4000/v1/ping || exit 1"]

interval: 30s

timeout: 10s

retries: 5

  

# Pelias Placeholder (for admin regions)

pelias_placeholder:

image: pelias/placeholder:latest

container_name: pelias_placeholder

environment:

- PELIAS_CONFIG=/config/pelias.json

volumes:

- ./pelias/pelias.json:/config/pelias.json

- placeholder_data:/data

ports:

- "4100:4100"

depends_on:

elasticsearch:

condition: service_healthy

  

# Pelias Interpolation (for address interpolation)

pelias_interpolation:

image: pelias/interpolation:latest

container_name: pelias_interpolation

environment:

- PELIAS_CONFIG=/config/pelias.json

volumes:

- ./pelias/pelias.json:/config/pelias.json

- interpolation_data:/data

ports:

- "4300:4300"

depends_on:

elasticsearch:

condition: service_healthy

  

# Pelias PIP (Point in Polygon service)

pelias_pip:

image: pelias/pip-service:latest

container_name: pelias_pip

environment:

- PELIAS_CONFIG=/config/pelias.json

volumes:

- ./pelias/pelias.json:/config/pelias.json

- pip_data:/data

ports:

- "4201:4200"

depends_on:

elasticsearch:

condition: service_healthy

  

# =======================================================

# Data Import Services (Run these manually when needed)

# =======================================================

  

# OpenStreetMap Importer

pelias_openstreetmap:

image: pelias/openstreetmap:latest

container_name: pelias_openstreetmap

environment:

- PELIAS_CONFIG=/config/pelias.json

volumes:

- ./pelias/pelias.json:/config/pelias.json

- ./wayline/data:/data/openstreetmap

depends_on:

elasticsearch:

condition: service_healthy

profiles:

- import

  

# OpenAddresses Importer

pelias_openaddresses:

image: pelias/openaddresses:latest

container_name: pelias_openaddresses

environment:

- PELIAS_CONFIG=/config/pelias.json

volumes:

- ./pelias/pelias.json:/config/pelias.json

- ./pelias/data:/data

depends_on:

elasticsearch:

condition: service_healthy

profiles:

- import

  

# Who's on First Importer

pelias_whosonfirst:

image: pelias/whosonfirst:latest

container_name: pelias_whosonfirst

environment:

- PELIAS_CONFIG=/config/pelias.json

volumes:

- ./pelias/pelias.json:/config/pelias.json

- ./pelias/data:/data

depends_on:

elasticsearch:

condition: service_healthy

profiles:

- import

  

# =======================================================

# Your Existing Services

# =======================================================

  

# Wayline's custom backend API Server (Node.js)

api:

build: ./wayline

container_name: wayline_api

ports:

- "5000:5000"

volumes:

- ./wayline:/app

depends_on:

postgres_db:

condition: service_healthy

pelias_api:

condition: service_healthy

environment:

- POSTGRES_DB=${POSTGRES_DB}

- POSTGRES_USER=${POSTGRES_USER}

- POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

- POSTGRES_HOST=postgres_db

- OPENCAGE_API_KEY=${OPENCAGE_API_KEY}

- PELIAS_API_URL=http://pelias_api:4000

  

# The OSRM high-performance routing engine

routing_engine:

image: osrm/osrm-backend:latest

container_name: osrm_router

ports:

- "5001:5000"

volumes:

- ./wayline/data:/data

command: osrm-routed --algorithm mld /data/southern-zone-latest.osrm

  

# =======================================================

# Volumes

# =======================================================

volumes:

postgres_data:

elasticsearch_data:

placeholder_data:

interpolation_data:

pip_data:

pelias_data:
```