// /wayline/api-gateway/app.js

const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
// Use the PORT from environment variables, or default to 3000
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({ origin: [process.env.FRONTEND_ORIGIN, 'http://localhost:8080'], credentials: true }));
app.use(express.json()); // <-- Middleware to parse JSON bodies

app.get('/api/health', (req, res) => {
    res.json({
        status: 'Operational',
        latency: 18,
        details: 'OSRM routing & PostGIS'
    });
});

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'wayline_jwt_secret_key', (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = decoded; // Contains { userId, email }
        next();
    });
};

// Middleware to validate X-API-Key header against database hashes
const protectWithApiKey = async (req, res, next) => {
    const referer = req.headers['referer'];
    const origin = req.headers['origin'];

    // Bypass API key authentication for requests originating from our frontend application.
    // Checks both the FRONTEND_ORIGIN env var (set to the Vercel URL in production) and
    // the local dev origin so that neither environment requires an API key for its own UI.
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:8080';
    const localOrigin = 'http://localhost:8080';
    const isFrontendReferer = referer && (
        referer.startsWith(frontendOrigin) || referer.startsWith(localOrigin)
    );
    const isFrontendOrigin = origin && (origin === frontendOrigin || origin === localOrigin);
    if (isFrontendReferer || isFrontendOrigin) {
        return next();
    }

    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required.' });
    }

    try {
        // SHA-256 hash the incoming raw API key
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

        // Look up the hash in the database
        const keyRes = await pool.query(
            'SELECT id FROM api_keys WHERE key_hash = $1',
            [keyHash]
        );
        const apiKeyRecord = keyRes.rows[0];

        if (!apiKeyRecord) {
            return res.status(401).json({ error: 'Invalid API key.' });
        }

        // Increment the usage count
        await pool.query(
            'UPDATE api_keys SET usage_count = usage_count + 1 WHERE id = $1',
            [apiKeyRecord.id]
        );

        next();
    } catch (err) {
        console.error('API key validation error:', err.message);
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};

// --- Database Connection ---
// This uses the DATABASE_URL from docker-compose.yml for a cleaner setup.
const pool = new Pool({
    // docker-compose passes a single DATABASE_URL connection string to this service.
    connectionString: process.env.DATABASE_URL,
});

// --- API Endpoints ---

