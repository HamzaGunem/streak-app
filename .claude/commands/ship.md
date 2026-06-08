Stage, verify, commit, and push all current changes to GitHub.

Follow these steps in order. Stop and report if any step fails.

## Step 1 — Inspect what changed

Run these in parallel:
- `git status` — see untracked and modified files
- `git diff HEAD` — see the full diff of all changes

Read the diff carefully. Understand what every change does before writing the message.

## Step 2 — Bring the branch up to date

Run `git fetch origin` then `git rebase origin/main` (or the current tracking branch). Resolve any conflicts that arise before continuing.

## Step 3 — Stage all changes

Run `git add -A` to stage everything, then `git status` to confirm the staging area looks correct. If any file looks wrong (e.g. a .env file, a large binary), unstage it and warn the user.

## Step 4 — Write a commit message

Based on the diff from Step 1, write a commit message that:
- Has a short subject line (≤72 chars) in the imperative mood that says *what* changed
- Has a body paragraph that explains *why* — the motivation, the problem solved, or the feature added
- Does NOT mention file names, function names, or implementation details that are obvious from the diff
- Ends with: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

## Step 5 — Commit

Run:
```
git commit -m "$(cat <<'EOF'
<subject line>

<body>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Substitute the real subject and body you wrote in Step 4.

## Step 6 — Push to GitHub

Run `git push origin HEAD`. If the push is rejected because the remote has commits the local branch doesn't, go back to Step 2 and rebase again, then re-push.

## Step 7 — Confirm

Run `git log --oneline -5` and report the new commit hash and message to the user, confirming the push succeeded.
