Of course. This is the most critical and exciting part: transforming your classic application into a modern, scalable, and maintainable Next.js project.

Here is a comprehensive, step-by-step guide to refactor your code. I will provide the new code for each file and explain the logic and key concepts behind the changes.

### The New Approach: Logic and Philosophy

In the old approach, your HTML file was a single, static document, and a large `<script>` tag managed everything: map state, user interactions, and API calls. This works, but quickly becomes hard to manage.

The new Next.js approach is based on a few core principles:

1.  **Componentization:** We will break the UI into small, reusable pieces called **Components**. We'll have a `MapComponent` and a main `HomePage` component that uses it.
2.  **State Management:** Instead of global variables like `startPoint` and `routeLayer`, each component manages its own "memory" using React's **`useState` hook**. When state changes (e.g., a user clicks on the map), React automatically and efficiently re-renders only the parts of the UI that need to update.
3.  **Client Components (`"use client";`)**: Next.js renders components on the server by default for speed. However, interactive UI that needs access to the browser (like a map) must be explicitly marked as a **Client Component**.
4.  **Clean API Calls:** All API calls will be neatly organized inside functions that update the component's state, creating a clear data flow.

---

### **Step 1: Backend (`api-gateway`) Adjustments**

Your backend code is already very good. We just need to make a few small but critical adjustments to make it a proper, standalone microservice.

**File:** `wayline/api-gateway/app.js`

**Action:**
1.  **Install CORS:** Your frontend (`localhost:8080`) is on a different origin than your backend (`localhost:3000`). Browsers block such requests by default for security. We need to explicitly allow it.
    ```bash
    # Run this command inside the /wayline/api-gateway/ directory
    npm install cors
    ```
2.  **Update the code:** Remove the obsolete `express.static` and add the `cors` middleware. Change the hardcoded port to use the environment variable from `docker-compose.yml`.

**Replace the entire content of `wayline/api-gateway/app.js` with this:**

```javascript
// /wayline/api-gateway/app.js

const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const cors = require('cors'); // <-- Import cors

const app = express();
// Use the PORT from environment variables, or default to 3000
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors()); // <-- Enable CORS for all requests
app.use(express.json()); // <-- Middleware to parse JSON bodies

// --- Database Connection ---
// This uses the DATABASE_URL from docker-compose.yml for a cleaner setup.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// --- API Endpoints ---

// This endpoint now uses the service name `routing_engine` from docker-compose.yml
app.get('/api/route', async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) { return res.status(400).send('Missing "from" or "to" query parameters.'); }
    const fromCoords = from.split(',');
    const toCoords = to.split(',');
    if (fromCoords.length !== 2 || toCoords.length !== 2) { return res.status(400).send('Invalid coordinate format. Use "lon,lat".'); }
    // The hostname 'routing_engine' is automatically resolved by Docker's internal DNS
    const osrmUrl = `http://routing_engine:5000/route/v1/driving/${fromCoords[0]},${fromCoords[1]};${toCoords[0]},${toCoords[1]}?overview=full&geometries=geojson`;
    try {
        const response = await axios.get(osrmUrl);
        const route = response.data.routes[0].geometry;
        res.json(route);
    } catch (error) {
        console.error('Error fetching route from OSRM:', error.message);
        res.status(500).send('Error calculating route.');
    }
});

// The geocoding endpoints remain largely the same.
// For now, we'll keep the OpenCage API. This can be swapped for Pelias later.
app.get('/api/geocode', async (req, res) => {
    const { q } = req.query;
    const apiKey = process.env.OPENCAGE_API_KEY; // This needs to be in your .env file
    if (!q) { return res.status(400).send('Missing search query "q".'); }
    if (!apiKey) { return res.status(500).send('Server is missing API key.'); }
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(q)}&key=${apiKey}&limit=1`;
    try {
        const response = await axios.get(url);
        const result = response.data.results[0];
        if (result) {
            res.json({ lat: result.geometry.lat, lng: result.geometry.lng, address: result.formatted });
        } else {
            res.status(404).send('Location not found.');
        }
    } catch (error) {
        console.error('Geocoding error:', error.message);
        res.status(500).send('Error during geocoding.');
    }
});

app.get('/api/reverse-geocode', async (req, res) => {
    const { lat, lng } = req.query;
    const apiKey = process.env.OPENCAGE_API_KEY;
    if (!lat || !lng) { return res.status(400).send('Missing "lat" or "lng" parameters.'); }
    if (!apiKey) { return res.status(500).send('Server is missing API key.'); }
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}&limit=1`;
    try {
        const response = await axios.get(url);
        const result = response.data.results[0];
        if (result) {
            res.json({ address: result.formatted });
        } else {
            res.status(404).send('Address not found.');
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error.message);
        res.status(500).send('Error during reverse geocoding.');
    }
});

