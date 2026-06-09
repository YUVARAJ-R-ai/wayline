# Pelias & Elasticsearch Setup Guide for Mapping API

## Overview

Pelias is an open-source geocoding system that provides both geocoding (address → coordinates) and reverse geocoding (coordinates → address) capabilities. It uses Elasticsearch as its backend search engine.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your API      │───→│     Pelias      │───→│  Elasticsearch  │
│   (Node.js)     │    │   (Geocoder)    │    │   (Search DB)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Project Structure Setup

Based on your current structure, here's where to make changes:

```
geospatial_project/
├── wayline/
│   ├── data/
│   │   └── southern-zone-latest.osm.pbf  # Your existing OSM data
│   ├── postgres/
│   ├── node_modules/
│   ├── public/
│   ├── .env
│   ├── Dockerfile
│   └── ...
├── pelias/                               # CREATE THIS FOLDER
│   ├── pelias.json                       # Pelias config file
│   └── data/                            # Pelias data directory
│       └── openstreetmap/               # Will link to your existing data
├── docker-compose.yml                    # Your main compose file
└── .env                                 # Main environment file
```

## Updated Docker Compose Configuration

Replace your existing `docker-compose.yml` with this updated version:

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
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.15
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
      - PELIAS_CONFIG=/code/pelias.json
    volumes:
      - ./pelias:/code/pelias
      - ./pelias/pelias.json:/code/pelias.json
    depends_on:
      elasticsearch:
        condition: service_healthy
    command: ["node", "scripts/create_index.js"]

  # Pelias API - The main geocoding service
  pelias_api:
    image: pelias/api:latest
    container_name: pelias_api
    environment:
      - PELIAS_CONFIG=/code/pelias.json
    volumes:
      - ./pelias:/code/pelias
      - ./pelias/pelias.json:/code/pelias.json
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
      - PELIAS_CONFIG=/code/pelias.json
    volumes:
      - ./pelias:/code/pelias
      - ./pelias/pelias.json:/code/pelias.json
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
      - PELIAS_CONFIG=/code/pelias.json
    volumes:
      - ./pelias:/code/pelias
      - ./pelias/pelias.json:/code/pelias.json
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
      - PELIAS_CONFIG=/code/pelias.json
    volumes:
      - ./pelias:/code/pelias
      - ./pelias/pelias.json:/code/pelias.json
      - pip_data:/data
    ports:
      - "4200:4200"
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
      - PELIAS_CONFIG=/code/pelias.json
    volumes:
      - ./pelias:/code/pelias
      - ./pelias/pelias.json:/code/pelias.json
      - ./wayline/data:/data/openstreetmap  # Use your existing data
      - pelias_data:/data
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
      - PELIAS_CONFIG=/code/pelias.json
    volumes:
      - ./pelias:/code/pelias
      - ./pelias/pelias.json:/code/pelias.json
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
      - PELIAS_CONFIG=/code/pelias.json
    volumes:
      - ./pelias:/code/pelias
      - ./pelias/pelias.json:/code/pelias.json
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

## Pelias Configuration

Create the following directory structure and files:

### 1. Create Pelias Directory Structure

```bash
mkdir -p pelias/data
mkdir -p pelias/config
```

### 2. Pelias Configuration File

Create `pelias/pelias.json`:

```json
{
  "logger": {
    "level": "info",
    "timestamp": false
  },
  "esclient": {
    "apiVersion": "7.17",
    "hosts": [
      {
        "host": "elasticsearch",
        "port": 9200
      }
    ],
    "requestTimeout": 120000
  },
  "elasticsearch": {
    "settings": {
      "index": {
        "refresh_interval": "10s",
        "number_of_replicas": "0",
        "number_of_shards": "3"
      }
    }
  },
  "acceptance-tests": {
    "endpoints": {
      "docker": "http://pelias_api:4000/v1/"
    }
  },
  "api": {
    "indexName": "pelias",
    "version": "1.0",
    "host": "http://pelias_api:4000/",
    "services": {
      "placeholder": {
        "url": "http://pelias_placeholder:4100"
      },
      "pip": {
        "url": "http://pelias_pip:4200"
      },
      "interpolation": {
        "url": "http://pelias_interpolation:4300"
      }
    }
  },
  "imports": {
    "adminLookup": {
      "enabled": true
    },
    "geonames": {
      "datapath": "/data/geonames",
      "countryCode": "IN"
    },
    "openstreetmap": {
      "datapath": "/data/openstreetmap",
      "leveldbpath": "/tmp/leveldb",
      "import": [
        {
          "filename": "southern-zone-latest.osm.pbf"
        }
      ]
    },
    "openaddresses": {
      "datapath": "/data/openaddresses",
      "files": [
        "in/countrywide.csv"
      ]
    },
    "whosonfirst": {
      "datapath": "/data/whosonfirst",
      "importVenues": false,
      "importPostalcodes": true,
      "importPlace": "85632469"
    }
  }
}
```

