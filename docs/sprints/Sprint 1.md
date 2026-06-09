### The Game Plan for 6 Hours

Our goal is to refactor your app into the target microservice architecture and implement the **entire user authentication and API key system**. This is the most critical new feature. We will defer the complex Pelias/Geocoding setup and the fancy dashboard UI for later.

**What We'll Accomplish:**
1.  A separate Next.js frontend and Node.js/Express backend, running in Docker.
2.  Full user registration and login.
3.  The ability for logged-in users to generate API keys.
4.  Your existing routing API will be protected, requiring a valid API key.
5.  A basic dashboard to view and manage keys.

**What We'll Defer (to do after the 6 hours):**
-   **Geocoding (Pelias):** This is the biggest time sink. We will create placeholder API endpoints but not implement the service.
-   **Fancy Dashboard UI:** No charts or usage stats. Just key management.
-   **Advanced Styling:** We'll use basic TailwindCSS. Function over form.
-   **Automated Tests:** No time for tests in this sprint.

---

### **The 6-Hour Sprint: Step-by-Step**

**Prerequisites:** You have Docker, Node.js, and npm installed.

---

### **Hour 1: Project Restructure & Foundation (0:00 - 1:00)**

**Goal:** Get a blank Next.js app and your backend running in a new microservice structure.

1.  **Create Directories (5 mins):**
    *   In your `wayline` root, run: `mkdir api-gateway frontend`

2.  **Move Backend Files (10 mins):**
    *   Move `index.js`, `package.json`, `package-lock.json`, and your old `Dockerfile` into the `api-gateway` directory.
    *   Rename `api-gateway/index.js` to `api-gateway/app.js`.

3.  **Initialize Next.js Frontend (15 mins):**
    *   `cd frontend`
    *   Run `npx create-next-app@latest .` with these options: **Yes** to TypeScript, ESLint, Tailwind CSS, `src/` directory, and App Router.
    *   Once done, `cd ..` to go back to the root.
    link : [[Next js basics]]
4.  **Create the Master `docker-compose.yml` (25 mins):**
    *   At the `wayline` root, create a `docker-compose.yml` file and paste this in. This is our new foundation.

    ```yaml
    version: '3.8'
    services:
      api-gateway:
        container_name: wayline_api_gateway
        build: ./api-gateway
        ports:
          - "3000:3000"
        environment:
          - DATABASE_URL=postgresql://wayline:password@postgres:5432/wayline
          - OSRM_URL=http://osrm:5000
          - JWT_SECRET=THIS_IS_A_SECRET_CHANGE_IT
        depends_on:
          - postgres
          - osrm
        volumes:
          - ./api-gateway:/app
          - /app/node_modules

      frontend:
        container_name: wayline_frontend
        build: ./frontend
        ports:
          - "8080:3000"
        environment:
          - NEXT_PUBLIC_API_URL=http://localhost:3000
        depends_on:
          - api-gateway
        volumes:
          - ./frontend:/app
          - /app/node_modules

      osrm:
        # Your existing OSRM config
        image: osrm/osrm-backend:latest
        ports:
          - "5000:5000"
        volumes:
          - ./data/osrm:/data
        command: osrm-routed --algorithm mld /data/region.osrm

      postgres:
        # New Postgres service from the PRD
        image: postgis/postgis:15-3.3
        ports:
          - "5432:5432"
        volumes:
          - ./data/postgres:/var/lib/postgresql/data
        environment:
          - POSTGRES_DB=wayline
          - POSTGRES_USER=wayline
          - POSTGRES_PASSWORD=password
    ```

5.  **Run it! (5 mins):**
    *   From the root, run `docker-compose up --build`. It will likely fail on the frontend or backend build, but it will pull the images. We'll fix the Dockerfiles next.

**Checkpoint:** You have the right folders and a `docker-compose.yml`.

---

### **Hour 2: Backend Auth API (1:00 - 2:00)**

**Goal:** Create the user database tables and the `register`/`login` endpoints.

1.  **Fix Backend Dockerfile (10 mins):**
    *   Open `api-gateway/Dockerfile`. Ensure it copies `app.js` and `package.json` correctly and runs the app.
    *   A simple one:
        ```dockerfile
        FROM node:18-alpine
        WORKDIR /app
        COPY package*.json ./
        RUN npm install
        COPY . .
        EXPOSE 3000
        CMD ["npm", "start"]
        ```
    *   In `api-gateway/package.json`, make sure the `start` script is `node app.js`.

2.  **Install Backend Dependencies (5 mins):**
    *   Stop docker-compose. From the `wayline/api-gateway` directory, run:
        ```bash
        npm install pg jsonwebtoken bcryptjs uuid cors
        ```

3.  **Create Database Tables (20 mins):**
    *   Add logic to your `api-gateway/app.js` to connect to Postgres using the `pg` library.
    *   On startup, have it run the `CREATE TABLE` queries from the PRD (Section 5.5.4) for `users` and `api_keys`. Use `IF NOT EXISTS` to prevent errors on restart.

4.  **Create Auth Routes (25 mins):**
    *   In `api-gateway/app.js`, add the two endpoints. Don't worry about splitting into route files yet. Keep it simple.
        *   `POST /auth/register`: Takes `email`, `password`. Hashes password with `bcrypt.hash()`. Saves to the `users` table.
        *   `POST /auth/login`: Takes `email`, `password`. Finds user, compares hash with `bcrypt.compare()`. If successful, creates a JWT with `jwt.sign()` and sends it back.
    *   Remember to `app.use(cors())` and `app.use(express.json())`.

