# Owner Guide — Raising a PR from `dev` and Merging to `main`
*For: Yuvaraj (@YUVARAJ-R-ai) — Project Lead*

---

## When Should You Merge dev → main?

Only merge when **all tasks in a sprint are Done** on the project board and the app has been tested locally. `main` is the stable, production-ready branch — don't merge half-finished work.

---

## Step-by-Step: Raising and Merging the PR

### Step 1 — Make sure dev is clean and up to date

```bash
git checkout dev
git pull origin dev
git status
```

`git status` must show **nothing to commit, working tree clean** before you raise a PR.
If there are uncommitted changes, commit or stash them first.

---

### Step 2 — Check what will be merged

```bash
# See all commits on dev that are not yet on main
git log main..dev --oneline
```

Read through the list. You should recognise every commit — if something looks unfamiliar, check it with:

```bash
git show <commit-hash>
```

Also check if any conflicts are likely:

```bash
git merge-tree --write-tree dev main 2>&1 | grep CONFLICT || echo "No conflicts"
```

---

### Step 3 — Create the Pull Request

```bash
gh pr create \
  --base main \
  --head dev \
  --title "Release: brief description of what's included" \
  --body "$(cat <<'EOF'
## What's in this release
- [ ] List the main features / fixes included

## How to test
- [ ] Step 1
- [ ] Step 2

## Checklist
- [ ] Tested locally with docker-compose up
- [ ] All sprint tasks are Done on the project board
- [ ] No leftover debug code or console.logs
EOF
)"
```

Or open it on GitHub at:
[github.com/YUVARAJ-R-ai/wayline/compare/main...dev](https://github.com/YUVARAJ-R-ai/wayline/compare/main...dev)

---

### Step 4 — If GitHub shows conflicts

Run these commands locally to resolve them:

```bash
git fetch origin main
git merge origin/main        # merge main into dev locally
```

Git will pause on conflicting files. For each conflict:

1. Open the file — look for these markers:
   ```
   <<<<<<< dev
   your version
   =======
   main's version
   >>>>>>> main
   ```
2. Edit the file to keep the correct version. Remove all the `<<<<<<<`, `=======`, `>>>>>>>` lines.
3. Save the file, then:
   ```bash
   git add the-file-you-fixed.js
   ```

Once all conflicts are resolved:
```bash
git commit --no-edit          # complete the merge commit
git push origin dev           # push to update the PR
```

Refresh the PR on GitHub — the conflict warning will be gone.

---

### Step 5 — Review the PR

Before merging, look at the **Files changed** tab on GitHub.

Things to check:
- No `.env` files or secrets accidentally committed
- No large binary files (images, data files)
- The `docs/` and `README.md` are up to date
- No obvious broken code

If a teammate made the commits, leave a comment if anything needs fixing. Ask them to push a fix to the `dev` branch — the PR updates automatically.

---

### Step 6 — Merge the PR

Once satisfied:

1. Click **"Merge pull request"** on GitHub
2. Select **"Create a merge commit"** (keep the default)
3. Click **"Confirm merge"**

If GitHub blocks it with "Review required", click **"Bypass rules and merge"** — as the repo owner you can always merge your own PRs.

---

### Step 7 — After merging

```bash
# Pull the merged main locally
git checkout main
git pull origin main

# Sync dev with main so they're at the same point
git checkout dev
git merge main
git push origin dev
```

This keeps `dev` up to date with `main` so the next sprint starts from a clean base.

Move all **Done** sprint cards to a new "Released" column (or close the sprint) on the project board.

---

## Branch Overview (for quick reference)

```
main  ──────────────────────────────────────────► stable releases only
         ▲              ▲              ▲
         │ PR merge     │ PR merge     │ PR merge
dev   ───┴──────────────┴──────────────┴──────────► active development
              ▲   ▲          ▲   ▲
              │   │          │   │  feature branches
            feat feat      feat feat
```

| Branch | Who pushes | How it gets new code |
|--------|-----------|----------------------|
| `main` | Nobody directly | Only via PR from `dev` (you approve + merge) |
| `dev` | Nobody directly | Only via PR from feature branches (you review + merge) |
| `feature/*` | The assigned developer | Direct push from their machine |

---

## Common Situations

### "I want to merge dev into main but a teammate's work isn't done yet"
Don't wait — merge what's done. Tell the teammate to continue on their feature branch. The next sprint merge will pick it up.

### "I need to fix something urgent on main (hotfix)"
```bash
git checkout main
git pull origin main
git checkout -b hotfix/description
# make the fix
git push origin hotfix/description
# raise a PR: hotfix/description → main
# after merging, also merge main back into dev:
git checkout dev
git merge main
git push origin dev
```

### "I want to see what dev looks like before merging"
```bash
git checkout dev
docker-compose up --build
# test the app, then come back to main
git checkout main
```