app.get('/api/roads', async (req, res) => {
    try {
        const queryResult = await pool.query(
            `SELECT osm_id, highway, ST_AsGeoJSON(way)::json AS geometry
             FROM planet_osm_line
             WHERE highway IS NOT NULL
             LIMIT 1000;`
        );
        const features = queryResult.rows.map(row => ({
            type: 'Feature',
            properties: { id: row.osm_id, type: row.highway },
            geometry: row.geometry,
        }));
        res.status(200).json({ type: 'FeatureCollection', features });
    } catch (err) {
        console.error('Database query error:', err.stack);
        res.status(500).json({ error: 'An error occurred while fetching road data.' });
    }
});

app.listen(PORT, () => {
    console.log(`Wayline API server running on port ${PORT}`);
});
```

---

### **Step 2: Frontend Global Styles and Layout**

We'll move your old CSS into Next.js's global stylesheet and ensure the Leaflet CSS is loaded correctly.

1.  **File:** `wayline/frontend/src/app/globals.css`
    **Action:** Replace its contents with your old CSS.

    ```css
    /* /wayline/frontend/src/app/globals.css */

    /* Import Tailwind's base styles */
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    /* Your old CSS code from index.css */
    body {
        padding: 0;
        margin: 0;
    }

    html, body, #map {
        height: 100%;
        width: 100vw;
    }

    .search-container {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1000;
        background: white;
        padding: 8px;
        border-radius: 5px;
        box-shadow: 0 1px 5px rgba(0,0,0,0.65);
        display: flex;
        gap: 5px; /* Use gap for spacing */
    }

    #search-input {
        border: 1px solid #ccc;
        padding: 5px;
        border-radius: 3px;
    }

    #search-button, #clear-button {
        padding: 5px 10px;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
    }

    #search-button {
        background-color: #007bff;
    }
    #search-button:hover {
        background-color: #0056b3;
    }
    #clear-button {
        background-color: #6c757d;
    }
    #clear-button:hover {
        background-color: #5a6268;
    }
    ```

2.  **File:** `wayline/frontend/src/app/layout.tsx`
    **Action:** This file is the main "shell" for your entire application. We need to import the Leaflet CSS here so it's available on every page.

    ```tsx
    // /wayline/frontend/src/app/layout.tsx
    import type { Metadata } from "next";
    import { Inter } from "next/font/google";
    import "./globals.css";

    // --- IMPORT LEAFLET'S CSS HERE ---
    import 'leaflet/dist/leaflet.css';

    const inter = Inter({ subsets: ["latin"] });

    export const metadata: Metadata = {
      title: "Wayline Maps",
      description: "Next-gen self-hostable mapping platform",
    };

    export default function RootLayout({
      children,
    }: Readonly<{
      children: React.ReactNode;
    }>) {
      return (
        <html lang="en">
          <body className={inter.className}>{children}</body>
        </html>
      );
    }
    ```

---

### **Step 3: Create the Reusable Map Component**

This is where the magic happens. We'll create a dedicated component just for rendering the map. This makes our code clean and reusable.

**Action:**
1.  **Install `react-leaflet`:** This is the official library for using Leaflet with React.
    ```bash
    # Run this command inside the /wayline/frontend/ directory
    npm install leaflet react-leaflet
    npm install -D @types/leaflet # For TypeScript support
    ```
2.  Create a new folder `components` inside `frontend/src`.
3.  Create a new file `Map.tsx` inside the `components` folder.

**File:** `wayline/frontend/src/components/Map.tsx`

```tsx
// /wayline/frontend/src/components/Map.tsx

// This directive tells Next.js that this is a Client Component.
"use client";

import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression, LatLng, Icon } from 'leaflet';
import { useEffect } from 'react';

// You might need to fix the default icon path in Leaflet
// This is a common issue when using bundlers like Webpack or Vite (used by Next.js)
import 'leaflet/dist/images/marker-icon-2x.png';
import 'leaflet/dist/images/marker-icon.png';
import 'leaflet/dist/images/marker-shadow.png';

// Props that our Map component will accept
interface MapProps {
  routeGeoJSON: any; // The GeoJSON data for the route
  startPoint: LatLng | null;
  endPoint: LatLng | null;
  onMapClick: (latlng: LatLng) => void; // A function to handle map clicks
}

