---
name: plan-project
description: Set up a GitHub Project board for the current repo if one does not exist, gather requirements from the user, refine them into properly ordered user stories, create GitHub issues, plan sprints with milestones, and assign tasks to teammates. Use when starting a project from scratch or planning a new sprint.
trigger: /plan-project
---

# /plan-project

Turn ideas and requirements into a live GitHub Project board with user stories, sprint milestones, and teammate assignments — all from the terminal.

## Usage

```
/plan-project                     # detect repo, check for project, run full planning flow
/plan-project sprint              # only plan the next sprint from existing backlog
/plan-project setup               # only create the project board (no issues yet)
/plan-project assign              # only reassign issues to teammates
```

## What You Must Do When Invoked

Follow these phases in order. Do not skip phases. Check for the sub-command flag first and jump to the relevant phase if given.

---

## Phase 0 — Detect Repo and GitHub Auth

```bash
# Get repo info from git remote
REPO_REMOTE=$(git remote get-url origin 2>/dev/null)
REPO_OWNER=$(echo "$REPO_REMOTE" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|')
REPO_NAME=$(echo "$REPO_REMOTE" | sed -E 's|.*github\.com[:/][^/]+/([^/.]+).*|\1|')
echo "Repo: $REPO_OWNER/$REPO_NAME"

# Confirm gh is authenticated
gh auth status 2>&1 | head -5
CURRENT_USER=$(gh api user --jq '.login' 2>/dev/null)
echo "GitHub user: $CURRENT_USER"
```

If `REPO_OWNER` or `REPO_NAME` is empty: tell the user "Not inside a git repository with a GitHub remote" and stop.
If `CURRENT_USER` is empty: tell the user to run `gh auth login` first and stop.

---

## Phase 1 — Check for Existing GitHub Project

```bash
gh project list --owner "$REPO_OWNER" --format json --limit 20 2>/dev/null
```

Parse the JSON output. Look for a project whose `title` matches or contains `$REPO_NAME` (case-insensitive).

**If a matching project is found:**
- Print: `✓ Found existing project: "[title]" (#[number])`
- Store the project number as `PROJECT_NUMBER`
- Show current board stats:
  ```bash
  gh project view $PROJECT_NUMBER --owner "$REPO_OWNER" --format json 2>/dev/null | jq '{title, url, number}'
  gh issue list --repo "$REPO_OWNER/$REPO_NAME" --json number,title,assignees,milestone,labels --limit 100 2>/dev/null | jq 'length'
  ```
- Ask the user: "A project board already exists. Do you want to (1) add new issues to this sprint, (2) plan the next sprint from the backlog, or (3) start fresh?" Wait for their answer before continuing.
- If continuing, skip Phase 2 entirely and go to Phase 3.

**If no matching project is found:**
- Continue to Phase 2.

---

## Phase 2 — Prompt User to Create the Project Board Manually

> **Why manual?** The GitHub CLI and API can create a blank project, but they cannot create or configure Status field columns (Backlog, Ready, In Progress, etc.). Project templates in the GitHub UI are the only way to get a pre-configured board with the right columns. Do not attempt `gh project create` — it produces a blank board with no usable columns.

Print this message to the user and wait for them to complete each step before continuing:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ACTION REQUIRED — Create the GitHub Project manually
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The GitHub CLI cannot create project columns — you need to do
this once in the browser using a sprint template.

Step 1 — Open GitHub Projects:
  https://github.com/REPO_OWNER?tab=projects
  (replace REPO_OWNER with the actual owner)

Step 2 — Click "New project"

Step 3 — Choose a template
  Pick a sprint or scrum template that includes these columns:
    Backlog → Ready → In Progress → In Review → Done
  Recommended built-in templates:
    • "Team backlog"  — has Backlog, Ready, In Progress, Done
    • "Scrum"         — has full sprint fields including sprints
  If you have a saved custom template, use that instead.

Step 4 — Name the project
  Use exactly: REPO_NAME

Step 5 — Link the project to this repository
  Inside the new project → Settings → Linked repositories
  → Add repository → REPO_OWNER/REPO_NAME

