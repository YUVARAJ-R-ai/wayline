# Team Git Workflow Guide 🚀

## 📋 Overview
This guide helps team members stay synchronized with the main branch and avoid common Git conflicts during collaboration.

## 🔄 Daily Workflow

### Step 1: Pull Latest Changes
Before starting any work, always pull the latest changes from the remote repository:

```bash
git pull origin main
```

This command pulls the latest changes from the remote `main` branch into your local copy.

### Step 2: Check Your Current Branch
Verify you're on the correct branch before pulling:

```bash
git branch
```

The current branch will be highlighted with an asterisk (*).

## 🧠 Important Notes

### Branch Requirements
- **You must be on the same branch** (`main`) for `git pull origin main` to work smoothly
- If you're on a different branch, switch to main first:
  ```bash
  git checkout main
  ```

### Handling Local Changes
If you have **uncommitted local changes** when pulling:

1. **Check your status first:**
   ```bash
   git status
   ```

2. **Options to handle local changes:**
   - **Commit your changes first:**
     ```bash
     git add .
     git commit -m "Your commit message"
     git pull origin main
     ```
   
   - **Stash your changes temporarily:**
     ```bash
     git stash
     git pull origin main
     git stash pop  # Reapply your stashed changes
     ```

### Merge Conflicts
If Git shows a **merge conflict**, you'll need to:
1. Open the conflicted files
2. Resolve the conflicts manually
3. Stage the resolved files: `git add <filename>`
4. Complete the merge: `git commit`

## 🧰 Advanced Options

### Auto-update for Branch Switchers
If you frequently switch between branches and want to ensure you have the latest updates:

```bash
git fetch --all
git pull
```

### Quick Status Check
Always check your repository status before major operations:

```bash
git status
```

## 📞 When to Reach Out

Contact the team lead if:
- Your teammate is using a **different branch** than `main`
- You're using a **PR-based workflow** (feature branches)
- You encounter persistent merge conflicts
- You're unsure about any step in this process

## 🔧 Troubleshooting

### Common Issues

**"Your branch is behind 'origin/main'"**
- Solution: Run `git pull origin main`

**"You have unmerged paths"**
- Solution: Resolve merge conflicts, then `git add` and `git commit`

**"Please commit your changes or stash them before you merge"**
- Solution: Either commit your changes or use `git stash` as shown above

## 📚 Quick Reference

| Command | Purpose |
|---------|---------|
| `git status` | Check current state of your repository |
| `git branch` | See all branches and current branch |
| `git pull origin main` | Pull latest changes from main branch |
| `git stash` | Temporarily save uncommitted changes |
| `git stash pop` | Restore stashed changes |
| `git fetch --all` | Download all remote branch updates |

---

💡 **Remember:** When in doubt, check `git status` first and don't hesitate to ask for help!