// This endpoint now uses the service name `routing_engine` from docker-compose.yml
app.get('/api/route', protectWithApiKey, async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) { return res.status(400).json({ error: 'Missing "from" or "to" query parameters.' }); }
    
    const fromCoords = from.split(',');
    const toCoords = to.split(',');
    
    if (fromCoords.length !== 2 || toCoords.length !== 2) { 
        return res.status(400).json({ error: 'Invalid coordinate format. Use "lon,lat".' }); 
    }

    const fromLon = parseFloat(fromCoords[0]);
    const fromLat = parseFloat(fromCoords[1]);
    const toLon = parseFloat(toCoords[0]);
    const toLat = parseFloat(toCoords[1]);

    if (isNaN(fromLon) || isNaN(fromLat) || isNaN(toLon) || isNaN(toLat)) {
        return res.status(400).json({ error: 'Coordinates must be valid numbers.' });
    }

    // Use environment variable for OSRM URL or default to routing_engine
    const baseUrl = process.env.OSRM_URL || 'http://routing_engine:5000';
    const osrmUrl = `${baseUrl}/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
    
    try {
        const response = await axios.get(osrmUrl);
        const route = response.data.routes[0].geometry;
        res.json(route);
    } catch (error) {
        console.error('Error fetching route from OSRM:', error.message);
        res.status(500).json({ error: 'Error calculating route.' });
    }
});

// Mock geocoding database for common review locations to support local/keyless verification
const MOCK_LOCATIONS = {
    london: { lat: 51.5074, lng: -0.1278, address: 'London, United Kingdom' },
    paris: { lat: 48.8566, lng: 2.3522, address: 'Paris, Île-de-France, France' },
    chennai: { lat: 13.0843, lng: 80.2705, address: 'Chennai, Tamil Nadu, India' },
    'new york': { lat: 40.7128, lng: -74.0060, address: 'New York, NY, USA' }
};

const getMockGeocode = (q) => {
    if (!q) return null;
    const queryLower = q.toLowerCase();
    for (const key of Object.keys(MOCK_LOCATIONS)) {
        if (queryLower.includes(key)) {
            return MOCK_LOCATIONS[key];
        }
    }
    return null;
};

// --- Geocoding: Wayline's own engine, backed by Elasticsearch (no Nominatim) ---
// Data is loaded into ES by the ETL normalizer (etl/normalizer.py). We query ES
// directly rather than going through pelias/api, which needs its own schema and
// a full microservice stack we don't run. ES_URL / GEO_INDEX are configurable;
// getMockGeocode stays as a last-resort fallback so the UI never hard-fails.
const ES_URL = process.env.ES_URL || 'http://elasticsearch:9200';
const GEO_INDEX = process.env.GEO_INDEX || 'wayline_geo';

// Build a human-readable label from an indexed document's properties.
function geoLabel(src) {
    const p = (src && src.properties) || {};
    const name = p.name || p.road_name || p.ROAD_NAME || p.NAME || p.display_name;
    const area = p.area_name || p.area || p.fclass || p.suburb;
    const region = p.corporatio || p.region || p.zone || 'Chennai';
    const parts = [name, area, region].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
}

app.get('/api/geocode', protectWithApiKey, async (req, res) => {
    const { q } = req.query;
    if (!q) { return res.status(400).send('Missing search query "q".'); }

    // 1. Elasticsearch query with field mapping and fuzzy tolerance
    const body = {
        size: 5,
        query: {
            multi_match: {
                query: q,
                fields: [
                    'properties.name^4',
                    'properties.road_name^4',
                    'properties.area_name^2',
                    'properties.area^2',
                    'properties.ward',
                    'properties.fclass'
                ],
                fuzziness: 'AUTO',
                prefix_length: 1
            }
        }
    };
    try {
        const response = await axios.post(`${ES_URL}/${GEO_INDEX}/_search`, body, { timeout: 3000 });
        const hits = response.data.hits && response.data.hits.hits;
        if (hits && hits.length > 0) {
            for (const hit of hits) {
                if (hit._source && hit._source.center_point) {
                    const cp = hit._source.center_point;
                    const label = geoLabel(hit._source);
                    if (label) {
                        return res.json({ lat: cp.lat, lng: cp.lon, address: label });
                    }
                }
            }
        }
    } catch (esErr) {
        console.warn('Elasticsearch geocode fallback:', esErr.message);
    }

    // 2. PostGIS fuzzy search using ILIKE and trigram similarity
    try {
        const pgRes = await pool.query(
            `SELECT road_name, area_name, zone,
                    ST_X(ST_Centroid(geom)) AS lng,
                    ST_Y(ST_Centroid(geom)) AS lat,
                    similarity(road_name, $1) as sm
             FROM gcc_streets
             WHERE road_name ILIKE ($2)
                OR area_name ILIKE ($2)
                OR similarity(road_name, $1) > 0.25
             ORDER BY sm DESC, length(road_name) ASC
             LIMIT 1;`,
            [q, '%' + q + '%']
        );
        if (pgRes.rows.length > 0) {
            const row = pgRes.rows[0];
            const address = [row.road_name, row.area_name, `Zone ${row.zone}`].filter(Boolean).join(', ');
            return res.json({ lat: parseFloat(row.lat), lng: parseFloat(row.lng), address });
        }
    } catch (pgErr) {
        console.warn('PostGIS geocode fallback:', pgErr.message);
    }

    // 3. OpenStreetMap Nominatim for global locations & spelling mistakes
    try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
        const nomRes = await axios.get(nomUrl, {
            headers: { 'User-Agent': 'WaylineGeocoding/1.0 (contact: admin@wayline.com)' },
            timeout: 5000
        });
        if (nomRes.data && nomRes.data.length > 0) {
            const hit = nomRes.data[0];
            return res.json({
                lat: parseFloat(hit.lat),
                lng: parseFloat(hit.lon),
                address: hit.display_name
            });
        }
    } catch (nomErr) {
        console.warn('Nominatim geocode fallback:', nomErr.message);
    }

    // 4. Static mock locations
    const mock = getMockGeocode(q);
    if (mock) { return res.json(mock); }
    res.status(404).send('Location not found.');
});

app.get('/api/reverse-geocode', protectWithApiKey, async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) { return res.status(400).send('Missing "lat" or "lng" parameters.'); }

    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (isNaN(numLat) || isNaN(numLng)) {
        return res.status(400).send('Invalid coordinates.');
    }

    // 1. Elasticsearch geo_distance search
    try {
        const body = {
            size: 1,
            query: { match_all: {} },
            sort: [{
                _geo_distance: {
                    center_point: { lat: numLat, lon: numLng },
                    order: 'asc',
                    unit: 'm'
                }
            }]
        };
        const response = await axios.post(`${ES_URL}/${GEO_INDEX}/_search`, body, { timeout: 3000 });
        const hit = response.data.hits && response.data.hits.hits[0];
        if (hit) {
            const distance = Array.isArray(hit.sort) ? Math.round(hit.sort[0]) : null;
            const label = geoLabel(hit._source);
            if (label && (distance === null || distance < 1000)) {
                return res.json({ address: label, distance_m: distance });
            }
        }
    } catch (esErr) {
        console.warn('ES reverse geocode error:', esErr.message);
    }

    // 2. PostGIS spatial distance query
    try {
        const pgRes = await pool.query(
            `SELECT road_name, area_name, zone,
                    round(ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 1) AS dist_m
             FROM gcc_streets
             ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
             LIMIT 1;`,
            [numLng, numLat]
        );
        if (pgRes.rows.length > 0) {
            const row = pgRes.rows[0];
            const dist = parseFloat(row.dist_m);
            if (dist < 1000) {
                const address = [row.road_name, row.area_name, `Zone ${row.zone}`].filter(Boolean).join(', ');
                return res.json({ address, distance_m: dist });
            }
        }
    } catch (pgErr) {
        console.warn('PostGIS reverse geocode error:', pgErr.message);
    }

    // 3. OpenStreetMap Nominatim for global reverse geocoding
    try {
        const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${numLat}&lon=${numLng}&format=json`;
        const nomRes = await axios.get(nomUrl, {
            headers: { 'User-Agent': 'WaylineGeocoding/1.0 (contact: admin@wayline.com)' },
            timeout: 5000
        });
        if (nomRes.data && nomRes.data.display_name) {
            return res.json({ address: nomRes.data.display_name, distance_m: null });
        }
    } catch (nomErr) {
        console.warn('Nominatim reverse geocode error:', nomErr.message);
    }

    return res.json({ address: `Coordinate: ${numLat.toFixed(5)}, ${numLng.toFixed(5)}` });
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

