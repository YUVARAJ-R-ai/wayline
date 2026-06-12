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
app.use(cors()); // <-- Enable CORS for all requests
app.use(express.json()); // <-- Middleware to parse JSON bodies

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

// --- Database Connection ---
// This uses the DATABASE_URL from docker-compose.yml for a cleaner setup.
const pool = new Pool({
    // docker-compose passes a single DATABASE_URL connection string to this service.
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