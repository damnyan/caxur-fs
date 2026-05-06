#!/bin/bash
# scripts/verify.sh
# Type-checks and lints the React Admin project.

echo "Starting verification for the React Admin project..."

# Change to the admin directory (assuming script is run from project root or inside admin)
# We find the admin directory dynamically relative to the workspace root.
WORKSPACE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

if [ -d "$WORKSPACE_ROOT/admin" ]; then
    cd "$WORKSPACE_ROOT/admin" || exit 1
else
    # Fallback to current directory if not git tracked
    cd ../../../../../admin || cd ./admin || { echo "Could not find admin directory."; exit 1; }
fi

echo "Running TypeScript Compiler (tsc -b)..."
npm run build --if-present || npx tsc -b

echo "Running ESLint..."
npm run lint --if-present || npx eslint .

echo "Verification complete!"
