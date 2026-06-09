# GitLens Guide — Reading the Graph and Tracking Everything
*Based on the GitLens panel visible in VS Code*

---

## What You're Looking At

The GitLens commit graph shows the **entire history of the repo as a visual timeline**. Every row is one commit. Time flows downward — newest at the top, oldest at the bottom.

Here's how to read the screenshot you're seeing:

```
BRANCH / TAG    GRAPH         COMMIT MESSAGE
─────────────────────────────────────────────
refs/h... [+1]  ●             add Modified readme.md...     (836...)
                │
                ●  ╮          Merge branch 'updates'...     (b99...)
                │  │
                ●  │          Add API gateway backend...    (805...)
                │  │
refs/h...       ●  │          Search box and ui update      (b09...)  ← origin/updates
                │  │
                ●  │          Revert "srinath"               (fd5...)
                │  │
                ●  │          srinath                        (fa8...)
                │ ╯
refs/head... [+2] ●           yuvaraj:frontend-from-to      (aef...) ← main
```

---

## Reading the Graph Column

### The dots (●)
Each dot = one commit. Click any dot to see exactly what changed in that commit.

### The lines connecting dots
Lines show the **parent-child relationship** between commits — which commit came before which.

### Branching lines
When the graph splits into two lines going in different directions, that's where **two branches diverged** — each went their own way.

When two lines **merge back into one dot**, that's a **merge commit** — two branches were joined together.

### The colours
Each branch gets its own colour line so you can visually trace which commits belong to which branch.

---

## Reading the Branch / Tag Column

| What you see | What it means |
|---|---|
| `refs/heads/dev` | Your **local** `dev` branch — this is where you are |
| `refs/remotes/origin/dev` | The `dev` branch **on GitHub** |
| `refs/heads/main` | Your local `main` |
| `refs/remotes/origin/main` | `main` on GitHub |
| `[+1]` or `[+2]` next to a branch | That branch has 1 (or 2) commits **not yet pushed** to GitHub |

When `refs/heads/dev` and `refs/remotes/origin/dev` point to the **same dot**, your local and GitHub are in sync. When they point to **different dots**, one is ahead of the other.

---

## The Working Tree Row

The very first row says **"Working Tree"** — this is not a commit. It represents your **unsaved changes right now** (files you've edited but not yet committed). The icons next to it show:

| Icon | Meaning |
|------|---------|
| Pencil ✏️ | Modified files |
| + | New untracked files |
| Checkmark ✓ | Staged files (ready to commit) |

---

## What the Right Panel Shows

When you click a commit dot, the right panel shows:

- **Commit hash** (e.g. `b096d3b`) — the unique ID of that commit
- **Branch labels** — which branches contain this commit
- **Commit message** — what the developer said they changed
- **FILES CHANGED** — the list of files that were modified, with `+107 -25` showing lines added/removed in green/red

Click any file in FILES CHANGED to see the exact line-by-line diff.

---

## Day-to-Day: What to Check and When

### Before you start working
Look at the graph and find your branch (`dev`). Make sure `refs/heads/dev` and `refs/remotes/origin/dev` are pointing to the **same commit**. If they're not, you need to pull.

### After teammates push
Click the **Fetch** button at the top of GitLens (you can see it in the screenshot — "Fetch (10m ago)"). This downloads the latest state from GitHub without changing your files. The graph will update to show new commits from teammates.

### When you see [+1] or [+2] next to your branch
You have local commits not yet pushed to GitHub. Push them:
```bash
git push origin dev
```

### When origin/dev is ahead of your local dev
A teammate pushed something you don't have. Pull it:
```bash
git pull origin dev
```

### To see what a teammate just pushed
Click their commit dot in the graph. The right panel shows every file they changed and exactly what changed in each one.

---

## Useful GitLens Features

### Search commits (top bar)
The search bar at the top says *"Search commits using natural language"*. You can type things like:
- `my commits from last week`
- `commits by Indhra`
- `commits touching app.js`

### Comparing branches
Right-click any branch label in the graph → **"Compare with working tree"** or **"Compare with branch"** to see the exact diff between two points.

### Blame (who wrote this line?)
Open any file in VS Code. Hover over a line — GitLens shows a ghost annotation: who wrote it, when, and the commit message. Click it to jump to that commit in the graph.

### File history
Right-click any file in the VS Code explorer → **"Open File History"** — shows every commit that ever touched that file, oldest to newest.

---

## Reading the Specific Graph in Your Screenshot

```
● add Modified readme.md and team-workflow.md     ← your latest local commit (dev)
│
●  Merge branch 'updates' of github.com...        ← merge commit (when you pulled + resolved conflicts)
│
●  Add API gateway backend, fix DB connection...  ← where the real backend code was committed
│
●  Search box and ui update :yuvaraj              ← pushed from another machine (old UI work)
│
●  Revert "srinath"
│
●  srinath                                         ← a teammate's commit that was reverted
│
●  yuvaraj:frontend-from-to                        ← last commit on main before PR
```

The `[+2]` next to `refs/heads/main` at the bottom means your **local main** has 2 branches pointing there — the branch label is compressed. It's not commits waiting to be pushed; it's just multiple branch pointers at the same commit.

---

## Quick Reference: Graph Shapes

| Shape | Meaning |
|-------|---------|
| Single straight line | Linear history, one branch |
| Line splits into two | Branch was created here |
| Two lines merge into one dot | Merge commit — branches joined |
| Dot with no parent line going up | First commit (root) |
| `[+n]` on a branch | n local commits not pushed yet |
| Two branch labels on same dot | Both branches are at the same point (in sync) |