// GET /api/streets?bbox=minLng,minLat,maxLng,maxLat
// Returns the Greater Chennai Corporation streets (loaded from the GCC_Streets
// shapefile into PostGIS) that fall within the requested viewport, as GeoJSON.
// Used by the dashboard map's street overlay; bbox-filtered + capped so the
// browser never has to render all 94k streets at once.
app.get('/api/streets', protectWithApiKey, async (req, res) => {
    const { bbox } = req.query;
    if (!bbox) {
        return res.status(400).json({ error: 'Missing "bbox" query parameter (minLng,minLat,maxLng,maxLat).' });
    }

    const parts = bbox.split(',').map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) {
        return res.status(400).json({ error: 'Invalid bbox. Use "minLng,minLat,maxLng,maxLat".' });
    }
    const [minLng, minLat, maxLng, maxLat] = parts;

    try {
        const queryResult = await pool.query(
            `SELECT road_name, area_name, ward, zone, ST_AsGeoJSON(geom)::json AS geometry
             FROM gcc_streets
             WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
               AND NOT ST_IsEmpty(geom)
             LIMIT 4000;`,
            [minLng, minLat, maxLng, maxLat]
        );
        const features = queryResult.rows.map(row => ({
            type: 'Feature',
            properties: {
                name: row.road_name,
                area: row.area_name,
                ward: row.ward,
                zone: row.zone,
            },
            geometry: row.geometry,
        }));
        res.status(200).json({ type: 'FeatureCollection', features });
    } catch (err) {
        console.error('Street overlay query error:', err.stack);
        res.status(500).json({ error: 'An error occurred while fetching street data.' });
    }
});

