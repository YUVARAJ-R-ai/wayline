Of course! This is a classic "pathing problem" inside a Docker container, and it's caused by a small but significant error in the provided `pelias-setup.md` guide.

Let's break down the error and fix it.

### The Problem

The error message is the key:
`Error: Cannot find module '/code/pelias/schema/scripts/create_index.js'`

*   The `pelias/schema:latest` Docker image has a working directory of `/code`.
*   Inside that image, the script you want to run is located at `/code/scripts/create_index.js`.
*   The `command` in your `docker-compose.yml` (`["node", "scripts/create_index.js"]`) correctly tries to run this script.
*   **The issue is with the `volumes` section for the `pelias_schema` service in your guide.** The guide tells you to mount volumes like this:
    ```yaml
    volumes:
      - ./pelias:/code/pelias
      - ./pelias/pelias.json:/code/pelias.json
    ```
    The first line, `- ./pelias:/code/pelias`, is unnecessary for this service and is likely confusing the internal pathing. The schema service only needs access to your `pelias.json` configuration file, not the entire `pelias` directory. The error message's strange path (`/code/pelias/schema/...`) is a symptom of this misconfiguration.

### The Solution

You need to correct the `volumes` section for the `pelias_schema` service (and other Pelias services) to only mount what is absolutely necessary.

#### 1. Edit your `docker-compose.yml`

Find the `pelias_schema` service in your `/geospatial_project/docker-compose.yml` file.

**Change this:**
```yaml
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
```

**To this (the corrected version):**
```yaml
  # Pelias Schema - Sets up Elasticsearch indices
  pelias_schema:
    image: pelias/schema:latest
    container_name: pelias_schema
    environment:
      - PELIAS_CONFIG=/config/pelias.json # Use a dedicated config path
    volumes:
      # Mount only the config file into a standard /config directory
      - ./pelias/pelias.json:/config/pelias.json
    depends_on:
      elasticsearch:
        condition: service_healthy
    # The default command for this image is to create the index,
    # so we can often omit this. But keeping it is also fine.
    command: ["node", "scripts/create_index.js"]
```

#### Why this works:
*   We remove the confusing `- ./pelias:/code/pelias` volume mount.
*   We mount *only* the configuration file (`pelias.json`) that the service needs.
*   By mounting it to `/config/pelias.json` (a common practice) and updating `PELIAS_CONFIG`, we avoid interfering with the container's internal `/code` directory where all its scripts live.

---

### Recommended: Update All Pelias Services for Consistency

The documentation you're using has this same volume-mounting error on *all* the Pelias services. It's best to fix them all at once to avoid future issues.

Here is the corrected `services` block for all Pelias-related containers. You can replace the entire "Pelias Services" and "Data Import Services" sections in your `docker-compose.yml` with this:

```yaml
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
    - PELIAS_CONFIG=/config/pelias.json
  volumes:
    - ./pelias/pelias.json:/config/pelias.json
    - ./wayline/data:/data/openstreetmap  # Use your existing data
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
    - ./pelias/data:/data # Mount the whole data dir for OA
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
    - ./pelias/data:/data # Mount the whole data dir for WOF
  depends_on:
    elasticsearch:
      condition: service_healthy
  profiles:
    - import
```

### Next Steps

1.  **Save** your updated `docker-compose.yml` file.
2.  **Run the command again** from your project root (`geospatial_project/`):

    ```bash
    docker-compose run --rm pelias_schema
    ```

You should now see the script execute successfully and create the Pelias index in Elasticsearch.

