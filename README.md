
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

# Team Git Workflow Guide 🚀

## 📋 Overview
This guide helps team members stay synchronized with the main branch and avoid common Git conflicts during collaboration.

## 🔄 Daily Workflow

### Step 1: Pull Latest Changes
Before starting any work, always pull the latest changes from the remote repository:

```bash
git pull origin main
```

This command pulls the latest changes from the remote `main` branch into your local copy.

### Step 2: Check Your Current Branch
Verify you're on the correct branch before pulling:

```bash
git branch
```

The current branch will be highlighted with an asterisk (*).

## 🧠 Important Notes

### Branch Requirements
- **You must be on the same branch** (`main`) for `git pull origin main` to work smoothly
- If you're on a different branch, switch to main first:
  ```bash
  git checkout main
  ```

### Handling Local Changes
If you have **uncommitted local changes** when pulling:

1. **Check your status first:**
   ```bash
   git status
   ```

2. **Options to handle local changes:**
   - **Commit your changes first:**
     ```bash
     git add .
     git commit -m "Your commit message"
     git pull origin main
     ```
   
   - **Stash your changes temporarily:**
     ```bash
     git stash
     git pull origin main
     git stash pop  # Reapply your stashed changes
     ```

### Merge Conflicts
If Git shows a **merge conflict**, you'll need to:
1. Open the conflicted files
2. Resolve the conflicts manually
3. Stage the resolved files: `git add <filename>`
4. Complete the merge: `git commit`

## 🧰 Advanced Options

### Auto-update for Branch Switchers
If you frequently switch between branches and want to ensure you have the latest updates:

```bash
git fetch --all
git pull
```

### Quick Status Check
Always check your repository status before major operations:

```bash
git status
```

## 📞 When to Reach Out

Contact the team lead if:
- Your teammate is using a **different branch** than `main`
- You're using a **PR-based workflow** (feature branches)
- You encounter persistent merge conflicts
- You're unsure about any step in this process

## 🔧 Troubleshooting

### Common Issues

**"Your branch is behind 'origin/main'"**
- Solution: Run `git pull origin main`

**"You have unmerged paths"**
- Solution: Resolve merge conflicts, then `git add` and `git commit`

**"Please commit your changes or stash them before you merge"**
- Solution: Either commit your changes or use `git stash` as shown above

## 📚 Quick Reference

| Command | Purpose |
|---------|---------|
| `git status` | Check current state of your repository |
| `git branch` | See all branches and current branch |
| `git pull origin main` | Pull latest changes from main branch |
| `git stash` | Temporarily save uncommitted changes |
| `git stash pop` | Restore stashed changes |
| `git fetch --all` | Download all remote branch updates |

---

💡 **Remember:** When in doubt, check `git status` first and don't hesitate to ask for help!