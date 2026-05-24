#!/usr/bin/env bash
set -euo pipefail

# Publish Lemon DOM to its own GitHub repository.
# Run from the lemon-dom-standalone directory after creating the remote repo.

REPO_URL="${1:-https://github.com/mnfrdrsh/lemon-dom.git}"

git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
git push -u origin main

echo ""
echo "Next steps:"
echo "1. Open https://github.com/mnfrdrsh/lemon-dom/settings/pages"
echo "2. Set Source to: GitHub Actions"
echo "3. Demo will deploy to: https://mnfrdrsh.github.io/lemon-dom/"
