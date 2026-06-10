# Wayline — Geospatial API Platform

Wayline is a self-hosted maps and routing platform — think of it as our own private version of Google Maps. It lets users search for locations, calculate driving routes, and access map data through an API.

> **New to the team?** Read this whole file top to bottom before you do anything else. It will save you hours of confusion.

---

## Table of Contents

1. [How the Project is Structured](#1-how-the-project-is-structured)
2. [How the App Works](#2-how-the-app-works)
3. [Prerequisites — Install These First](#3-prerequisites--install-these-first)
4. [First-Time Setup](#4-first-time-setup)
5. [Running the App](#5-running-the-app)
6. [Daily Git Workflow](#6-daily-git-workflow)
7. [Using the Project Board](#7-using-the-project-board)
8. [Branch Rules](#8-branch-rules)
9. [Common Errors and Fixes](#9-common-errors-and-fixes)
10. [Quick Reference Cheat Sheet](#10-quick-reference-cheat-sheet)

---

## 1. How the Project is Structured

Everything lives in **one repository** — [`wayline`](https://github.com/YUVARAJ-R-ai/wayline). You only need to clone once.

| Folder | What's inside |
|--------|--------------|
| `api-gateway/` | Express backend — handles all API requests |
| `frontend/` | Next.js web app — the UI users see |
| `postgres/` | Database init scripts (PostGIS + hstore) |
| `data/` | OSRM routing data (~7 GB, **not in git** — set up manually) |
| `docs/` | All project documentation |

> **Note:** There is an older repo called `wayline-nextjs` on GitHub. It is no longer used — the frontend has been merged here. Ignore it.

---

## 2. How the App Works

The app is made up of **5 services** that all run together using Docker. You don't run them separately — Docker handles everything.

```
Browser / Frontend (port 8080)
        │
        ▼
  API Gateway (port 3000)    ← your Express backend — the brain
     /        \
    ▼           ▼
PostgreSQL    OSRM Router     ← database and routing engine
(port 5432)   (port 5001)

pgAdmin (port 8888)           ← visual tool to inspect the database
```

| Service | What it does | URL when running |
|---------|-------------|-----------------|
| `wayline_frontend` | The web app users see | http://localhost:8080 |
| `wayline_api_gateway` | Handles all API requests | http://localhost:3000 |
| `postgres_database` | Stores user data and map data | (internal) |
| `osrm_router` | Calculates driving routes | http://localhost:5001 |
| `postgres_ui` | Visual database browser (pgAdmin) | http://localhost:8888 |

---

## 3. Prerequisites — Install These First

Install all of these before cloning the repo. If you already have them, skip ahead.

### Git
Version control — how we track and share code changes.
- Download: https://git-scm.com/downloads
- Verify: `git --version` (should print a version number)

### Docker Desktop
Runs all the services in isolated containers. **You need this running before starting the app.**
- Download: https://www.docker.com/products/docker-desktop
- After installing, open Docker Desktop and wait for it to show "Engine running"
- Verify: `docker --version`

### Node.js (v18 or higher)
Required for the API gateway and frontend.
- Download: https://nodejs.org (choose the LTS version)
- Verify: `node --version` and `npm --version`

### Setting up SSH for GitHub
This lets you push and pull code without typing your password every time.

1. Generate an SSH key (skip if you already have one):
   ```bash
   ssh-keygen -t ed25519 -C "your@email.com"
   # Press Enter 3 times to accept defaults
   ```
2. Copy your public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copy the entire output
   ```
3. Add it to GitHub: https://github.com/settings/ssh/new
4. Test it: `ssh -T git@github.com`
   - You should see: `Hi your-username! You've successfully authenticated`

---

## 4. First-Time Setup

Do these steps **once** when you first join the project. After that, just use the daily workflow.

### Step 1 — Clone the repository

Open a terminal and run:

```bash
git clone git@github.com:YUVARAJ-R-ai/wayline.git
cd wayline
```

That's it. The frontend is inside `frontend/` — no second clone needed.

### Step 2 — Switch to the working branch

**Important:** Never work on `main`. Switch to `dev` immediately after cloning.

```bash
cd wayline
git checkout dev
```

### Step 3 — Tell Git how to handle updates (one-time config)

This prevents a common error you will hit otherwise:

```bash
git config pull.rebase false
```

### Step 4 — Create the environment file

The app needs a `.env` file with credentials. Ask the project lead (Yuvaraj) for the values, then create the file:

```bash
# Inside the wayline folder
cp .env.example .env
# Then open .env and fill in the values Yuvaraj gives you
```

The file needs these values:
```
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
PGADMIN_DEFAULT_EMAIL=
PGADMIN_DEFAULT_PASSWORD=
OPENCAGE_API_KEY=
```

### Step 5 — Get the map data

The routing engine needs a large data file (~7 GB) that is **not stored in Git** (it's too big).

Ask Yuvaraj to share the `osrm-data.tar.gz` file from the team drive. Once you have it:

```bash
# Place the file in the wayline folder, then extract it
cd wayline
tar -xzvf data/osrm-data.tar.gz -C data/
```

This creates the `data/osrm-data/` folder the routing engine needs.

### Step 6 — Install backend dependencies

```bash
cd wayline/api-gateway
npm install
cd ..
```

---

## 5. Running the App

Once setup is complete, starting the app is one command:

```bash
# Inside the wayline folder, with Docker Desktop open
docker-compose up --build
```

The **first time** this runs it will take 5–10 minutes — Docker is downloading and building images. After that it starts in about 30 seconds.

**Leave this terminal open** — it shows live logs from all services. Press `Ctrl+C` to stop.

### Verify everything is running

Open these URLs in your browser:

| URL | What you should see |
|-----|---------------------|
| http://localhost:8080 | The Wayline web app (map + login page) |
| http://localhost:3000 | `{"message":"not found"}` or similar JSON |
| http://localhost:8888 | pgAdmin login page |

If a URL doesn't load, check the terminal logs for errors.

### Stopping the app

```bash
# Press Ctrl+C in the terminal running docker-compose, then:
docker-compose down
```

---

## 6. Daily Git Workflow

Follow these steps **every time** you sit down to work. Skipping steps is what causes merge conflicts and rejected pushes.

### Before you start: pull the latest code

```bash
git checkout dev
git pull origin dev
```

This gets any changes your teammates pushed since you last worked. **Always do this first.**

### Pick up a task

Go to the project board: https://github.com/users/YUVARAJ-R-ai/projects/2

Find an issue assigned to you in the **Backlog** or **Ready** column. Move it to **In Progress**.

### Create a branch for your task

Never work directly on the `dev` branch. Create your own branch:

```bash
git checkout -b feature/issue-4-register-endpoint
#                    └─ use the issue number and a short description
```

Examples of good branch names:
- `feature/issue-4-register-endpoint`
- `feature/issue-9-api-keys-page`
- `fix/issue-3-db-tables`

### Make your changes

Write your code. When you reach a natural stopping point:

```bash
# Check what you've changed
git status

# Stage the specific files you changed (don't use git add .)
git add api-gateway/app.js

# Save with a commit message that mentions the issue number
git commit -m "issue #4: add POST /auth/register endpoint"
```

**Why not `git add .`?** The project has a 10 GB data folder. `git add .` tries to process all of it and appears frozen for minutes. Always name specific files.

### Push your branch to GitHub

```bash
git push origin feature/issue-4-register-endpoint
```

The first time you push a new branch, Git will tell you to run a slightly longer command — just copy and run what it suggests.

### Open a Pull Request

When your work is ready for review:

```bash
gh pr create --base dev --title "issue #4: add register endpoint" --body "Closes #4"
```

Or go to https://github.com/YUVARAJ-R-ai/wayline and GitHub will show a banner to open a PR.

Move your issue card to **In Review** on the project board.

### After your PR is merged

```bash
git checkout dev
git pull origin dev
git branch -d feature/issue-4-register-endpoint
```

Move your issue card to **Done** on the project board.

---

## 7. Using the Project Board

Board link: https://github.com/users/YUVARAJ-R-ai/projects/2

The board has 5 columns. Move your issue card through them as you work:

```
Backlog → Ready → In Progress → In Review → Done
```

| Column | Meaning |
|--------|---------|
| **Backlog** | Task exists but can't be started yet (waiting on something else) |
| **Ready** | Task is ready to start — pick it up |
| **In Progress** | You are actively working on it right now |
| **In Review** | Your PR is open, waiting for review |
| **Done** | PR merged, task complete |

**Rules:**
- Only move cards you are assigned to
- Work on one task at a time — finish before picking up the next
- If you're blocked, leave a comment on the issue explaining what's blocking you

---

## 8. Branch Rules

| Branch | Purpose | Can you push directly? |
|--------|---------|----------------------|
| `main` | Stable, production-ready code | ❌ No — protected, requires PR + review |
| `dev` | Active development | ❌ No — use feature branches |
| `feature/...` | Your individual work | ✅ Yes — this is your branch |

**The flow is always:**
```
feature branch → PR into dev → (lead reviews) → merged
```

`dev` gets merged into `main` by the project lead only, when a set of features is stable and tested.

---

## 9. Common Errors and Fixes

### "rejected — fetch first"
```
! [rejected] dev -> dev (fetch first)
```
**Cause:** A teammate pushed while you were working and you didn't pull first.
**Fix:**
```bash
git pull origin dev
git push origin dev
```

---

### "Need to specify how to reconcile divergent branches"
```
fatal: Need to specify how to reconcile divergent branches
```
**Cause:** You didn't run the one-time config from Step 3 of setup.
**Fix (permanent):**
```bash
git config pull.rebase false
```
**Fix (this one time):**
```bash
git pull --no-rebase origin dev
```

---

### "Please commit your changes or stash them before you merge"
**Cause:** You have unsaved changes and tried to pull or switch branches.
**Fix — Option A (commit first):**
```bash
git add api-gateway/app.js     # add your changed files
git commit -m "work in progress"
git pull origin dev
```
**Fix — Option B (save for later):**
```bash
git stash                      # temporarily tucks your changes away
git pull origin dev
git stash pop                  # brings your changes back
```

---

### "You have unmerged paths" / merge conflict
**Cause:** Two people changed the same part of the same file.
**Fix:**
1. Open the file Git is complaining about
2. Find the conflict markers — they look like this:
   ```
   <<<<<<< HEAD
   your version of the code
   =======
   your teammate's version
   >>>>>>> branch-name
   ```
3. Delete the markers and keep the correct version of the code
4. Save the file, then:
   ```bash
   git add the-file-you-fixed.js
   git commit
   ```

---

### Docker container won't start
1. Make sure Docker Desktop is open and shows "Engine running"
2. Check the terminal logs for the specific error
3. Try: `docker-compose down && docker-compose up --build`
4. If the database is corrupted: `docker-compose down -v` (this resets the database — ask the lead first)

---

## 10. Quick Reference Cheat Sheet

```bash
# === SETUP (one time only) ===
git clone git@github.com:YUVARAJ-R-ai/wayline.git
git checkout dev
git config pull.rebase false

# === START OF EVERY WORK SESSION ===
git checkout dev
git pull origin dev

# === STARTING A TASK ===
git checkout -b feature/issue-{n}-short-description

# === SAVING YOUR WORK ===
git status                              # see what changed
git add path/to/changed-file.js         # stage specific files
git commit -m "issue #{n}: description" # save with issue reference

# === SHARING YOUR WORK ===
git push origin feature/issue-{n}-short-description

# === OPENING A PULL REQUEST ===
gh pr create --base dev --title "issue #{n}: description" --body "Closes #{n}"

# === AFTER YOUR PR IS MERGED ===
git checkout dev
git pull origin dev
git branch -d feature/issue-{n}-short-description

# === RUN THE APP ===
docker-compose up --build    # start everything
docker-compose down          # stop everything
```

---

## Team

| Person | GitHub | Role |
|--------|--------|------|
| Yuvaraj | [@YUVARAJ-R-ai](https://github.com/YUVARAJ-R-ai) | Project Lead — infrastructure, reviews, merges to main |
| Indhra | [@Indhracha-05](https://github.com/Indhracha-05) | Backend — auth system, database, API endpoints |
| Sarathy | [@sarathy-cloud](https://github.com/sarathy-cloud) | Full-stack — API keys system, frontend features |

---

*For questions, open an issue on the repo or message the team lead directly.*
