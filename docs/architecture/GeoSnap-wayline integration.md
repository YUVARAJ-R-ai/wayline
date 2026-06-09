Of course. This is an excellent and very practical integration task. You want to merge two separate applications into one cohesive system in a modular way, which is a key skill in software development.

Here is a complete, step-by-step guide to integrating your Python-based `GeoSnap` service into your existing Node.js `Wayline` mapping application, including the new CSV upload frontend.

The core principle of this guide is **modularity**. We will treat `GeoSnap` as a separate, self-contained "geocoding microservice" that your main `Wayline` application will talk to.

---

### Step 1: Update Your Project Structure

To make this work, place your entire `GeoSnap` project folder inside your `Wayline` project folder. This allows Docker Compose to find and build both applications from a single context.

Your new structure should look like this:
```
wayline_project/
│
├── GeoSnap/              <-- Your entire Python project goes here
│   ├── app/
│   ├── alembic/
│   ├── docker-compose.yml  (we will not use this file, it's just here)
│   ├── Dockerfile
│   └── ...
│
├── postgres/
│   └── init.sql
│
├── data/
│   └── southern-zone-latest.osrm
│
├── .env                  <-- We will add new variables here
├── docker-compose.yml    <-- We will modify this file heavily
├── index.html            <-- We will modify this
├── index.js              <-- We will modify this
└── ...
```

### Step 2: Add GeoSnap Variables to your `.env` File

Open your existing `.env` file and add the database credentials for the new `GeoSnap` service. It's crucial to keep them separate from your main application's database to maintain modularity.

```dotenv
# .env (add these new lines)

# --- GeoSnap Service Variables ---
GEOSNAP_POSTGRES_DB=geosnap_db
GEOSNAP_POSTGRES_USER=geosnap_user
GEOSNAP_POSTGRES_PASSWORD=geosnap_secret_password

# This is the secret key for GeoSnap's JWT authentication
GEOSNAP_SECRET_KEY=a_very_long_and_random_secret_for_geosnap
```

### Step 3: Combine Services in `docker-compose.yml`

This is the most important step. We will merge the `GeoSnap` services into your `Wayline` `docker-compose.yml`.

**Replace your entire `docker-compose.yml` with the following:**

```yaml
# docker-compose.yml

services:
  # =======================================================
  # Existing Wayline Application Services
  # =======================================================

  # Main Wayline PostgreSQL Database
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

  # Wayline pgAdmin UI
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

  # Wayline Node.js Backend API
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
      # Make Wayline wait for GeoSnap to be ready
      geosnap_api:
        condition: service_started
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_HOST=postgres_db
      - OPENCAGE_API_KEY=${OPENCAGE_API_KEY} # We leave this for now as a fallback

  # Wayline OSRM Routing Engine
  routing_engine:
    image: osrm/osrm-backend:latest
    container_name: osrm_router
    ports:
      - "5001:5000"
    volumes:
      - ./data:/data
    command: osrm-routed --algorithm mld /data/southern-zone-latest.osrm

  # =======================================================
  # NEW GeoSnap Geocoding Services
  # =======================================================

  # GeoSnap PostgreSQL Database
  geosnap_db:
    image: postgis/postgis
    container_name: geosnap_database
    environment:
      # Use the new variables from the .env file
      - POSTGRES_DB=${GEOSNAP_POSTGRES_DB}
      - POSTGRES_USER=${GEOSNAP_POSTGRES_USER}
      - POSTGRES_PASSWORD=${GEOSNAP_POSTGRES_PASSWORD}
    volumes:
      - geosnap_postgres_data:/var/lib/postgresql/data
    ports:
      # Expose on a different port (e.g., 5433) to avoid conflict if needed
      - "5433:5432"

  # GeoSnap Redis Cache
  geosnap_redis:
    image: redis:alpine
    container_name: geosnap_redis

  # GeoSnap FastAPI Backend API
  geosnap_api:
    # IMPORTANT: The build context points to the sub-folder
    build: ./GeoSnap
    container_name: geosnap_api
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./GeoSnap:/code
    ports:
      - "8000:8000"
    depends_on:
      - geosnap_db
      - geosnap_redis
    environment:
      # Pass the .env variables into the GeoSnap container
      - DATABASE_URL=postgresql://${GEOSNAP_POSTGRES_USER}:${GEOSNAP_POSTGRES_PASSWORD}@geosnap_db:5432/${GEOSNAP_POSTGRES_DB}
      - SECRET_KEY=${GEOSNAP_SECRET_KEY}
      - ALGORITHM=HS256
      - ACCESS_TOKEN_EXPIRE_MINUTES=30

volumes:
  postgres_data:
  # Define the new volume for the GeoSnap database
  geosnap_postgres_data:
```

