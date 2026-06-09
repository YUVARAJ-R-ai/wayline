Excellent question! This is the perfect time to clarify the project structure. Setting this up correctly from the start will make managing the two systems (your application and the Pelias geocoder) much easier.

Based on your `wayline` directory, the best practice is to have Pelias live as a **separate, sibling directory** to your main application. This keeps the complex Pelias configuration isolated from your app's code.

Here is a visual representation of the target structure:

```
/some/parent/directory/
├── wayline/            <-- Your existing project directory
│   ├── data/
│   ├── node_modules/
│   ├── postgres/
│   ├── public/
│   ├── .env
│   ├── .gitignore
│   ├── docker-compose.yml  <-- We will modify this
│   ├── Dockerfile
│   ├── index.js            <-- We will modify this
│   └── package.json
│
└── pelias-docker/      <-- The NEW directory we will create
    ├── data/
    │   ├── custom/
    │   │   └── my_pois.csv
    │   └── southern-zone-latest.osm.pbf
    ├── pelias.json         <-- Pelias configuration file
    └── ... (other Pelias files)
```

I will walk you through every step to achieve this.

---

### **Step 1: Create the Pelias Directory Structure**

1.  **Navigate to the Parent Directory:** Open your terminal. If you are currently inside the `wayline` directory, go up one level.
    ```bash
    # If you are in ~/projects/wayline, this command takes you to ~/projects
    cd ..
    ```
    You should now be in the directory that *contains* `wayline`.

2.  **Clone the Pelias Docker Project:** This command will create the `pelias-docker` folder right next to your `wayline` folder.
    ```bash
    git clone https://github.com/pelias/docker.git pelias-docker
    ```

3.  **Enter the New Directory:**
    ```bash
    cd pelias-docker
    ```

4.  **Create a Data Subdirectory:** Pelias needs a place to store its data files.
    ```bash
    mkdir data
    ```

---

### **Step 2: Configure Pelias**

Now, while inside the `pelias-docker` directory, you need to create the main configuration file.

1.  **Create `pelias.json`:** This file tells Pelias what data to download and import. Create a new file named `pelias.json`.

2.  **Add Configuration:** Paste the following content into `pelias-docker/pelias.json`. This configures it for Southern India and your custom data.
    ```json
    {
      "imports": {
        "openstreetmap": {
          "datapath": "./data",
          "download": [
            {
              "sourceURL": "https://download.geofabrik.de/asia/india/southern-zone-latest.osm.pbf"
            }
          ],
          "import": [{
            "filename": "southern-zone-latest.osm.pbf"
          }]
        },
        "csv": {
          "datapath": "./data/custom"
        }
      }
    }
    ```

---

### **Step 3: Prepare and Import All Data**

This is the most resource-intensive part. **Ensure Docker has at least 8GB of RAM allocated.**

1.  **Download the OpenStreetMap Data:** (You should still be in the `pelias-docker` directory)
    ```bash
    ./pelias download all
    ```
    This will download the `southern-zone-latest.osm.pbf` file into the `pelias-docker/data` folder.

2.  **Create Your Custom Data File:**
    *   First, create the directory for it:
        ```bash
        mkdir ./data/custom
        ```
    *   Next, create your custom CSV file: `pelias-docker/data/custom/my_pois.csv`
    *   Add your custom locations to this file. **The headers are required.**
        ```csv
        SOURCE,LAYER,NAME,LAT,LON
        MY_COMPANY,venues,"My Chennai Office",13.0604,80.2496
        MY_COMPANY,venues,"KEDAR HOSPITAL - Mugalivakkam",13.0238,80.1651
        MY_COMPANY,competitors,"Flash Sports Hub",13.0245,80.1689
        ```

3.  **Run the Full Import:** This command builds the Elasticsearch database. It will take a long time (potentially hours).
    ```bash
    ./pelias import all
    ```

4.  **Start the Pelias Services (for testing):** This command will start up just the Pelias-related containers (Elasticsearch, API, etc.) so you can verify the import worked.
    ```bash
    ./pelias compose up
    ```
    Open a new terminal and test it with `curl "http://localhost:4000/v1/search?text=Kedar%20Hospital"`. If you get a valid JSON response, it worked! You can stop the services with `Ctrl+C`.

---

### **Step 4: Integrate Pelias with Your `wayline` Application**

Now we'll modify your `wayline` project to control and use Pelias.

1.  **Navigate Back to Your Project:**
    ```bash
    cd ../wayline
    ```

