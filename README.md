
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

# 🚀 Project Workflow Guidelines

Welcome to the project! This document explains how we collaborate using Git branches to keep our main branch stable and clean.

---

## 🔁 Branching Strategy

| Branch | Status | Purpose | Access |
|--------|--------|---------|--------|
| `main` | ✅ **Protected branch** | Contains only reviewed and production-ready code | Only maintainer (via PR) |
| `updates` | ✏️ **Working branch** | Used by all team members to add new features, updates, or bug fixes | All collaborators |

### Key Points:
- **DO NOT push directly** to the `main` branch
- All collaborative work happens on the `updates` branch
- Only reviewed code gets merged into `main` via Pull Requests

---

## 🛠️ How to Contribute

### 1. Clone the Repository (First Time Setup)

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 2. Switch to the `updates` Branch

```bash
git checkout updates
```

If `updates` branch is not available locally yet:

```bash
git fetch
git checkout updates
```

### 3. Stay Updated with Latest Changes

**Before starting any work**, always pull the latest changes:

```bash
git pull origin updates
```

#### 🧠 Important Notes:
- **You must be on the `updates` branch** for this to work smoothly
- Check your current branch with: `git branch`
- If you have **local uncommitted changes**, Git might show a merge conflict

#### Handling Local Changes Before Pulling:

**Option A: Commit your changes first**
```bash
git add .
git commit -m "Your work in progress"
git pull origin updates
```

**Option B: Stash your changes temporarily**
```bash
git stash
git pull origin updates
git stash pop  # Reapply your stashed changes
```

### 4. Make Your Changes

- Add or edit files as needed
- Use `git add` and `git commit` to stage and save your changes

```bash
git add .
git commit -m "Your message describing the update"
```

### 5. Push to the `updates` Branch

```bash
git push origin updates
```

---

## 🔄 Merging to `main`

Only the **project maintainer** can merge `updates` into `main` via a **Pull Request (PR)** after review.

This ensures:
- Code is stable and tested
- Everyone agrees on what goes into `main`
- Bugs are minimized in production
- Proper code review process is followed

---

## 🧰 Advanced Workflow Tips

### For Frequent Branch Switchers

If you switch between branches often, ensure you have the latest updates:

```bash
git fetch --all
git pull
```

### Quick Status Check

Always check your repository status before major operations:

```bash
git status
```

### Check Current Branch

Verify which branch you're currently on:

```bash
git branch
```

The current branch will be highlighted with an asterisk (*).

---

## 🔧 Troubleshooting Common Issues

### "Your branch is behind 'origin/updates'"
**Solution:** Run `git pull origin updates`

### "You have unmerged paths"
**Solution:** 
1. Resolve merge conflicts in the affected files
2. Stage resolved files: `git add <filename>`
3. Complete the merge: `git commit`

### "Please commit your changes or stash them before you merge"
**Solution:** Either commit your changes or use `git stash` as shown above

### Merge Conflicts
If Git shows a **merge conflict**:
1. Open the conflicted files
2. Look for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
3. Resolve conflicts manually by choosing the correct code
4. Remove conflict markers
5. Stage resolved files: `git add <filename>`
6. Complete the merge: `git commit`

---

## 📋 Daily Workflow Checklist

- [ ] Switch to `updates` branch: `git checkout updates`
- [ ] Pull latest changes: `git pull origin updates`
- [ ] Make your changes
- [ ] Stage changes: `git add .`
- [ ] Commit with descriptive message: `git commit -m "Description"`
- [ ] Push to updates: `git push origin updates`

---

## 📞 When to Reach Out

Contact the team lead or create an issue if:
- You encounter persistent merge conflicts
- You want to add a major new feature
- You're unsure about any step in this process
- You need help with Git commands
- You accidentally pushed to the wrong branch

---

## 📚 Quick Reference Commands

| Command | Purpose |
|---------|---------|
| `git status` | Check current state of your repository |
| `git branch` | See all branches and current branch |
| `git checkout updates` | Switch to updates branch |
| `git pull origin updates` | Pull latest changes from updates branch |
| `git add .` | Stage all changes |
| `git commit -m "message"` | Commit staged changes |
| `git push origin updates` | Push changes to remote updates branch |
| `git stash` | Temporarily save uncommitted changes |
| `git stash pop` | Restore stashed changes |
| `git fetch --all` | Download all remote branch updates |

---

## ✅ Summary

- **`main` branch**: Final, stable codebase - Only maintainer access via PR
- **`updates` branch**: Active development - All team members collaborate here
- **Always pull before starting work** to avoid conflicts
- **Create issues or ask questions** before major changes

**Remember:** When in doubt, check `git status` first and don't hesitate to ask for help!

Happy coding! 💻🔥

---

*Need to customize this README? Replace `<your-username>` and `<your-repo>` with your actual GitHub repository details.*