// A helper component to control the map imperatively (e.g., set view)
function MapController({ routeGeoJSON }: { routeGeoJSON: any }) {
    const map = useMap(); // Get the map instance
    useEffect(() => {
        // When the route data changes, fit the map to the route's bounds
        if (routeGeoJSON) {
            const routeLayer = L.geoJSON(routeGeoJSON);
            map.fitBounds(routeLayer.getBounds());
        }
    }, [routeGeoJSON, map]); // Re-run this effect if routeGeoJSON or map changes

    return null; // This component doesn't render anything itself
}


export default function MapComponent({ routeGeoJSON, startPoint, endPoint, onMapClick }: MapProps) {
  const initialPosition: LatLngExpression = [13.08, 80.27];

  return (
    <MapContainer center={initialPosition} zoom={12} style={{ height: '100%', width: '100%' }} onClick={(e) => onMapClick(e.latlng)}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* If there is route data, display it as a GeoJSON layer */}
      {routeGeoJSON && <GeoJSON data={routeGeoJSON} style={{ color: '#007bff', weight: 5 }} />}

      {/* If there is a start point, display a marker */}
      {startPoint && (
        <Marker position={startPoint}>
          <Popup>Start Point</Popup>
        </Marker>
      )}

      {/* If there is an end point, display a marker */}
      {endPoint && (
        <Marker position={endPoint}>
          <Popup>End Point</Popup>
        </Marker>
      )}

      {/* Include the controller to manage map view */}
      <MapController routeGeoJSON={routeGeoJSON} />
    </MapContainer>
  );
}
```

---

### **Step 4: Build the Main Page (`page.tsx`)**

This is the final step. We'll replace the main page with a new "smart" component that manages the application state and uses our `MapComponent`.

**Action:**
1.  **Dynamic Import:** The map cannot be rendered on the server. We must import it *dynamically* to ensure it only loads on the client side.
2.  **State Management:** All the old global variables (`startPoint`, etc.) will become `useState` hooks.
3.  **API Logic:** The old `fetch` functions will be rewritten as async functions inside our component.

**File:** `wayline/frontend/src/app/page.tsx`
**Action:** Replace the entire file with this code.

```tsx
// /wayline/frontend/src/app/page.tsx

// Mark this page as a Client Component because it's highly interactive.
"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LatLng } from 'leaflet';

// Dynamically import the MapComponent to ensure it's only loaded on the client side.
// ssr: false is the crucial part.
const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
});

// Main component for our home page
export default function Home() {
  // --- State Management using useState ---
  // We store the data here, and React re-renders the UI when this data changes.
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [endPoint, setEndPoint] = useState<LatLng | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- API and Logic Functions ---

  const clearRoute = () => {
    setStartPoint(null);
    setEndPoint(null);
    setRouteGeoJSON(null);
  };

  const getRoute = async (start: LatLng, end: LatLng) => {
    // Use the environment variable to get the backend URL
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/route?from=${start.lng},${start.lat}&to=${end.lng},${end.lat}`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Route calculation failed');
      const data = await response.json();
      setRouteGeoJSON(data); // Update the state with the new route data
    } catch (error) {
      console.error(error);
      alert('Could not calculate the route.');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/geocode?q=${encodeURIComponent(searchQuery)}`;
    try {
        const response = await fetch(apiUrl);
        if (response.ok) {
            const data = await response.json();
            clearRoute(); // Clear previous state
            const newStartPoint = new LatLng(data.lat, data.lng);
            setStartPoint(newStartPoint); // Set the new start point
        } else {
            alert('Location not found.');
        }
    } catch (error) {
        console.error(error);
        alert('Error during search.');
    }
  };

  const handleMapClick = (latlng: LatLng) => {
    if (startPoint && endPoint) {
        clearRoute();
        setStartPoint(latlng);
        return;
    }

    if (!startPoint) {
      setStartPoint(latlng);
    } else {
      setEndPoint(latlng);
      // We have both points, so now we can fetch the route
      getRoute(startPoint, latlng);
    }
  };

  // --- JSX: The UI of our component ---
  return (
    <main style={{ height: '100vh', width: '100vw' }}>
      <div className="search-container">
        <input
          id="search-input"
          type="text"
          placeholder="Search for a location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button id="search-button" onClick={handleSearch}>Search</button>
        <button id="clear-button" onClick={clearRoute}>Clear</button>
      </div>

      <div id="map" style={{ height: '100%', width: '100%' }}>
        <MapComponent
          routeGeoJSON={routeGeoJSON}
          startPoint={startPoint}
          endPoint={endPoint}
          onMapClick={handleMapClick}
        />
      </div>
    </main>
  );
}
```

link: [[Next js basics]]