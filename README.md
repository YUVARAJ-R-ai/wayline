## Wayline Project Documentation & Setup Guide

### 1. Project Overview

**Wayline** is a high-performance, open-source web mapping application designed for routing and geospatial queries. It is built using a modern **microservice architecture**.

Instead of one single, monolithic program, our application is a system of coordinated, specialized services, each running in its own **Docker container**. This architecture is designed for performance, scalability, and effective team collaboration.

**The "Food Court" Analogy:**
*   **The Food Court (`docker-compose.yml`):** The master blueprint that defines and connects all our services.
*   **The Pantry (`postgres_db` container):** A PostgreSQL/PostGIS database for storing and querying our own custom spatial data.
*   **The Pizza Oven (`routing_engine` container):** The OSRM engine, a specialist that does nothing but calculate routes with extreme speed.
*   **The Front Counter (`api` container):** Our Node.js API, which takes requests from the user and delegates work to the correct specialist service.

### 2. Core Technologies

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Containerization**| Docker & Docker Compose | Creates identical, reproducible environments for all team members. |
| **Version Control** | Git & GitHub/GitLab | Manages and synchronizes source code across the team. |
| **Backend API** | Node.js + Express | The central "manager" API that communicates with other services. |
| **Database** | PostgreSQL + PostGIS | The "source of truth" for custom spatial data. |
| **Routing Engine**| OSRM (Open Source Routing Machine) | Pre-processes map data for millisecond-fast route calculations. |
| **Frontend** | HTML, CSS, JavaScript (Leaflet.js) | Renders the map and visualizes data for the user. |

---

### 3. Phase 0: Prerequisite Setup (For All Team Members)

Before you begin, every team member must install the following tools on their local machine.

