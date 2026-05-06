#!/bin/bash
# scripts/setup.sh
# Installs dependencies and prepares the Rust Axum API project.

echo "Setting up the Rust Axum API project..."

WORKSPACE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

if [ -d "$WORKSPACE_ROOT/api" ]; then
    cd "$WORKSPACE_ROOT/api" || exit 1
else
    # Fallback
    cd ../../../../../api || cd ./api || { echo "Could not find api directory."; exit 1; }
fi

echo "Checking for sqlx-cli..."
if ! cargo sqlx --version >/dev/null 2>&1; then
    echo "Installing sqlx-cli..."
    cargo install sqlx-cli --no-default-features --features postgres
fi

echo "Running cargo build..."
cargo build

echo "Setup complete!"
