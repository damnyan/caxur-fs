#!/bin/bash
# scripts/verify.sh
# Type-checks and lints the Next.js client project.

echo "Starting verification for the Next.js Client project..."

# Find the client directory dynamically relative to the workspace root.
WORKSPACE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

if [ -d "$WORKSPACE_ROOT/client" ]; then
    cd "$WORKSPACE_ROOT/client" || exit 1
else
    # Fallback
    cd ../../../../../client || cd ./client || { echo "Could not find client directory."; exit 1; }
fi

# Run next build to type-check, lint, and verify build succeeds.
# Next.js build automatically handles ESLint and TypeScript checks.
echo "Running Next.js Build (Lint + Type Check)..."
npm run build --if-present || npx next build

echo "Verification complete!"
