---
name: start-task
description: Pick up an assigned GitHub issue from the project Backlog, refine it into a detailed user story, move it to Ready, create the correct feature branch, implement the feature or fix, commit, push, raise a PR to the development branch, and move the issue to In Review. Use whenever a developer starts working on a new task.
trigger: /start-task
---

# /start-task

Pick up your next assigned task from GitHub, branch, implement, and raise a PR — in one guided flow.

## Usage

```
/start-task                    # list your assigned Backlog issues, pick one, full flow
/start-task <issue-number>     # jump straight to a specific issue number
/start-task --branch-only      # only set up the branch (skip listing and PR)
/start-task --pr-only          # only raise the PR for the current branch
```

## What You Must Do When Invoked

Follow these phases in order. Do not skip phases unless a sub-command flag was given.

---

## Phase 0 — Detect Repo, User, and Project

```bash
REPO_REMOTE=$(git remote get-url origin 2>/dev/null)
REPO_OWNER=$(echo "$REPO_REMOTE" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|')
REPO_NAME=$(echo "$REPO_REMOTE" | sed -E 's|.*github\.com[:/][^/]+/([^/.]+).*|\1|')
CURRENT_USER=$(gh api user --jq '.login' 2>/dev/null)
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

echo "Repo: $REPO_OWNER/$REPO_NAME"
echo "User: $CURRENT_USER"
echo "Branch: $CURRENT_BRANCH"
```

If any are empty → tell the user what's missing and stop. Empty `CURRENT_USER` means `gh auth login` is needed.

---

## Phase 1 — Find Your Assigned Tasks

If the user gave an issue number (`/start-task 7`), skip to Phase 2 with that number.

Otherwise:
```bash
gh issue list \
  --repo "$REPO_OWNER/$REPO_NAME" \
  --assignee "@me" \
  --state open \
  --json number,title,labels,milestone,body \
  --limit 50
```

Display cleanly:
```
Your assigned issues:

  #3   Add POST /auth/register endpoint         [backend]  Sprint 1
  #7   Build API keys dashboard page            [frontend] Sprint 1
  #11  Fix OSRM container not starting on boot  [infra]    Sprint 2

Which issue do you want to work on? (enter number)
```

Wait for the user to pick. Store as `ISSUE_NUMBER`.

If the list is empty: "No issues assigned to you. Ask the project lead to assign you one, or run `/plan-project assign`." Stop.

---

## Phase 2 — Fetch Full Issue Details

```bash
gh issue view $ISSUE_NUMBER \
  --repo "$REPO_OWNER/$REPO_NAME" \
  --json number,title,body,labels,assignees,milestone,state,url
```

Also get the node ID for project board mutations:
```bash
gh api repos/$REPO_OWNER/$REPO_NAME/issues/$ISSUE_NUMBER --jq '.node_id'
```

Store: `ISSUE_TITLE`, `ISSUE_BODY`, `ISSUE_URL`, `ISSUE_NODE_ID`.

---

## Phase 3 — Generate Refined User Story

Read the issue title and body. Read the relevant parts of the codebase first:
```bash
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" \) | grep -v node_modules | head -40
```

Then read the files most relevant to this issue to make "What to Build" accurate.

Produce this output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Issue #NUMBER — TITLE
 URL: ISSUE_URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User Story
As a [who uses this]
I want [specific action]
So that [concrete benefit]

What to Build
[2-4 sentences: which files to create/edit, which endpoints, which UI components,
which tables. Use the actual codebase structure — be specific.]

Acceptance Criteria
- [ ] [Testable condition 1]
- [ ] [Testable condition 2]
- [ ] [Testable condition 3]
- [ ] No build errors / tests pass

Implementation Notes
[Warnings, edge cases, files the developer will likely touch.]

Out of Scope
[Related things that should NOT be in this PR.]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Ask: "Does this look correct? (yes / no — tell me what to change)"
Wait for confirmation before Phase 4.

---

## Phase 4 — Move Issue to "Ready" on the Project Board

**Find the project:**
```bash
gh project list --owner "$REPO_OWNER" --format json --limit 20 2>/dev/null | \
  jq --arg name "$REPO_NAME" '.projects[] | select(.title | ascii_downcase | contains($name | ascii_downcase))'
```

Store `PROJECT_NUMBER`, then get full metadata:
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
' -f owner="$REPO_OWNER" -F number=$PROJECT_NUMBER
```

Store `PROJECT_ID`, `STATUS_FIELD_ID`, option IDs for Ready, In Progress, In Review.

**Find the project item for this issue:**
```bash
gh api graphql -f query='
query($projectId: ID!) {
  node(id: $projectId) {
    ... on ProjectV2 {
      items(first: 100) {
        nodes {
          id
          content { ... on Issue { number } }
        }
      }
    }
  }
}
' -f projectId="$PROJECT_ID" --jq ".data.node.items.nodes[] | select(.content.number == $ISSUE_NUMBER) | .id"
```

Store as `PROJECT_ITEM_ID`. If not found, add it to the board first:
```bash
gh api graphql -f query='
mutation($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    item { id }
  }
}
' -f projectId="$PROJECT_ID" -f contentId="$ISSUE_NODE_ID" --jq '.data.addProjectV2ItemById.item.id'
```

**Set status to Ready:**
```bash
gh api graphql -f query='
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
    value: { singleSelectOptionId: $optionId }
  }) { projectV2Item { id } }
}
' -f projectId="$PROJECT_ID" -f itemId="$PROJECT_ITEM_ID" \
  -f fieldId="$STATUS_FIELD_ID" -f optionId="$READY_OPTION_ID"