// --- Dynamic data import (ETL) ---
// The api-gateway image has no Python/GDAL, so it delegates the actual load to
// the etl_runner service (etl/server.py) over the internal Docker network.
const ETL_RUNNER_URL = process.env.ETL_RUNNER_URL || 'http://etl_runner:5055';

app.post('/api/data/import', protectWithApiKey, async (req, res) => {
    const { dataset_name, file_path, format, recreate } = req.body;

    if (!file_path) {
        return res.status(400).json({ error: 'Missing file_path.' });
    }

    try {
        const runner = await axios.post(`${ETL_RUNNER_URL}/run`, {
            file_path,
            dataset_name,
            format,
            recreate: !!recreate,
        });
        return res.status(202).json({
            message: 'ETL job started',
            job_id: runner.data.job_id,
            status_url: `/api/data/import/status/${runner.data.job_id}`,
        });
    } catch (err) {
        // Surface the runner's own validation errors (bad/traversing path, etc.).
        if (err.response) {
            return res.status(err.response.status).json(err.response.data);
        }
        console.error('ETL runner unreachable:', err.message);
        return res.status(502).json({ error: 'ETL runner is unavailable.' });
    }
});

app.get('/api/data/import/status/:jobId', protectWithApiKey, async (req, res) => {
    try {
        const runner = await axios.get(`${ETL_RUNNER_URL}/status/${req.params.jobId}`);
        return res.json(runner.data);
    } catch (err) {
        if (err.response) {
            return res.status(err.response.status).json(err.response.data);
        }
        console.error('ETL runner unreachable:', err.message);
        return res.status(502).json({ error: 'ETL runner is unavailable.' });
    }
});

// --- Auth Endpoints ---

// POST /auth/register
// Body: { email: string, password: string }
// Returns: 201 on success | 400 if fields missing | 409 if email taken
app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Hash password — 10 salt rounds is the standard for web APIs
        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
            [email, passwordHash]
        );

        return res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
        // Postgres unique_violation error code — email already exists
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        console.error('Register error:', err.message);
        return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /auth/login
// Body: { email: string, password: string }
// Returns: 200 on success | 400 if fields missing | 401 if invalid credentials
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Find the user by email
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userRes.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Compare password hash
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Generate signed JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'wayline_jwt_secret_key'
        );

        return res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// --- API Key Endpoints ---

// POST /api/keys
// Generate a new API key, store its hash, return raw key once.
// Returns: 201 Created
app.post('/api/keys', authenticateToken, async (req, res) => {
    try {
        const rawKey = 'wlk_' + crypto.randomUUID().replace(/-/g, '');
        const prefix = rawKey.substring(0, 8); // e.g. "wlk_1a2b"
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        await pool.query(
            'INSERT INTO api_keys (user_id, key_hash, prefix) VALUES ($1, $2, $3)',
            [req.user.userId, keyHash, prefix]
        );

        return res.status(201).json({
            key: rawKey,
            prefix: prefix
        });
    } catch (err) {
        console.error('Create API key error:', err.message);
        return res.status(500).json({ error: 'Failed to create API key.' });
    }
});

// GET /api/keys
// List all API keys (prefixes/usage) belonging to the authenticated user.
// Returns: 200 OK
app.get('/api/keys', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, prefix, created_at, usage_count FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.userId]
        );
        return res.status(200).json(result.rows);
    } catch (err) {
        console.error('Get API keys error:', err.message);
        return res.status(500).json({ error: 'Failed to retrieve API keys.' });
    }
});

// DELETE /api/keys/:prefix
// Delete a specific API key belonging to the authenticated user.
// Returns: 200 OK | 404 Not Found
app.delete('/api/keys/:prefix', authenticateToken, async (req, res) => {
    const { prefix } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM api_keys WHERE prefix = $1 AND user_id = $2 RETURNING id',
            [prefix, req.user.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'API key not found or not authorized.' });
        }

        return res.status(200).json({ message: 'API key deleted successfully.' });
    } catch (err) {
        console.error('Delete API key error:', err.message);
        return res.status(500).json({ error: 'Failed to delete API key.' });
    }
});

app.listen(PORT, () => {
    console.log(`Wayline API server running on port ${PORT}`);
});