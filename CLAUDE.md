# Wayline — Claude Code Project Instructions

## Repository Overview
Wayline is a self-hosted geospatial maps API platform built with microservices.

**Single repo:** everything lives here.
- `api-gateway/` — Node.js Express API (routing, geocoding, road data)
- `frontend/` — Next.js web app (login, dashboard, map)
- `postgres/` — PostGIS database init
- `docker-compose.yaml` — orchestrates all 5 services

> The old `wayline-nextjs` repo is deprecated — frontend is now tracked here under `frontend/`.

**Active branch:** `dev` — never push directly to `main`.

## Branch Rules
- `main` — protected, production-only, merged via PR by project lead only
- `dev` — active development, all teammates merge feature branches here
- `feature/issue-N-description` — one branch per GitHub issue

Always work on `dev` or a feature branch off `dev`. Never commit directly to `main`.

## Key Services and Ports
| Service | Port | Notes |
|---------|------|-------|
| api-gateway | 3000 | Node.js, entry at `api-gateway/app.js` |
| frontend | 8080 | Next.js (in `wayline-nextjs` repo) |
| postgres | 5432 | PostGIS + hstore, init via `postgres/init.sql` |
| pgAdmin | 8888 | DB admin UI |
| OSRM | 5001 | Routing engine, needs pre-processed map data in `data/` |

## Important Rules for git add
**Never run `git add .`** — the `data/` folder contains ~10GB of OSRM map files.
Always add specific files: `git add api-gateway/app.js`

## Project Board
GitHub Project: https://github.com/users/YUVARAJ-R-ai/projects/2
Columns: Backlog → Ready → In Progress → In Review → Done

## Team
| Member | GitHub | Areas |
|--------|--------|-------|
| Yuvaraj (lead) | @YUVARAJ-R-ai | All — merges to main |
| Indhra | @Indhracha-05 | Backend + Frontend |

---

# Skills Available in This Project

## /plan-project
**Who uses it:** Project lead (Yuvaraj) at sprint planning time.

Set up the GitHub Project board, gather requirements, generate user stories, create issues, plan sprints with milestones, assign tasks to teammates.

```
/plan-project          # full planning flow
/plan-project sprint   # plan next sprint from existing backlog
/plan-project assign   # reassign issues between teammates
```

When the user types `/plan-project`, invoke the Skill tool with `skill: "plan-project"` before doing anything else.

## /start-task
**Who uses it:** Every teammate, every time they start work on a new issue.

Fetch your assigned issue from Backlog, get a detailed user story, create your feature branch, implement the feature, raise a PR to `dev`, move the issue to In Review.

```
/start-task            # list your assigned issues, pick one, run full flow
/start-task 7          # jump straight to issue #7
/start-task --pr-only  # just raise the PR for the branch you're already on
```

When the user types `/start-task`, invoke the Skill tool with `skill: "start-task"` before doing anything else.
