#!/bin/bash
# scripts/setup.sh
# Installs dependencies for the Next.js client project.

echo "Setting up the Next.js Client project..."

WORKSPACE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

if [ -d "$WORKSPACE_ROOT/client" ]; then
    cd "$WORKSPACE_ROOT/client" || exit 1
else
    # Fallback
    cd ../../../../../client || cd ./client || { echo "Could not find client directory."; exit 1; }
fi

echo "Installing dependencies..."
# Determine package manager
if [ -f "bun.lockb" ]; then
    echo "Detected bun lockfile. Using bun..."
    bun install
elif [ -f "yarn.lock" ]; then
    echo "Detected yarn lockfile. Using yarn..."
    yarn install
elif [ -f "pnpm-lock.yaml" ]; then
    echo "Detected pnpm lockfile. Using pnpm..."
    pnpm install
else
    echo "Using npm..."
    npm install
fi

echo "Setup complete!"
