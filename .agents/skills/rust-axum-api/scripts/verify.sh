#!/bin/bash
# scripts/verify.sh
# Type-checks, lints, tests, and checks coverage for the Rust Axum API project.

echo "Starting verification for the Rust Axum API project..."

WORKSPACE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

if [ -d "$WORKSPACE_ROOT/api" ]; then
    cd "$WORKSPACE_ROOT/api" || exit 1
else
    # Fallback
    cd ../../../../../api || cd ./api || { echo "Could not find api directory."; exit 1; }
fi

echo "Running Cargo fmt..."
cargo fmt -- --check || { echo "Formatting failed."; exit 1; }

echo "Running Cargo clippy..."
cargo clippy -- -D warnings || { echo "Clippy failed."; exit 1; }

echo "Running Cargo test..."
cargo test || { echo "Tests failed."; exit 1; }

# Check if cargo-tarpaulin is installed before running it
if cargo tarpaulin --version >/dev/null 2>&1; then
    echo "Running Cargo tarpaulin for coverage..."
    cargo tarpaulin --ignore-tests || { echo "Coverage check failed."; exit 1; }
else
    echo "Warning: cargo-tarpaulin is not installed. Skipping coverage check."
    echo "To install, run: cargo install cargo-tarpaulin"
fi

echo "Verification complete!"