2.  **Modify `docker-compose.yml`:** This is the most important change. We are telling your `wayline` docker-compose file how to start the Pelias services and connect everything on a shared network. Replace the entire contents of `wayline/docker-compose.yml` with this:

    ```yaml
    services:
      # Our custom-built PostgreSQL Database Service
      postgres_db:
        build: ./postgres
        container_name: postgres_database
        environment:
          - POSTGRES_DB=${POSTGRES_DB}
          - POSTGRES_USER=${POSTGRES_USER}
          - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
        ports:
          - "5432:5432"
        volumes:
          - postgres_data:/var/lib/postgresql/data
          - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
          interval: 5s
          timeout: 5s
          retries: 5
        networks:
          - wayline-net

      # The high-performance routing engine
      routing_engine:
        image: osrm/osrm-backend:latest
        container_name: osrm_router
        ports:
          - "5001:5000"
        volumes:
          - ./data:/data
        command: osrm-routed --algorithm mld /data/southern-zone-latest.osrm
        networks:
          - wayline-net

      # Our custom backend API Server
      api:
        build: .
        container_name: wayline_api
        ports:
          - "5000:5000"
        volumes:
          - .:/app
        depends_on:
          postgres_db:
            condition: service_healthy
          pelias_api: # NEW: Wait for Pelias API to be ready
            condition: service_started
        environment:
          - POSTGRES_DB=${POSTGRES_DB}
          - POSTGRES_USER=${POSTGRES_USER}
          - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
          - POSTGRES_HOST=postgres_db
          - PELIAS_API_HOST=http://pelias_api:4000 # NEW
        networks:
          - wayline-net

      # --- NEW: Pelias Geocoding Services ---
      elasticsearch:
        image: pelias/elasticsearch:7.10.2
        container_name: pelias_elasticsearch
        # The data is stored in the volume created by the Pelias import script
        volumes:
          - ../pelias-docker/.data/elasticsearch:/usr/share/elasticsearch/data
        ulimits: { memlock: { soft: -1, hard: -1 }, nofile: { soft: 65536, hard: 65536 } }
        cap_add: [ "IPC_LOCK" ]
        environment:
          - "discovery.type=single-node"
          - "ES_JAVA_OPTS=-Xms2g -Xmx2g" # Adjust RAM here (e.g., -Xms4g -Xmx4g)
        networks:
          - wayline-net

      pelias_api:
        image: pelias/api:latest
        container_name: pelias_api
        depends_on: [ "elasticsearch" ]
        ports:
          - "4000:4000"
        volumes:
          # IMPORTANT: The path is relative to this docker-compose.yml file
          - ../pelias-docker/pelias.json:/code/pelias.json
        networks:
          - wayline-net

    volumes:
      postgres_data:
        # Note: We are not defining a new elasticsearch volume here.
        # We are directly mounting the data directory created by the Pelias scripts.

    networks:
      wayline-net:
        driver: bridge
    ```
    **Key Change Explanation:**
    *   We added the `elasticsearch` and `pelias_api` services.
    *   **Crucially**, the volumes now use relative paths like `../pelias-docker/pelias.json`. This works because `docker-compose` will be run from the `wayline` directory, and it can correctly find the sibling `pelias-docker` directory.
    *   We created a shared network `wayline-net` so all containers can communicate.
    *   Our `api` service now `depends_on` `pelias_api` and has the `PELIAS_API_HOST` environment variable.

3.  **Modify `index.js`:** Update your geocoding endpoints in `wayline/index.js` to use Pelias instead of OpenCage. I'm providing only the changed functions for brevity.

    ```javascript
    // In index.js, find and replace these two functions

    // --- MODIFIED: Geocode Endpoint using Pelias ---
    app.get('/api/geocode', async (req, res) => {
        const { q } = req.query;
        if (!q) { return res.status(400).send('Missing search query "q".'); }

        const peliasHost = process.env.PELIAS_API_HOST || 'http://localhost:4000';
        const url = `${peliasHost}/v1/search?text=${encodeURIComponent(q)}`;

        try {
            const response = await axios.get(url);
            const result = response.data.features[0]; 

            if (result) {
                res.json({
                    lat: result.geometry.coordinates[1],
                    lng: result.geometry.coordinates[0],
                    address: result.properties.label
                });
            } else {
                res.status(404).send('Location not found.');
            }
        } catch (error) {
            console.error('Pelias Geocoding error:', error.message);
            res.status(500).send('Error during geocoding.');
        }
    });

    // --- MODIFIED: Reverse Geocode Endpoint using Pelias ---
    app.get('/api/reverse-geocode', async (req, res) => {
        const { lat, lng } = req.query;
        if (!lat || !lng) { return res.status(400).send('Missing "lat" or "lng" parameters.'); }

        const peliasHost = process.env.PELIAS_API_HOST || 'http://localhost:4000';
        const url = `${peliasHost}/v1/reverse?point.lat=${lat}&point.lon=${lng}`;

        try {
            const response = await axios.get(url);
            const result = response.data.features[0];

            if (result) {
                res.json({ address: result.properties.label });
            } else {
                res.status(404).send('Address not found.');
            }
        } catch (error) {
            console.error('Pelias Reverse geocoding error:', error.message);
            res.status(500).send('Error during reverse geocoding.');
        }
    });
    ```

---

### **Step 5: Run Your Integrated Application**

From now on, you will only use the `docker-compose` file inside your `wayline` directory to manage *everything*.

1.  **Ensure you are in the `wayline` directory.**
2.  **Start all services:**
    ```bash
    docker-compose up -d --build
    ```
    The `--build` flag will rebuild your `api` container with the new `index.js` code.

Your application at `http://localhost:5000` is now fully self-sufficient, using your own local Pelias instance for all geocoding and reverse geocoding