#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting full project verification..."

# 1. Client Verification
echo "📦 Verification: Next.js Client..."
cd client
echo "   🧹 Running Linter..."
bun run lint
echo "   📦 Building Production Bundle..."
bun run build
cd ..
echo "✅ Client verification successful."

# 2. Admin Verification
echo "📦 Verification: React Admin..."
cd admin
echo "   🧹 Running Linter..."
bun run lint
echo "   📦 Building Production Bundle..."
bun run build
cd ..
echo "✅ Admin verification successful."

# 3. API Verification
echo "📦 Verification: Rust Axum API..."
cd api
echo "   🎨 Checking Code Formatting..."
cargo fmt --all -- --check
echo "   🗃️ Preparing SQLx Queries..."
cargo sqlx prepare
echo "   🦀 Running Clippy Lints..."
cargo clippy --all-targets -- -D warnings
echo "   🧪 Running Unit Tests & OpenAPI Spec Generation..."
cargo test --lib
cd ..
echo "✅ API checks, formatting, clippy, and unit tests successful."

echo "🎉 All verifications passed! You are ready to commit and push."