```

Print: `✓ Issue #$ISSUE_NUMBER moved to Ready.`
If board update fails, warn and continue — it is not blocking.

---

## Phase 5 — Set Up the Feature Branch

**Detect base branch:**
```bash
git branch -r | grep -E 'origin/(dev|develop|development)' | head -3
```

If `origin/dev` exists → base is `dev`. If `origin/develop` → `develop`. Otherwise → `main`.

Ask: "Base branch detected as: dev — correct? (yes / enter branch name)"
Store confirmed branch as `BASE_BRANCH`.

**Pull latest:**
```bash
git checkout $BASE_BRANCH
git pull origin $BASE_BRANCH
```

**Build branch name:**
- Issues: `feature/issue-NUMBER-short-description`
- Bug fixes: `fix/issue-NUMBER-short-description`
- Short description: title lowercased, spaces → hyphens, max 40 chars

```bash
BRANCH_NAME="feature/issue-$ISSUE_NUMBER-$(echo '$ISSUE_TITLE' | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/-\+/-/g' | cut -c1-40 | sed 's/-$//')"
```

Confirm: "Feature branch will be: `feature/issue-4-auth-register` — looks good? (yes / enter a different name)"

**Create and switch:**
```bash
git checkout -b $BRANCH_NAME
```

Print: `✓ Now on branch: $BRANCH_NAME`

---

## Phase 6 — Move Issue to "In Progress"

```bash
gh api graphql -f query='
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
    value: { singleSelectOptionId: $optionId }
  }) { projectV2Item { id } }
}
' -f projectId="$PROJECT_ID" -f itemId="$PROJECT_ITEM_ID" \
  -f fieldId="$STATUS_FIELD_ID" -f optionId="$IN_PROGRESS_OPTION_ID"
```

Print: `✓ Issue #$ISSUE_NUMBER moved to In Progress.`

---

## Phase 7 — Implement the Feature

Print acceptance criteria as a checklist:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Working on: #ISSUE_NUMBER — TITLE
 Branch: BRANCH_NAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - [ ] criterion 1
  - [ ] criterion 2
  - [ ] criterion 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then implement:
1. Read the files identified in Phase 3
2. Implement changes one file at a time
3. After each logical chunk, commit:
   ```bash
   git add path/to/file.js
   git commit -m "issue #$ISSUE_NUMBER: [what this commit does]"
   ```

Never use `git add .` — always add specific files. Never commit `.env`, `node_modules`, or data files.

Keep going until all acceptance criteria are met.

---

## Phase 8 — Push and Create Pull Request

```bash
git push -u origin $BRANCH_NAME
```

```bash
gh pr create \
  --repo "$REPO_OWNER/$REPO_NAME" \
  --base "$BASE_BRANCH" \
  --head "$BRANCH_NAME" \
  --title "issue #$ISSUE_NUMBER: $ISSUE_TITLE" \
  --body "$(cat <<'PREOF'
Closes #ISSUE_NUMBER

## What this PR does
[What to Build section from the user story]

## Acceptance criteria
- [ ] criterion 1
- [ ] criterion 2
- [ ] criterion 3

## How to test
1. Pull this branch and run the service
2. Test the relevant endpoint / UI flow
3. Verify acceptance criteria above

## Notes
_Any implementation decisions or things reviewers should know._
PREOF
)"
```

Print the PR URL.

---

## Phase 9 — Move Issue to "In Review"

```bash
gh api graphql -f query='
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
    value: { singleSelectOptionId: $optionId }
  }) { projectV2Item { id } }
}
' -f projectId="$PROJECT_ID" -f itemId="$PROJECT_ITEM_ID" \
  -f fieldId="$STATUS_FIELD_ID" -f optionId="$IN_REVIEW_OPTION_ID"
```

Print final summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Done! Issue #ISSUE_NUMBER is In Review.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Branch:  BRANCH_NAME
  PR:      PR_URL
  Board:   moved to "In Review"

What happens next:
  1. A teammate or the lead reviews your PR
  2. If changes requested → push fixes to BRANCH_NAME, PR updates automatically
  3. Lead merges to BASE_BRANCH → issue moves to Done
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## For /start-task --branch-only

Skip Phases 1–4 and 6–9. Ask for issue number and branch name, run Phase 5 only.

## For /start-task --pr-only

Skip Phases 1–7. Run from the current branch. Infer issue number from branch name (`feature/issue-N-*` → N). Fetch issue details, run Phases 8–9.

---

## Error handling

**"Branch already exists":**
```bash
# Ask: continue on it or create a new name?
git checkout $BRANCH_NAME   # to continue
```

**"Merge conflict on pull":**
```bash
git status
# Edit conflicting files, then:
git add conflicting-file.js
git commit --no-edit
```

**"Project board not found":** Run `/plan-project setup` first.

**"gh: authentication required":** Run `gh auth login`, then `gh auth refresh -s project`.

**Board status mutations fail:** Log the error, continue. Tell user to update manually if needed.
