# Claude Code Skills — Wayline Team Guide
*How to use `/plan-project` and `/start-task` in this repo*

---

## Prerequisites

Before using any skill, make sure you have completed the setup in [setup-gh-and-claude.md](setup-gh-and-claude.md):
- `gh` CLI installed and authenticated (`gh auth status` shows you're logged in)
- `project` and `read:org` scopes added (`gh auth refresh -s project`)
- `ANTHROPIC_API_KEY` set in your shell profile
- Claude Code installed (`npm install -g @anthropic-ai/claude-code`)

---

## How Skills Work

Skills are slash commands you type inside a Claude Code session. Claude reads the skill instructions and runs the steps automatically — you just answer its questions.

**To start a Claude Code session in this project:**
```bash
cd wayline
claude
```

Once you're inside, type a skill command to trigger it.

---

## Skill 1 — `/plan-project`

**Who uses this:** Project lead (Yuvaraj) at sprint planning time.

**What it does:**
1. Checks if a GitHub Project board exists for this repo
2. If not found — pauses and walks you through creating one in the browser with a sprint template (the GitHub API cannot create board columns, so this step must be done manually once)
3. Asks you for requirements, features, and team info
4. Turns your raw notes into proper user stories with acceptance criteria
5. Creates GitHub issues for each story
6. Adds all issues to the project board with Status, Priority, and Size
7. Groups issues into sprints (creates GitHub milestones with due dates)
8. Assigns issues to teammates

### Basic usage

```
/plan-project
```

Claude will ask you three sets of questions:
1. What the project does, who the users are, and your deadline
2. A list of features/tasks (can be rough bullet points)
3. Your teammates' GitHub usernames and their focus areas

Then it will show you the refined user stories for review before creating anything.

### Sub-commands

| Command | When to use |
|---------|-------------|
| `/plan-project` | Starting a new project or a new sprint from scratch |
| `/plan-project sprint` | You already have issues in the backlog — just plan the next sprint |
| `/plan-project assign` | Reassign existing issues between teammates |
| `/plan-project setup` | Create the project board only (no issues yet) |

### Example session

```
You: /plan-project sprint

Claude: Found existing project "wayline" (#2). You have 8 open Backlog issues.
        Which issues should go into Sprint 2?
        ...
        Setting up milestones and assignments now...
        ✓ Sprint 2 planned (6 issues, due: 2026-06-24)
```

---

## Skill 2 — `/start-task`

**Who uses this:** Every teammate, every time you start work on a new issue.

**What it does:**
1. Lists all GitHub issues assigned to you in Backlog
2. You pick one
3. Claude reads the issue and the relevant code, then writes a detailed user story
4. Moves the issue to **Ready** on the board
5. Pulls the latest `dev` branch
6. Creates your feature branch (`feature/issue-N-description`)
7. Moves the issue to **In Progress**
8. Helps you implement the feature step by step
9. Commits your work with proper message format
10. Pushes the branch and creates a PR to `dev`
11. Moves the issue to **In Review**

### Basic usage

```
/start-task
```

Claude shows your assigned issues. Enter the number of the one you're starting.

### Jump to a specific issue

```
/start-task 7
```

Skips the listing step and goes straight to issue #7.

### Already on a branch and just need the PR

```
/start-task --pr-only
```

Claude reads your current branch name, finds the issue number from it, and creates the PR.

### Example session

```
You: /start-task

Claude: Your assigned issues:
          #3  Add POST /auth/register endpoint  [backend]  Sprint 1
          #7  Build API keys dashboard page     [frontend] Sprint 1

        Which issue? (enter number)

You: 3

Claude: Issue #3 — Add POST /auth/register endpoint
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        User Story
        As a developer using the Wayline API
        I want to register a new account via POST /auth/register
        So that I can get credentials to access the map endpoints

        What to Build
        Add a POST /auth/register route in api-gateway/app.js.
        Validate the request body (email, password). Hash the password
        with bcryptjs. Insert the user into the postgres users table.
        Return a JWT token on success.

        Acceptance Criteria
        - [ ] POST /auth/register accepts { email, password }
        - [ ] Password is hashed before storage (bcryptjs)
        - [ ] Returns 201 + JWT on success
        - [ ] Returns 400 if email already exists

        Does this look correct? (yes/no)

You: yes

Claude: ✓ Issue #3 moved to Ready.
        ✓ Pulled latest dev.
        ✓ Created branch: feature/issue-3-auth-register
        ✓ Issue #3 moved to In Progress.

        Working on: #3 — Add POST /auth/register endpoint
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          - [ ] POST /auth/register accepts { email, password }
          - [ ] Password is hashed before storage
          - [ ] Returns 201 + JWT on success
          - [ ] Returns 400 if email already exists
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        Let's start implementing. First, I'll read app.js...
```

---

## The Full Workflow — How Both Skills Fit Together

```
Project Lead                           Teammates
────────────────                       ────────────────────────────────────

Sprint start:
  /plan-project sprint
    → creates/updates issues
    → assigns to teammates
    → sets sprint milestones

                                       For each issue assigned to you:
                                         /start-task
                                           → pick your issue
                                           → review user story
                                           → implement on feature branch
                                           → PR raised automatically

Review PRs on GitHub
Merge to dev → issue Done

End of sprint:
  /plan-project sprint      ← repeat
```

---

## Commit Message Format

When Claude commits for you (or when you commit manually), always use:

```
issue #N: short description of what changed
```

Examples:
- `issue #3: add POST /auth/register with bcrypt hashing`
- `issue #3: return 400 when email already exists`

The `#N` automatically links the commit to the GitHub issue.

---

## Board Column Flow

```
Backlog  →  Ready  →  In Progress  →  In Review  →  Done
```

| Column | Set by | When |
|--------|--------|------|
| Backlog | `/plan-project` | Issue created and queued for a sprint |
| Ready | `/start-task` | You've confirmed the user story and are about to branch |
| In Progress | `/start-task` | You're actively coding |
| In Review | `/start-task` | PR is raised, waiting for review |
| Done | Project lead | PR merged to dev |

---

## Troubleshooting

### "No issues assigned to me"
You don't have any open issues assigned to your GitHub account.
Ask Yuvaraj to assign you one, or he can run `/plan-project assign`.

### "Project board not found"
The GitHub Project doesn't exist yet.
Run `/plan-project setup` to create it first.

### "gh: authentication error" inside Claude
Claude uses the `gh` CLI under the hood. Run `gh auth status` in a separate terminal.
If you're not logged in, run `gh auth login`.

### Skill doesn't trigger
Make sure you're running `claude` from inside the `wayline` folder (where `CLAUDE.md` lives).
Skills are registered in `CLAUDE.md` at the project root.

### "Permission denied" when Claude tries to run gh commands
Your `~/.claude/settings.json` may not allow `gh` commands.
Follow the permissions setup in [setup-gh-and-claude.md](setup-gh-and-claude.md).