**Checkpoint:** Run `docker-compose up --build`. You can now use a tool like Postman to hit `http://localhost:3000/auth/register` and create a user.

---

### **Hour 3 & 4: Frontend Auth & Map Migration (2:00 - 4:00)**

**Goal:** Create the Next.js UI for login/register and migrate your old map code into a React component.

1.  **Fix Frontend Dockerfile (10 mins):**
    *   Next.js needs a specific `Dockerfile`. Open `frontend/Dockerfile` and replace its contents with:
        ```dockerfile
        FROM node:18-alpine
        WORKDIR /app
        COPY package*.json ./
        RUN npm install
        COPY . .
        EXPOSE 3000
        CMD ["npm", "run", "dev"]
        ```

2.  **Create Login/Register Pages (45 mins):**
    *   Create two new pages in `frontend/src/app/`:
        *   `login/page.jsx`: A simple form with email/password fields and a "Login" button.
        *   `register/page.jsx`: A similar form for registration.
    *   Use `useState` to manage form inputs.
    *   The `onSubmit` handler for each form should `fetch` the corresponding API endpoint on your backend (`http://localhost:3000/auth/...`).
    *   On successful login, save the received JWT to local storage for now. (Better state management can come later).

3.  **Migrate Map to a Component (45 mins):**
    *   In the `frontend` directory, install Leaflet: `npm install leaflet react-leaflet` and `npm install -D @types/leaflet`.
    *   Create `frontend/src/components/Map.jsx`.
    *   **At the top, add `"use client";`**.
    *   Copy your old Leaflet JS logic into this component, adapting it to use `react-leaflet` components like `<MapContainer>`, `<TileLayer>`, `<Marker>`, `<GeoJSON>`.
    *   In your main page (`frontend/src/app/page.jsx`), import the map using a dynamic import to ensure it's client-side only:
        ```javascript
        import dynamic from 'next/dynamic';
        const Map = dynamic(() => import('@/components/Map'), { ssr: false });
        ```

4.  **Connect Routing UI (20 mins):**
    *   On your main page, add the "From" and "To" input fields.
    *   The "Get Route" button's `onClick` handler will call your backend `/api/route` endpoint.
    *   Pass the resulting GeoJSON data as a prop to your `<Map />` component, which will render it.

**Checkpoint:** Your app should now be fully migrated. You can register, log in, and see the map. The routing API call will fail because we haven't protected it yet, which is our next step!

---

### **Hour 5: Protecting Routes & Managing API Keys (4:00 - 5:00)**

**Goal:** Secure the routing API and build the UI to manage keys.

1.  **Backend: API Key Middleware (20 mins):**
    *   In `api-gateway/app.js`, create a middleware function `const protectWithApiKey = async (req, res, next) => { ... }`.
    *   It should read the `X-API-Key` header.
    *   It will hash this key (e.g., with SHA256, it's faster than bcrypt) and look for the hash in your `api_keys` table.
    *   If found, it calls `next()`. If not, it returns a `401 Unauthorized` error.
    *   Apply this middleware to your `/api/route` endpoint: `app.get('/api/route', protectWithApiKey, (req, res) => ...)`

2.  **Backend: API Key Management Routes (15 mins):**
    *   Create three new endpoints:
        *   `GET /api/keys`: Requires a JWT. Finds the user ID from the JWT and returns all keys for that user.
        *   `POST /api/keys`: Requires a JWT. Generates a new key (`wlk_` + random string). Hashes it, saves it to the DB, and returns the **full, unhashed key** to the user **just this once**.
        *   `DELETE /api/keys/:keyPrefix`: Requires a JWT. Deletes the key by its prefix.

3.  **Frontend: API Key Dashboard (25 mins):**
    *   Create a new page `frontend/src/app/dashboard/page.jsx`.
    *   Use `useEffect` to fetch `/api/keys` from the backend (remember to include the JWT in the Authorization header).
    *   Display the keys in a list with a "Delete" button.
    *   Add a "Generate New Key" button that calls the `POST` endpoint and displays the new key in a modal.

**Checkpoint:** You can now generate an API key from the dashboard, and use it in a tool like Postman with the `X-API-Key` header to successfully get a route.

---

### **Hour 6: Integration, Polish & Stubbing (5:00 - 6:00)**

**Goal:** Tie everything together and prepare for future work.

1.  **Integrate Key into Frontend Route Call (15 mins):**
    *   On your main map page, the user now needs to provide their API key. Add an input field for it.
    *   When calling `/api/route`, add the `headers: { 'X-API-Key': apiKey }` to your `fetch` request.

2.  **Stub out Geocoding API (15 mins):**
    *   In `api-gateway/app.js`, create the geocoding endpoints from the PRD, but have them return a hardcoded "coming soon" message. This prevents frontend errors if you build the UI later.
    *   `app.get('/api/geocode', protectWithApiKey, (req, res) => res.json({ message: 'Geocoding coming soon!' }));`
    *   `app.get('/api/reverse-geocode', protectWithApiKey, (req, res) => res.json({ message: 'Reverse geocoding coming soon!' }));`

3.  **Final Polish & Debugging (30 mins):**
    *   This is your buffer. Click through everything.
    *   Does login redirect to the dashboard?
    *   Does generating a key work?
    *   Can you copy that key to the main page and get a route?
    *   Add simple loading states (`const [isLoading, setIsLoading] = useState(false)`).
    *   Add a simple navigation header with links to Home, Login, and Dashboard.

**CONGRATULATIONS!** In 6 hours, you've built the architectural foundation of a complex SaaS application, complete with a working core feature (routing) protected by a full authentication and API key system. The project is now perfectly positioned for you to continue with the rest of the PRD features.