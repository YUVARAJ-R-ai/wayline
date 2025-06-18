// index.js (Updated)

const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const app = express();
const PORT = 5000;

// --- Database Connection (Now using environment variables) ---
const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: 'postgres_db', // This is a service name, not a secret
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
});

app.use(express.static('public'));

// --- ALL OTHER ENDPOINTS (route, geocode, reverse-geocode) remain the same ---
// They already correctly use process.env.OPENCAGE_API_KEY

// ... (paste the rest of your /api/route, /api/geocode, and /api/reverse-geocode endpoints here without any changes) ...
app.get('/api/route', async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) { return res.status(400).send('Missing "from" or "to" query parameters.'); }
    const fromCoords = from.split(',');
    const toCoords = to.split(',');
    if (fromCoords.length !== 2 || toCoords.length !== 2) { return res.status(400).send('Invalid coordinate format. Use "lon,lat".'); }
    const osrmUrl = `http://osrm_router:5000/route/v1/driving/${fromCoords[0]},${fromCoords[1]};${toCoords[0]},${toCoords[1]}?overview=full&geometries=geojson`;
    try {
        const response = await axios.get(osrmUrl);
        const route = response.data.routes[0].geometry;
        res.json(route);
    } catch (error) {
        console.error('Error fetching route from OSRM:', error.message);
        res.status(500).send('Error calculating route.');
    }
});

app.get('/api/geocode', async (req, res) => {
    const { q } = req.query;
    const apiKey = process.env.OPENCAGE_API_KEY;
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
    console.log('API call received: GET /api/roads');
    try {
        // --- THIS QUERY HAS CHANGED ---
        // 1. We now query 'planet_osm_line', the table created by osm2pgsql.
        // 2. We select rows WHERE the 'highway' tag exists, as this identifies roads and paths.
        // 3. We select the 'highway' tag itself to see the type of road.
        const queryResult = await pool.query(
            `SELECT osm_id, highway, ST_AsGeoJSON(way)::json AS geometry 
             FROM planet_osm_line 
             WHERE highway IS NOT NULL 
             LIMIT 1000;`
        );

        // The logic to format the data into GeoJSON remains the same.
        const features = queryResult.rows.map(row => {
            return {
                type: 'Feature',
                properties: {
                    id: row.osm_id,
                    type: row.highway, // We can now include the road type in our data!
                },
                geometry: row.geometry,
            };
        });

        const geoJsonData = {
            type: 'FeatureCollection',
            features: features,
        };

        res.status(200).json(geoJsonData);

    } catch (err) {
        console.error('Database query error:', err.stack);
        res.status(500).json({ error: 'An error occurred while fetching road data.' });
    }
});

app.listen(PORT, () => {
    console.log(`Wayline API server is now running on http://localhost:${PORT}`);
});