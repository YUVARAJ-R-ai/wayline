# Setup Guide — GitHub CLI (`gh`) + Claude Code
*For all Wayline team members — do this once on your machine*

---

## Overview

You need two tools configured to work on this project:

| Tool | What it does | Required for |
|------|-------------|--------------|
| `gh` | GitHub CLI — creates PRs, manages issues from terminal | All team members |
| Claude Code | AI coding assistant that understands the whole repo | Optional but recommended |

Both tools authenticate with GitHub. This guide walks through everything from scratch.

---

## Part 1 — Install and Authenticate `gh`

### Install

Pick your OS:

**Linux (Debian/Ubuntu)**
```bash
sudo apt update
sudo apt install gh
```

**Linux (Arch / Manjaro / NixOS)**
```bash
# Arch
sudo pacman -S github-cli

# NixOS
nix-env -iA nixpkgs.gh
```

**macOS**
```bash
# Install Homebrew first if you don't have it: https://brew.sh
brew install gh
```

**Windows**
```powershell
# Using winget (built into Windows 11)
winget install GitHub.cli

# Or using Scoop
scoop install gh
```

Verify the install:
```bash
gh --version
# Should print: gh version 2.x.x
```

---

### Authenticate `gh` with GitHub

Run this and follow the prompts:

```bash
gh auth login
```

You will be asked a series of questions. Answer exactly like this:

```
? Where do you use GitHub?
  > GitHub.com                        ← choose this

? What is your preferred protocol for Git operations on this host?
  > SSH                               ← choose SSH (not HTTPS)

? Generate a new SSH key to add to your GitHub account?
  > Yes                               ← if you don't have one
  (or No if you already have an SSH key set up)

? How would you like to authenticate GitHub CLI?
  > Login with a web browser           ← choose this

! First copy your one-time code: XXXX-XXXX
Press Enter to open github.com in your browser...
```

After pressing Enter, your browser opens GitHub. Paste the code shown in the terminal. Click **Authorize GitHub CLI**.

Back in the terminal you should see:
```
✓ Authentication complete.
✓ Configured git protocol
✓ Logged in as your-username
```

---

### Add the extra scopes this project needs

The default login doesn't give `gh` access to project boards. Run these two commands after logging in:

```bash
# Allows reading the project board
gh auth refresh -s read:project

# Allows adding/updating tasks on the project board
gh auth refresh -s project
```

Each command opens the browser again — just click **Authorize** each time.

**Verify all scopes are set:**
```bash
gh auth status
```

The output should show these scopes:
```
- Token scopes: 'admin:public_key', 'gist', 'project', 'read:org', 'repo'
```

If `project` and `read:org` are missing, re-run the `gh auth refresh` commands above.

---

### Test your connection

```bash
# Should print your GitHub username
gh api user --jq '.login'

# Should list Wayline repos you have access to
gh repo list YUVARAJ-R-ai --limit 5
```

---

## Part 2 — Set Up SSH for Git

`gh auth login` with SSH either generated a key or used your existing one. Verify it works:

```bash
ssh -T git@github.com
```

Expected output:
```
Hi your-username! You've successfully authenticated, but GitHub does not provide shell access.
```

If you see `Permission denied (publickey)` instead:

1. Check if a key exists:
   ```bash
   ls ~/.ssh/id_ed25519.pub 2>/dev/null || ls ~/.ssh/id_rsa.pub 2>/dev/null || echo "no key found"
   ```

2. If no key exists, generate one:
   ```bash
   ssh-keygen -t ed25519 -C "your@email.com"
   # Press Enter 3 times to accept all defaults
   ```

3. Add the key to GitHub:
   ```bash
   gh ssh-key add ~/.ssh/id_ed25519.pub --title "My Laptop"
   ```

4. Test again: `ssh -T git@github.com`

---

## Part 3 — One-Time Git Configuration

Run these once — they set your identity and prevent the most common git errors:

```bash
# Your name and email (shows in commit history)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Use SSH for all GitHub repos by default
git config --global url."git@github.com:".insteadOf "https://github.com/"

# Prevents the "divergent branches" fatal error on git pull
git config --global pull.rebase false

# Makes git output more readable
git config --global color.ui auto
```

Verify:
```bash
git config --global --list
```

---

## Part 4 — Clone the Wayline Repo

```bash
git clone git@github.com:YUVARAJ-R-ai/wayline.git
cd wayline
git checkout dev          # ← always work on dev, never main
```