Step 6 — Come back here and type "done"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Wait for the user to type "done" (or confirm they've finished) before continuing.

**After confirmation — verify the project now exists:**
```bash
gh project list --owner "$REPO_OWNER" --format json --limit 20 2>/dev/null
```

Look for a project matching `$REPO_NAME`. If still not found, tell the user:
"Project not detected yet. Double-check the project name matches exactly, then type 'done' again."
Repeat the verification until it is found. Store the project number as `PROJECT_NUMBER`.

**Read the project's field configuration:**
```bash
gh api graphql -f query='
query($owner: String!, $number: Int!) {
  user(login: $owner) {
    projectV2(number: $number) {
      id
      fields(first: 20) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id
            name
            options { id name }
          }
        }
      }
    }
  }
}
' -f owner="$REPO_OWNER" -F number=$PROJECT_NUMBER --jq '.data.user.projectV2'
```

If the owner is an organization, replace `user(login:...)` with `organization(login:...)`.

Store `PROJECT_ID`, `STATUS_FIELD_ID`, and the option IDs for each status column.

Print the detected columns so the user can confirm they match:
```
✓ Project found: "REPO_NAME" (#PROJECT_NUMBER)
  Status columns detected:
    • Backlog      (id: ...)
    • Ready        (id: ...)
    • In Progress  (id: ...)
    • In Review    (id: ...)
    • Done         (id: ...)
```

If fewer than 4 Status options are detected, warn the user: "Your project template may be missing some columns. Expected: Backlog, Ready, In Progress, In Review, Done. You can add missing columns in the project Settings on GitHub, then type 'continue'." Wait before proceeding.

Print: `✓ Project board ready. Continuing with planning...`

---

## Phase 3 — Requirements Gathering

Ask the user these questions clearly, waiting for answers before proceeding:

**Question block 1 — Project context:**
```
What is this project trying to accomplish? (2-3 sentences)
Who are the end users?
What is the deadline or target sprint count?
```

**Question block 2 — Features / requirements:**
```
List the features or tasks you want to build. Bullet points, rough notes, pasted
from a doc — I will refine them into proper user stories.

If you have existing issues, say "use existing issues" and I will pull them from GitHub.
```

**Question block 3 — Team:**
```
Who are your teammates? List their GitHub usernames.
Assign now or leave unassigned?
Each person's area: frontend, backend, infra, etc.?
```

---

## Phase 4 — Refine into User Stories

Transform each raw requirement into a user story using this format:

```markdown
**Title:** [Short, action-oriented — max 60 chars]

**As a** [user type]
**I want** [specific action]
**So that** [concrete benefit]

**Acceptance Criteria:**
- [ ] [Testable condition 1]
- [ ] [Testable condition 2]
- [ ] [Testable condition 3]

**Labels:** [backend|frontend|infra|bug|enhancement|docs]
**Priority:** [P0=critical | P1=high | P2=normal | P3=nice-to-have]
**Size:** [XS=<1hr | S=1-4hr | M=4-8hr | L=2+days]
**Blocked by:** [issue # or "none"]
```

**Ordering rules:**
1. Foundation work first (schema, auth, core API before UI)
2. Blocked items after their blockers
3. P0 → Sprint 1, P1 → Sprint 2, P2+ → Backlog

Print all stories, then ask: "Approve and create all / Edit any / Remove any?" Wait for confirmation.

---

## Phase 5 — Create GitHub Issues

For each approved user story:

```bash
gh issue create \
  --repo "$REPO_OWNER/$REPO_NAME" \
  --title "STORY_TITLE" \
  --body "STORY_BODY" \
  --label "LABEL" \
  --assignee "GITHUB_USERNAME_OR_OMIT"
```

Print progress: `✓ #4 — Add user registration endpoint`

---

## Phase 6 — Add Issues to Project Board and Set Fields

For each issue:

**Get node ID:**
```bash
gh api repos/$REPO_OWNER/$REPO_NAME/issues/ISSUE_NUMBER --jq '.node_id'
```

**Add to project:**
```bash
gh api graphql -f query='
mutation($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    item { id }
  }
}
' -f projectId="PROJECT_ID" -f contentId="ISSUE_NODE_ID" --jq '.data.addProjectV2ItemById.item.id'
```

**Set Status to Backlog:**
```bash
gh api graphql -f query='
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
    value: { singleSelectOptionId: $optionId }
  }) { projectV2Item { id } }
}
' -f projectId="PROJECT_ID" -f itemId="ITEM_ID" \
  -f fieldId="STATUS_FIELD_ID" -f optionId="BACKLOG_OPTION_ID"
```

Repeat the mutation for Priority and Size fields if they exist on the board.

---

## Phase 7 — Sprint Planning

Group issues into sprints:
- Sprint 1: all P0 + P1 issues that fit within capacity
- Sprint 2: remaining P1
- Sprint 3+: P2 and P3

**Capacity:** ~20 story points per person per sprint (XS=0.5, S=1, M=2, L=5)

Create milestones:
```bash
gh api repos/$REPO_OWNER/$REPO_NAME/milestones \
  --method POST \
  --field title="Sprint 1" \
  --field description="Foundation sprint" \
  --field due_on="YYYY-MM-DDT00:00:00Z"
```

Sprint 1 due = 2 weeks from today. Sprint 2 = 4 weeks. Etc.

Assign milestone to each issue:
```bash
gh issue edit ISSUE_NUMBER --repo "$REPO_OWNER/$REPO_NAME" --milestone "Sprint 1"
```

---

## Phase 8 — Final Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Project: REPO_NAME
 Board:   https://github.com/users/REPO_OWNER/projects/PROJECT_NUMBER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sprint 1 (due: DATE) — N issues
  #4  Auth register endpoint    @teammate  M
  #5  Login page UI             @teammate  M

Sprint 2 (due: DATE) — N issues
  ...

Backlog — N issues
  ...

Next: teammates run /start-task to pick up their assigned issue.
```

---

## For /plan-project sprint

Skip Phases 2–5. Pull existing open issues, ask which go into the next sprint, run Phases 7–8.

## For /plan-project assign

List open issues and current assignees. Ask who to reassign to. Run:
```bash
gh issue edit ISSUE_NUMBER --repo "$REPO_OWNER/$REPO_NAME" \
  --add-assignee "NEW_USER" --remove-assignee "OLD_USER"
```

## GraphQL owner type note

All queries above use `user(login: $owner)`. If the repo belongs to a GitHub **organization**, replace `user` with `organization` in every query.