## Environment Variables

Update your `.env` file:

```env
# Existing variables
POSTGRES_DB=wayline_db
POSTGRES_USER=wayline_user
POSTGRES_PASSWORD=your_password
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=admin_password
OPENCAGE_API_KEY=your_opencage_key

# Pelias/Elasticsearch variables
PELIAS_API_URL=http://localhost:4000
ES_HEAP_SIZE=2g
```

## Step-by-Step Setup for Your Project

### 1. Create Required Directory Structure

From your project root (`geospatial_project/`), run:

```bash
# Create the pelias directory structure
mkdir -p pelias/data/openstreetmap

# Create the pelias configuration file
touch pelias/pelias.json
```

### 2. Create Pelias Configuration

Create `pelias/pelias.json` with this content (customized for your southern-zone data):

```json
{
  "logger": {
    "level": "info",
    "timestamp": false
  },
  "esclient": {
    "apiVersion": "7.17",
    "hosts": [
      {
        "host": "elasticsearch",
        "port": 9200
      }
    ],
    "requestTimeout": 120000
  },
  "elasticsearch": {
    "settings": {
      "index": {
        "refresh_interval": "10s",
        "number_of_replicas": "0",
        "number_of_shards": "3"
      }
    }
  },
  "api": {
    "indexName": "pelias",
    "version": "1.0",
    "host": "http://pelias_api:4000/",
    "services": {
      "placeholder": {
        "url": "http://pelias_placeholder:4100"
      },
      "pip": {
        "url": "http://pelias_pip:4200"
      },
      "interpolation": {
        "url": "http://pelias_interpolation:4300"
      }
    }
  },
  "imports": {
    "adminLookup": {
      "enabled": true
    },
    "openstreetmap": {
      "datapath": "/data/openstreetmap",
      "leveldbpath": "/tmp/leveldb",
      "import": [
        {
          "filename": "southern-zone-latest.osm.pbf"
        }
      ]
    }
  }
}
```

### 3. Update Your .env File

Add these lines to your existing `.env` file in the project root:

```env
# Add to your existing .env file
PELIAS_API_URL=http://localhost:4000
ES_HEAP_SIZE=2g
```

### 4. Start Basic Services

```bash
# From your project root (geospatial_project/)

# Start Elasticsearch first
docker-compose up -d elasticsearch

# Wait for Elasticsearch to be healthy (this takes 1-2 minutes)
docker-compose logs -f elasticsearch

# Check when it's ready (you should see "Cluster health status changed from [RED] to [GREEN]")
# Or check with:
curl http://localhost:9200/_cluster/health
```

### 5. Initialize Pelias Schema

```bash
# Create the Elasticsearch indices for Pelias
docker-compose run --rm pelias_schema

# You should see output like:
# "pelias schema created successfully"
```

### 6. Start Pelias Services

```bash
# Start all Pelias API services
docker-compose up -d pelias_api pelias_placeholder pelias_pip pelias_interpolation

# Check if services are running
docker-compose ps
```

### 7. Import Your Southern Zone Data

```bash
# Import your existing southern-zone OSM data
docker-compose --profile import run --rm pelias_openstreetmap

# This will take some time (10-30 minutes depending on data size)
# You can monitor progress with:
docker-compose --profile import logs -f pelias_openstreetmap
```

### 8. Test Your Setup

### 1. Health Checks

```bash
# Check Elasticsearch (should show "status": "green")
curl http://localhost:9200/_cluster/health?pretty

# Check Pelias API (should return "OK")
curl http://localhost:4000/v1/ping

# Check all services status
docker-compose ps

# Check how many records were imported
curl "http://localhost:9200/pelias/_count?pretty"
```

### 2. Test Geocoding with Southern Zone Data

```bash
# Test geocoding for cities in southern India
curl "http://localhost:4000/v1/search?text=Chennai"
curl "http://localhost:4000/v1/search?text=Bangalore"
curl "http://localhost:4000/v1/search?text=Hyderabad"

# Test reverse geocoding (example coordinates for Chennai)
curl "http://localhost:4000/v1/reverse?point.lat=13.0827&point.lon=80.2707"

# Test with more specific addresses
curl "http://localhost:4000/v1/search?text=Marina Beach, Chennai"
```

## Integration with Your Node.js API

Add this to your Node.js application:

