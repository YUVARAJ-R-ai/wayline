# Wayline — Team Git & Project Board Workflow
*Last updated: 2026-06-09*

---

## 1. Repository Setup

The entire project lives in **one repository**. One clone, one branch, everything together.

```bash
git clone git@github.com:YUVARAJ-R-ai/wayline.git
cd wayline
git checkout dev        # <-- always work on this branch
```

| Folder | What's inside |
|--------|---------------|
| `api-gateway/` | Express backend API |
| `frontend/` | Next.js web app (login, dashboard, map) |
| `postgres/` | Database init scripts |
| `docs/` | All documentation |

> **Never push directly to `main`.**
> It is the production-ready branch — only the project lead merges into it via a Pull Request.

> **Note:** The old `wayline-nextjs` repo on GitHub is no longer used. All frontend work happens in `frontend/` inside this repo.

---

## 2. One-Time Local Setup (Do This Once)

```bash
# Tell git how to handle divergent branches — merge strategy, not rebase
git config pull.rebase false

# Optional: set globally so it applies to all your repos
git config --global pull.rebase false
```

This prevents the `fatal: Need to specify how to reconcile divergent branches` error permanently.

---

## 3. Daily Workflow (Every Single Time You Sit Down to Work)

### Step 1 — Pick up an issue from the board
Go to [github.com/users/YUVARAJ-R-ai/projects/2](https://github.com/users/YUVARAJ-R-ai/projects/2).
Pick an issue from the **Todo** column. Move it to **In Progress**.

### Step 2 — Pull before you write a single line of code

```bash
git checkout dev              # make sure you're on the right branch
git pull origin dev           # get everyone else's latest work
```

**This is the most important habit.** The divergence error we hit happened because
someone pushed while we were working and then tried to push without pulling first.
Always pull at the start of your session.

### Step 3 — Create a feature branch for your task

```bash
git checkout -b feature/issue-4-auth-register
#             └─ short description of what you're building
```

Name it: `feature/issue-{number}-{short-description}` — e.g.
- `feature/issue-4-auth-register`
- `feature/issue-9-api-keys-dashboard`
- `fix/issue-2-init-sql-syntax`

Working on a branch means your work never interferes with teammates until you're ready.

### Step 4 — Work and commit in small chunks

```bash
git add api-gateway/app.js        # add specific files, not git add .
git commit -m "issue #4: add POST /auth/register endpoint"
```

Commit message format: `issue #{n}: short description of what changed`
This links your commit to the GitHub issue automatically.

**Commit often — every time something works.** Small commits are easy to undo.

### Step 5 — Push your feature branch

```bash
git push origin feature/issue-4-auth-register
```

First time pushing a new branch, Git will ask you to set the upstream — just run what it suggests,
or use `git push -u origin feature/issue-4-auth-register`.

### Step 6 — Open a Pull Request into `dev`

```bash
gh pr create --base dev --title "issue #4: add register endpoint" --body "Closes #4"
```

Or open it on GitHub. Request a review from a teammate before merging.

### Step 7 — After your PR is merged, clean up

```bash
git checkout dev
git pull origin dev             # get your merged work + anything else
git branch -d feature/issue-4-auth-register   # delete the local feature branch
```

---

## 4. Project Board Workflow

The board has these columns. Move your issue card as you work:

```
Todo  →  In Progress  →  In Review  →  Done
```

| Column | When to move there |
|--------|--------------------|
| **Todo** | Issue is assigned, not started |
| **In Progress** | You created your feature branch and started coding |
| **In Review** | You opened a PR — waiting for teammate to review |
| **Done** | PR is merged |

> **One issue per person at a time.** Finish and merge before picking up the next one.
> This keeps the board accurate and avoids long-lived branches that drift.

---

## 5. The Rule That Prevents All Divergence Errors

```
Pull → Branch → Work → Commit → Push → PR
```

The error `! [rejected] dev -> dev (fetch first)` means:
**"You didn't pull before pushing."**

Two rules eliminate it completely:
1. **Always `git pull origin dev` before starting work** (Step 2 above)
2. **Work on feature branches, not directly on `dev`** (Step 3 above)

When you work on a feature branch, you push to *your own branch* — nothing else is pushing to it.
No divergence is possible.

---

## 6. Merging Into `main` (Project Lead Only)

When `dev` has been tested and is ready for a stable release:

```bash
# On GitHub — open a PR from dev → main
gh pr create \
  --base main \
  --head dev \
  --title "Release: [feature description]" \
  --body "Summary of what's included"
```

Merge the PR on GitHub. Do not merge locally.

---

## 7. Branch Protection

`main` is already protected on GitHub — direct pushes are blocked and a PR is required to merge.
See the owner PR guide: `docs/owner-pr-guide.md`.

---

## 8. What To Do When Things Go Wrong

### "Rejected — fetch first" on push
```bash
git pull origin dev     # or your branch name
git push origin dev
```

### "Divergent branches" on pull
```bash
git pull --no-rebase origin dev   # explicit merge strategy
```

### "I committed to `dev` directly instead of a feature branch"
As long as you haven't pushed yet:
```bash
git checkout -b feature/issue-X-description   # move to a new branch
# your commits are now on the feature branch — push from here
git push origin feature/issue-X-description
```

### "I accidentally pushed to `main`"
Tell the project lead immediately. Do not try to fix it with force-push.
The lead can revert using a PR.

### "My feature branch is very out of date with `dev`"
```bash
git checkout dev
git pull origin dev
git checkout feature/your-branch
git merge dev             # bring dev into your feature branch
# resolve any conflicts, then push
git push origin feature/your-branch
```

---

## 9. Quick Reference Cheat Sheet

```bash
# Start of every session
git checkout dev && git pull origin dev

# Start a new task
git checkout -b feature/issue-{n}-description

# Save progress
git add path/to/file.js
git commit -m "issue #{n}: what you did"

# Push your branch
git push origin feature/issue-{n}-description

# Create PR (merge into dev)
gh pr create --base dev --title "issue #{n}: description" --body "Closes #{n}"

# After PR is merged — clean up
git checkout dev && git pull origin dev
git branch -d feature/issue-{n}-description
```
