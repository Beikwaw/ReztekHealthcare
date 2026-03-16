#!/bin/bash
# Fix git state, stage all changes, commit, and push to main.
# Run from repo root: bash scripts/git-commit-push.sh

set -e
cd "$(dirname "$0")/.."

echo "Removing stale lock file..."
rm -f .git/index.lock

echo "Rebuilding index from HEAD (fixes 'index file smaller than expected')..."
rm -f .git/index
git read-tree HEAD

echo "Staging all changes..."
git add -A

echo "Status:"
git status --short

if [ -n "$(git status --porcelain)" ]; then
  echo "Committing all staged changes..."
  git commit -m "fix: assert UserRole type in auth-context; ensure all changes committed"
else
  echo "No working-tree changes to commit (branch may already be ahead)."
fi

echo "Pushing to origin main..."
git push origin main

echo "Done."
