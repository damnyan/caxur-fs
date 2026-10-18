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

echo "Running Next.js Lint..."
bun run lint --max-warnings 0 || { echo "Linting failed."; exit 1; }

echo "Running Next.js Build (Type Check + Production Bundle)..."
bun run build || { echo "Build failed."; exit 1; }

echo "Verification complete!"