### Step 4: Modify `Wayline` Backend (`index.js`) to Use `GeoSnap`

Now, we'll edit your Node.js code to call the `geosnap_api` service instead of `opencagedata.com`.

**In `index.js`, replace your `/api/geocode` and `/api/reverse-geocode` functions with this new code:**

```javascript
// index.js

// ... (keep all your other code like the Pool connection and /api/route) ...

// MODIFIED: This now uses the GeoSnap service
app.get('/api/geocode', async (req, res) => {
    const { q } = req.query;
    if (!q) { return res.status(400).send('Missing search query "q".'); }

    // The URL now points to our internal GeoSnap service
    const url = `http://geosnap_api:8000/autosnap/search?query=${encodeURIComponent(q)}`;
    
    try {
        const response = await axios.get(url);
        // GeoSnap returns an array of results. We'll take the first one.
        const result = response.data[0]; 
        
        if (result) {
            // Adapt the GeoSnap response to the format our frontend expects
            res.json({ 
                lat: result.latitude, 
                lng: result.longitude, 
                address: result.name 
            });
        } else {
            res.status(404).send('Location not found.');
        }
    } catch (error) {
        console.error('GeoSnap geocoding error:', error.message);
        res.status(500).send('Error during geocoding.');
    }
});

// MODIFIED: This now attempts to use GeoSnap's /nearby search
// NOTE: This is not a true reverse geocoder. It finds the nearest stored point.
// For a temporary solution, this is acceptable. A true reverse geocoder would
// require adding a new endpoint to the GeoSnap Python project.
app.get('/api/reverse-geocode', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) { return res.status(400).send('Missing "lat" or "lng" parameters.'); }

    // Use the /nearby endpoint with a small radius (e.g., 5km)
    const url = `http://geosnap_api:8000/autosnap/nearby?lat=${lat}&lng=${lng}&radius_km=5`;

    try {
        const response = await axios.get(url);
        const result = response.data[0]; // Take the closest result

        if (result) {
            res.json({ address: result.name });
        } else {
            // Fallback if no stored point is nearby
            res.status(404).send('Address not found.');
        }
    } catch (error) {
        console.error('GeoSnap reverse geocoding error:', error.message);
        res.status(500).send('Error during reverse geocoding.');
    }
});

