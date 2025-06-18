
# **Wayline Geospatial API - Project Documentation & Setup Guide**

### **1. Project Overview**

**Wayline** is a high-performance, self-hosted geospatial API designed to provide core mapping functionalities, primarily routing and custom data queries.

The architecture is based on **microservices**. Instead of one large program, our application is a system of coordinated, specialized services, each running in its own isolated **Docker container**. This architecture is designed for performance, scalability, and effective team collaboration.

### **2. System Architecture**

| Service | Docker Container Name | Technology | Purpose |
| :--- | :--- | :--- | :--- |
| **Custom Database**| `postgres_database` | Custom Docker Image (PostGIS + osm2pgsql) | The "source of truth" for our custom OpenStreetMap data. |
| **Database UI** | `postgres_ui` | pgAdmin 4 | A web-based interface for easily viewing and managing the database. |
| **Routing Engine**| `osrm_router` | OSRM (C++) | A dedicated, high-speed engine for calculating routes using pre-processed data. |
| **API Server** | `wayline_api` | Node.js + Express | The central "manager" of our application. The frontend only talks to this API, which then delegates tasks to the appropriate backend service. |

### **3. Prerequisites (For All Team Members)**

Before you begin, every team member must have the following software installed on their computer:

1.  **Git:** For version control. [Download Git](https://git-scm.com/downloads).
2.  **Docker Desktop:** To run our containerized services. [Download Docker Desktop](https://www.docker.com/products/docker-desktop). Make sure the Docker application is running after installation.

---

### **4. One-Time Project Setup for New Developers**

Follow these steps to get a complete, running instance of the project on your local machine.

#### **Setup Step 1: Get the Project Code**

Clone the repository from your team's central location (e.g., GitHub).

```bash
git clone <your-team-repository-url>
cd wayline
```

#### **Setup Step 2: Obtain the Processed Routing Data**

The routing engine requires large, pre-processed data files (`.osrm` files) that are not stored in Git. The designated "Data Lead" is responsible for generating these once and sharing them with the team.

1.  Download the shared data archive (e.g., `osrm_data.tar.gz`) from the team's shared drive (e.g., Google Drive, S3).
2.  Place the downloaded `osrm_data.tar.gz` file in the root of the `wayline` project folder.
3.  Extract the archive. This will create and populate the `data/` directory with all necessary `.pbf` and `.osrm` files.
    ```bash
    tar -xzvf osrm_data.tar.gz
    ```

#### **Setup Step 3: Build and Start the Services**

This command reads the `docker-compose.yml` file, builds your custom PostgreSQL image, and starts all the services.

```bash
docker-compose up --build
```
The first time you run this, Docker will download several base images and build your custom `postgres` image. This may take a few minutes. **Leave this terminal window running**, as it displays the live logs for all services.

#### **Setup Step 4: Load Data into the Database**

The `postgres_db` container has started and automatically enabled the necessary extensions (see section below). Now, you must populate it with the map data.

1.  **Open a NEW terminal window** (do not close the one from Step 3).
2.  **Copy the data file** into the running database container:
    ```bash
    docker cp data/southern-zone-latest.osm.pbf postgres_database:/tmp/data.osm.pbf
    ```
3.  **Run the `osm2pgsql` import process** inside the container. This will take several minutes.
    ```bash
    docker exec -it postgres_database osm2pgsql -d wayline -U admin -W --create --slim -C 2048 --hstore --multi-geometry /tmp/data.osm.pbf
    ```
    When prompted for a password, enter `admin`.

#### **Setup Step 5: Verify the Application**

Once the `osm2pgsql` command is finished, your full application is running.
*   **Your Web Application:** [http://localhost:5000](http://localhost:5000)
*   **Your Database UI (pgAdmin):** [http://localhost:8080](http://localhost:8080) (Login with `admin@example.com` / `admin`)

---

