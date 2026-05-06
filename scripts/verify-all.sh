#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting full project verification..."

# 1. Client Verification
echo "📦 Building Client..."
cd client
bun run build
cd ..
echo "✅ Client build successful."

# 2. Admin Verification
echo "📦 Building Admin..."
cd admin
bun run build
cd ..
echo "✅ Admin build successful."

# 3. API Verification
echo "🦀 Checking API..."
cd api
cargo sqlx prepare
cargo check
cd ..
echo "✅ API checks successful."

echo "🎉 All verifications passed! You are ready to commit and push."