// ... (keep the rest of your code, like /api/roads and app.listen) ...
```

### Step 5: Add CSV Upload Frontend to `index.html`

Finally, we'll add the new UI and logic for uploading a CSV file.

1.  **Add the Papaparse library** to parse CSV files easily. Put this in the `<head>` section of `index.html`.
    ```html
    <script src="https://cdn.jsdelivr.net/npm/papaparse@5.3.2/papaparse.min.js"></script>
    ```

2.  **Add the HTML for the uploader.** Put this right after the `<div id="routing-panel">...</div>` and before the `<div id="map">`.

    ```html
    <!-- index.html -->
    
    <!-- ... existing routing panel ... -->

    <!-- NEW: CSV Uploader Panel -->
    <div id="csv-panel">
        <h3>Upload Addresses via CSV</h3>
        <p>CSV must have a header row with an 'address' column.</p>
        <input type="file" id="csv-file-input" accept=".csv">
        <button id="upload-csv-button">Upload and Create Locations</button>
        <div id="csv-status-message"></div>
    </div>
    
    <div id="map"></div>
    <!-- ... -->
    ```
3.  **Add the CSS for the new panel.** Add this to your `index.css` file or in a `<style>` tag.
    ```css
    #csv-panel {
        position: absolute;
        top: 120px;
        left: 10px;
        background: white;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        z-index: 1000;
        width: 300px;
    }
    #csv-panel h3 { margin-top: 0; }
    ```

4.  **Add the JavaScript logic.** Put this at the end of the `<script>` tag in `index.html`, just before the closing `</script>`.

    ```javascript
    // index.html <script> tag

    // ... (keep all the existing map javascript) ...

    // --- NEW: CSV UPLOAD LOGIC ---
    const csvFileInput = document.getElementById('csv-file-input');
    const uploadCsvButton = document.getElementById('upload-csv-button');
    const csvStatusMessage = document.getElementById('csv-status-message');

    uploadCsvButton.addEventListener('click', handleCsvUpload);

    async function handleCsvUpload() {
        const file = csvFileInput.files[0];
        if (!file) {
            alert('Please select a CSV file first.');
            return;
        }

        // --- 1. Programmatically log into GeoSnap to get a token ---
        // For this temporary integration, we'll assume a default user exists.
        // Make sure you register this user first via the /docs page or a script.
        const username = 'default_uploader';
        const password = 'password123';
        csvStatusMessage.textContent = 'Authenticating...';
        
        const token = await getGeoSnapToken(username, password);
        if (!token) {
            csvStatusMessage.textContent = 'Authentication failed. Check credentials.';
            return;
        }
        csvStatusMessage.textContent = 'Authenticated. Starting upload...';

        // --- 2. Parse the CSV file ---
        Papa.parse(file, {
            header: true, // Assumes the first row is a header
            complete: async function(results) {
                const addresses = results.data.filter(row => row.address); // Get all rows with an 'address'
                let successCount = 0;
                let errorCount = 0;

                for (let i = 0; i < addresses.length; i++) {
                    const row = addresses[i];
                    csvStatusMessage.textContent = `Processing ${i + 1}/${addresses.length}: ${row.address}`;
                    
                    // --- 3. Geocode the address using our own backend ---
                    const geocodeResponse = await fetch(`/api/geocode?q=${encodeURIComponent(row.address)}`);
                    if (!geocodeResponse.ok) {
                        errorCount++;
                        console.error(`Failed to geocode: ${row.address}`);
                        continue;
                    }
                    const geocodedData = await geocodeResponse.json();

                    // --- 4. Use the createLocation endpoint to save the data ---
                    const createPayload = {
                        name: geocodedData.address, // Use the formatted address from geocoding
                        latitude: geocodedData.lat,
                        longitude: geocodedData.lng
                    };
                    
                    const createResponse = await fetch('http://localhost:8000/autosnap/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(createPayload)
                    });

                    if (createResponse.ok) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error(`Failed to create location for: ${row.address}`);
                    }
                }
                csvStatusMessage.textContent = `Upload complete! Success: ${successCount}, Failed: ${errorCount}.`;
            }
        });
    }

    async function getGeoSnapToken(username, password) {
        try {
            const response = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ username, password })
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data.access_token;
        } catch (error) {
            console.error('Token request failed:', error);
            return null;
        }
    }
    ```

### Final Step: Run Everything

1.  **Register the Uploader User:** Before you start, run `docker-compose up --build`, go to the GeoSnap docs at `http://localhost:8000/docs`, and register the user (`default_uploader` / `password123`) that the CSV uploader needs for authentication.
2.  **Start Your Application:**
    ```bash
    docker-compose up --build
    ```
3.  **Test:**
    *   Navigate to `http://localhost:5000`.
    *   Your original `Wayline` app should work as before, but the geocoding search now uses `GeoSnap`.
    *   You will see the new "Upload Addresses via CSV" panel.
    *   Create a simple CSV file named `locations.csv`:
        ```csv
        address
        Eiffel Tower, Paris
        Statue of Liberty, New York
        ```
    *   Use the new panel to upload this file and watch it process. The locations will be added to the `geosnap_db` database.