*   **Git:** Install Git from the [official website](https://git-scm.com/downloads).
*   **Docker Desktop:** Install Docker Desktop from the [official website](https://www.docker.com/products/docker-desktop/). After installation, ensure the Docker application is running. (For Linux users, follow the official guide for your distribution to install Docker Engine and Docker Compose).

---

### 4. Phase 1: Initial Project Setup (For the Team Lead)

This phase is done only **once** by one person to create the project's foundation.

1.  **Create Repository:** Create a new, private repository on GitHub or GitLab.
2.  **Initialize Project:** On your local machine, create the project folder and initialize it.
    ```bash
    mkdir wayline && cd wayline
    git init
    npm init -y
    npm install express pg
    npm install --save-dev nodemon
    ```3.  **Create `.gitignore`:** Create a file named `.gitignore` to prevent large and unnecessary files from being tracked.
    ```
    # Dependencies
    /node_modules

    # Environment variables
    .env

    # Large data files
    /data/*.pbf
    /data/*.osrm*
    ```
4.  **Create Docker Files:** Create the `Dockerfile` and `docker-compose.yml` files as detailed in the "Final Code" section below.
5.  **Create Server and Frontend Files:** Create the initial `index.js`, `public/index.html`, and `public/index.css` files.
6.  **First Commit:** Add all the created files to Git and push them to the remote repository.
    ```bash
    git add .
    git commit -m "Initial project structure with Docker setup"
    git push -u origin main
    ```
7.  **Team Members Clone:** All other team members can now `git clone <repository-url>` to get the project base.

---

### 5. Phase 2: Data Preparation & Routing Engine Setup

This phase generates the high-speed routing files. This heavy processing only needs to be done **once**.

1.  **Download Data:** The Team Lead downloads the `southern-zone-latest.osm.pbf` file from a source like Geofabrik.
2.  **Place Data:** Create a `data` directory in the project root and place the downloaded `.pbf` file inside it.
3.  **Create Build File:** The Team Lead creates a temporary file named `docker-compose.build.yml` to process the data.
    ```yaml
    # docker-compose.build.yml
    services:
      routing_builder:
        image: osrm/osrm-backend:latest
        volumes:
          - ./data:/data
        command: >
          bash -c "osrm-extract -p /opt/car.lua /data/southern-zone-latest.osm.pbf &&
                   osrm-partition /data/southern-zone-latest.osrm &&
                   osrm-customize /data/southern-zone-latest.osrm"
    ```
4.  **Run Build:** The is to create a high-performance, scalable, and collaborative development environment for a geospatial API providing routing and custom data services.

The architecture is based on a **microservice** approach. Instead of one large program, we run several small, specialized services that communicate with each other. Each service runs in its own isolated **Docker container**, orchestrated by **Docker Compose**.

### **2. Core Architecture**

Our system consists of several independent services working in concert:

| Service | Technology | Container Name | Purpose |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL + PostGIS | `postgres_database` | The master "source of truth" for our own custom spatial data. |
| **Database UI** | pgAdmin4 | `postgres_ui` | A web-based user interface for easily viewing and managing the database. |
| **Routing Engine**| OSRM | `osrm_router` | A high-performance C++ engine that serves routing requests in milliseconds using pre-processed data. |
| **API Server** | Node.js + Express | `wayline_api` | The central "manager" of our application. The frontend only talks to this API, which then delegates tasks to the appropriate backend service. |
| **Frontend** | HTML/CSS/JS + Leaflet | *(Served by the API)* | The user-facing web map that runs in the browser. |

### **3. Prerequisites (For All Team Members)**

Before you begin, every team member must have the following software installed on their computer:

1.  **Git:** For version control. [Download Git](https://git-scm.com/downloads).
2.  **Docker Desktop:** To run our containerized services. [Download Docker Desktop](https://www.docker.com/products/docker-desktop). Make sure the Docker application is running after installation.

---

### **4. First-Time Project Setup (For New Team Members)**

This is the one-time process to get a new developer's machine ready.

#### **Step 1: Get the Project Code**

Clone the repository from your team's central location (e.g., GitHub).

```bash
git clone <your-team-repository-url>
cd wayline
```

#### **Step 2: Get the Processed Routing Data**

The routing engine requires large data files (`.osrm`) that are generated from the source `.osm.pbf` file. These "build artifacts" are not stored in Git. The designated "Data Lead" will generate them once and share them.

1.  Download the shared data archive (e.g., `osrm_data.tar.gz`) from your team's Google Drive, Dropbox, etc.
2.  Place the `osrm_data.tar.gz` file in the root of the `wayline` project directory.
3.  Extract the archive. This will create and populate the `data` folder with all necessary files.
    ```bash
    tar -xzvf osrm_data.tar.gz
    ```

#### **Step 3: Build and Start the Application**

With the code and data in place, run the single command to bring the entire application online.

```bash
docker-compose up --build
```

This will:
*   Build the `wayline-api` Docker image from the `Dockerfile`.
*   Download the official images for PostgreSQL, pgAdmin, and OSRM.
*   Start all containers and link them on a private Docker network.
*   **Leave this terminal running.** It is your live server console.

---

### **5. Daily Development Workflow**

Once the initial setup is complete, daily work is much simpler.

*   **To start the environment:** `docker-compose up`
*   **To stop the environment:** Press `Ctrl + C` in the terminal where it's running, then `docker-compose down` to ensure all containers are removed.
*   **Making Code Changes:** Simply edit the files (`index.js`, `index.html`, etc.) on your local machine. The `api` container uses a mounted volume, so `nodemon` will automatically detect changes and restart the Node.js server for you instantly.

---

### **6. File Manifest & Code**

Here are the final, corrected versions of all the key configuration and code files.

#### **`docker-compose.yml`**

*   **Purpose:** The master blueprint that defines and orchestrates all our services.

```yaml
# docker-compose.yml
# No 'version' tag is needed for modern Docker Compose.

services:
  # The PostgreSQL Database with PostGIS extension
  postgres_db:
    image: postgis/postgis:16-3.4
    container_name: postgres_database
    environment:
      - POSTGRES_DB=wayline
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=admin
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d wayline"]
      interval: 5s
      timeout: 5s
      retries: 5

  # The pgAdmin web interface for managing the database
  postgres_ui:
    image: dpage/pgadmin4
    container_name: postgres_ui
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@example.com
      - PGADMIN_DEFAULT_PASSWORD=admin
    ports:
      - "8080:80"
    depends_on:
      - postgres_db

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

  # The high-performance routing engine
  routing_engine:
    image: osrm**

Follow these steps to get a complete, running instance of the project on your local machine. This is a one-time setup.

#### **Step 1: Clone the Repository**
Open your terminal and clone the project from your team's Git repository.
```bash
git clone <your-repository-url.git>
cd wayline
```

#### **Step 2: Obtain and Place the OSRM Data**
The routing engine requires large, pre-processed data files (`.osrm` files) that are not stored in Git.
1.  Download the shared data archive (`osrm_data.tar.gz`) from the team's shared drive (e.g., Google Drive, S3).
2.  Place the downloaded `osrm_data.tar.gz` file in the root of the `wayline` project folder.
3.  Extract the archive. This will create and populate the `data/` directory with all the necessary `.pbf` and `.osrm` files.
    ```bash
    tar -xzvf osrm_data.tar.gz
    ```

#### **Step 3: Build and Start the Services**
This command reads the `docker-compose.yml` file and starts all the services. It will also build the custom `api` Docker image.
```bash
docker-compose up --build
```The first time you run this, Docker will download all the necessary images. Leave this terminal window running, as it displays the live logs for all services.

#### **Step 4: Load Data into the Database**
The `postgres_db` container starts empty. You must populate it with the road network data from the `.osm.pbf` file.
1.  **Open a NEW terminal window** (do not close the one from Step 3).
2.  **Copy the data file** into the running database container:
    ```bash
    docker cp data/southern-zone-latest.osm.pbf postgres_database:/tmp/data.osm.pbf
    ```
3.  **Run the `osm2pgsql` import process** inside the container. This will take several minutes.
    ```bash
    docker exec -it postgres_database osm2pgsql -d wayline -U admin -W --create --slim -C 2048 --hstore --multi-geometry /tmp/data.osm.pbf
    ```    When prompted for a password, enter `admin` (as configured in `docker-compose.yml`).

#### **Step 5: Verify the Setup**
If all steps were successful, your full application is now running.
*   **Your Web Application:** [http://localhost:5000](http://localhost:5000)
*   **Your Routing Engine (Test URL):** [http://localhost:5001](http://localhost:5001)
*   **Your Database UI (pgAdmin):** [http://localhost:8080](http://localhost:8080) (Login with `admin@example.com` / `admin`)

## **5. Daily Development Workflow**

Once the first-time setup is complete, your daily workflow is much simpler.

*   **To start all services:**
    ```bash
    docker-compose up
    ```
*   **To stop all services:**
    *   Press `Ctrl + C` in the terminal where the services are running.
    *   Or, from another terminal, run `docker-compose down` to stop and remove the containers.

*   **To view logs for a specific service:**
    ```bash
    docker-compose logs wayline_api
    docker-compose logs routing_engine
    ```

*   **To connect directly to the database:**
    ```bash
    docker exec -it postgres_database psql -U admin -d wayline
    ```

## **6. Project Structure**

```
wayline/
├── data/                  # Contains raw (.pbf) and processed (.osrm) map data.
├── node_modules/          # Node.js dependencies (ignored by Git).
├── public/                # All frontend files (HTML, CSS, browser JS).
│   ├── index.css
│   └── index.html
├── .gitignore             # Tells Git which files to ignore.
├── Dockerfile             # Recipe for building the 'api' container.
├── docker-compose.yml     # Master blueprint for orchestrating all services.
├── package.json           # Defines Node.js project info and dependencies.
└── index.js               # The backend API server code (Node.js/Express).
```

## **7. Next Steps**

With the foundational application running, the next major steps are:
1.  **Implement Routing Endpoint:** Create a `/api/route` endpoint in `index.js` that calls the `osrm_router` service.
2.  **Enhance Frontend:** Add UI elements to the frontend to allow users to click on the map to define start and end points for routing.
3.  **Add Geocoding Service:** Add a new geocoding service (e.g., Photon) to `docker-compose.yml`, populate its data, and create a `/api/geocode` endpoint.