```javascript
// In your wayline API
const axios = require('axios');

const PELIAS_BASE_URL = process.env.PELIAS_API_URL || 'http://pelias_api:4000';

// Geocoding function
async function geocode(address) {
  try {
    const response = await axios.get(`${PELIAS_BASE_URL}/v1/search`, {
      params: {
        text: address,
        size: 1
      }
    });
    
    if (response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      return {
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        display_name: feature.properties.label
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

// Reverse geocoding function
async function reverseGeocode(lat, lon) {
  try {
    const response = await axios.get(`${PELIAS_BASE_URL}/v1/reverse`, {
      params: {
        'point.lat': lat,
        'point.lon': lon,
        size: 1
      }
    });
    
    if (response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      return {
        address: feature.properties.label,
        components: feature.properties
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
}

module.exports = { geocode, reverseGeocode };
```

## Common Issues and Troubleshooting

### 1. Elasticsearch Memory Issues

If Elasticsearch fails to start:

```bash
# Increase Docker memory allocation (minimum 4GB recommended)
# Or reduce ES heap size in docker-compose.yml:
- "ES_JAVA_OPTS=-Xms1g -Xmx1g"
```

### 2. Schema Creation Fails

```bash
# Check Elasticsearch is running
curl http://localhost:9200/_cluster/health

# Recreate schema
docker-compose run --rm pelias_schema node scripts/drop_index.js
docker-compose run --rm pelias_schema node scripts/create_index.js
```

### 3. API Not Responding

```bash
# Check logs
docker-compose logs pelias_api

# Restart API service
docker-compose restart pelias_api
```

### 4. No Results from Geocoding

This is normal initially without data import. For POC testing:

```bash
# Import minimal test data
docker-compose --profile import run --rm pelias_openstreetmap
```

## Performance Optimization

### 1. For Development/POC

- Use single Elasticsearch node
- Reduce replica count to 0
- Use smaller heap sizes

### 2. For Production

- Use Elasticsearch cluster
- Increase heap sizes
- Add more replicas
- Use SSD storage
- Optimize shard counts

## Working with Custom Data in Pelias

After you get the basic setup working with your southern-zone data, here's how to work with custom data:

### 1. Understanding Pelias Data Sources

Pelias supports multiple data sources:

- **OpenStreetMap** (your current data): Roads, POIs, buildings
- **OpenAddresses**: Address-specific data
- **Who's on First**: Administrative boundaries
- **Geonames**: Place names and geographic features
- **Custom CSV/JSON**: Your own data

### 2. Adding Custom CSV Data

Create a custom importer for your specific data:

```bash
# Create custom data directory
mkdir -p pelias/data/custom
```

Example custom CSV format (`pelias/data/custom/my_places.csv`):

```csv
id,name,lat,lon,address,category
1,"My Restaurant",13.0827,80.2707,"123 Marina Beach Road, Chennai","restaurant"
2,"My Office",12.9716,77.5946,"456 MG Road, Bangalore","office"
```

### 3. Custom Data Import Script

You can create a custom Node.js script to import your data:

```javascript
// pelias/scripts/import_custom.js
const elasticsearch = require('elasticsearch');

const client = new elasticsearch.Client({
  host: 'http://localhost:9200'
});

async function importCustomData() {
  // Your custom import logic here
  const documents = [
    {
      _index: 'pelias',
      _type: '_doc',
      _id: 'custom_1',
      _source: {
        name: { default: 'My Restaurant' },
        phrase: { default: 'My Restaurant Chennai' },
        parent: {
          country: ['India'],
          region: ['Tamil Nadu'],
          locality: ['Chennai']
        },
        center_point: { lat: 13.0827, lon: 80.2707 },
        category: ['restaurant']
      }
    }
  ];

  for (const doc of documents) {
    await client.index(doc);
  }
}
```

### 4. Using PostGIS Data

Since you already have PostgreSQL, you can also integrate PostGIS data:

```javascript
// Example: Import from your existing PostgreSQL database
const { Pool } = require('pg');

const pool = new Pool({
  host: 'postgres_db',
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

async function importFromPostGIS() {
  const client = await pool.connect();
  const result = await client.query(`
    SELECT 
      name, 
      ST_Y(geom) as lat, 
      ST_X(geom) as lon,
      address,
      category
    FROM your_places_table
  `);
  
  // Convert to Pelias format and import
}
```

## Monitoring

Add these endpoints to monitor your setup:

```bash
# Elasticsearch cluster health
curl http://localhost:9200/_cluster/health?pretty

# Pelias API status
curl http://localhost:4000/v1/ping

# Check index statistics
curl http://localhost:9200/pelias/_stats?pretty
```

This setup provides a solid foundation for geocoding and reverse geocoding in your mapping API. Start with the basic setup and gradually add more data sources as your needs grow.


### Errors faced while setting up
[[pelias-setup-E1]]
[[pelias-setup-E2]]
[[pelias-setup-E3]]
[[pelias-setup-E4]]
[[pelias-setup-E5]]