The frontend (`frontend/`) is inside the same repo — no second clone needed.
The old `wayline-nextjs` repo on GitHub is no longer active.

---

## Part 5 — Install and Configure Claude Code

Claude Code is an AI assistant that runs in your terminal and understands the entire codebase. It can write code, explain files, manage GitHub issues, and more.

### Install

```bash
npm install -g @anthropic-ai/claude-code
```

Verify:
```bash
claude --version
# Should print: 2.x.x (Claude Code)
```

> **Note:** Requires Node.js 18+. Run `node --version` to check. If below 18, download from https://nodejs.org

---

### Get an Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign in or create an account
3. Go to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

---

### Set the API Key

**Linux / macOS** — add to your shell profile so it persists:

```bash
# For zsh (default on Mac, common on Linux)
echo 'export ANTHROPIC_API_KEY="sk-ant-your-key-here"' >> ~/.zshrc
source ~/.zshrc

# For bash
echo 'export ANTHROPIC_API_KEY="sk-ant-your-key-here"' >> ~/.bashrc
source ~/.bashrc
```

**Windows (PowerShell)**
```powershell
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-your-key-here", "User")
```

Verify:
```bash
echo $ANTHROPIC_API_KEY
# Should print your key (not empty)
```

---

### Configure Claude Code permissions for this project

Claude Code asks for permission every time it runs a new type of command. You can pre-approve the commands it uses most often so it doesn't interrupt you constantly.

Inside the `wayline` folder, create `.claude/settings.json`:

```bash
mkdir -p /path/to/wayline/.claude
```

Create the file with this content:

```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(gh *)",
      "Bash(docker *)",
      "Bash(npm *)",
      "Bash(node --check *)",
      "Bash(find . *)",
      "Bash(grep *)"
    ]
  }
}
```

This allows Claude to run git, gh, docker, and npm commands without asking each time. It will still ask for anything not in this list.

---

### Run Claude Code

```bash
# Inside the wayline project folder
cd wayline
claude
```

Claude opens an interactive session. It reads the project files and is ready to help. Try:
- `"explain what the api-gateway does"`
- `"show me what's on the project board"`
- `"help me implement issue #3"`

To exit: type `/exit` or press `Ctrl+C`

---

### Connect Claude Code to GitHub

Claude Code uses the `gh` CLI you already set up — no extra authentication needed. As long as `gh auth status` shows you're logged in, Claude can read issues, create PRs, and update the project board.

Test it inside a claude session:
```bash
claude
```
Then type: `"show me all open issues assigned to me"`

---

## Verification Checklist

Run through this after setup to confirm everything works:

```bash
# 1. gh is authenticated
gh auth status
# ✓ Logged in to github.com

# 2. All required scopes present
gh auth status | grep "Token scopes"
# Should include: project, read:org, repo

# 3. SSH works for git
ssh -T git@github.com
# Hi username! You've successfully authenticated

# 4. Can clone via SSH (if not already done)
git clone git@github.com:YUVARAJ-R-ai/wayline.git
# Should clone without asking for password

# 5. Can read project board
gh api graphql -f query='{ user(login: "YUVARAJ-R-ai") { projectsV2(first: 1) { nodes { title } } } }' --jq '.data.user.projectsV2.nodes[].title'
# Should print: wayline

# 6. Claude Code is installed
claude --version

# 7. API key is set
echo $ANTHROPIC_API_KEY | cut -c1-10
# Should print: sk-ant-api
```

---

## Troubleshooting

### `gh: command not found`
The install didn't complete. Re-run the install command for your OS and open a new terminal.

### `Permission denied (publickey)` on git push/pull
Your SSH key isn't added to GitHub. Run:
```bash
gh ssh-key add ~/.ssh/id_ed25519.pub --title "$(hostname)"
```

### `gh auth status` shows wrong account
You're logged into someone else's GitHub account. Run:
```bash
gh auth logout
gh auth login
```

### Claude says "API key not found" or "authentication error"
The env var isn't set. Run `echo $ANTHROPIC_API_KEY` — if it prints nothing, re-run the `export` command and open a new terminal.

### Claude can't access GitHub / run git commands
Check that `gh auth status` shows you're logged in. If the project board commands fail, re-run:
```bash
gh auth refresh -s project
gh auth refresh -s read:project
```

### `fatal: Need to specify how to reconcile divergent branches`
You skipped the one-time git config. Run:
```bash
git config --global pull.rebase false
```
