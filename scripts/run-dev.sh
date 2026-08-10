#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Resolve script directory absolutely to prevent relative path bugs
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Print versions before starting services
# Print versions before starting services
API_VERSION=$(bun -e "
const fs = require('fs');
try {
  const content = fs.readFileSync('api/Cargo.toml', 'utf8');
  const match = content.match(/^version\s*=\s*\"([^\"]+)\"/m);
  console.log(match ? match[1] : '0.1.0');
} catch (e) {
  console.log('0.1.0');
}
" 2>/dev/null || echo "0.1.0")

CLIENT_VERSION=$(bun -e "console.log(require('./client/package.json').version)" 2>/dev/null || echo "0.1.0")
ADMIN_VERSION=$(bun -e "console.log(require('./admin/package.json').version)" 2>/dev/null || echo "0.0.0")

echo "=================================================="
echo "🚀 Starting Caxur Development Environment..."
echo "🔹 Rust Axum API version:    v$API_VERSION"
echo "🔹 Next.js Client version:   v$CLIENT_VERSION"
echo "🔹 React Vite Admin version:  v$ADMIN_VERSION"
echo "=================================================="

# Function to kill process running on a specific port
kill_port() {
  local PORT=$1
  if command -v lsof &> /dev/null; then
    local PID=$(lsof -t -i :$PORT || true)
    if [ -n "$PID" ]; then
      echo "⚠️  Port $PORT is currently in use by PID $PID. Killing it..."
      kill -9 $PID 2>/dev/null || true
    fi
  fi
}

echo "🧹 Cleaning up potentially conflicting ports..."
kill_port 3000 # API
kill_port 3001 # Admin
kill_port 3002 # Client
kill_port 5173 # MCP Inspector

# Cleanup function on exit or interrupt
cleanup() {
  if [ "${CLEANUP_DONE:-false}" = "true" ]; then
    return
  fi
  CLEANUP_DONE=true

  echo ""
  echo "🛑 Shutting down development environment..."
}
trap cleanup SIGINT SIGTERM EXIT



echo "🗄️ Running database migrations..."
cd api
cargo sqlx database setup
cd ..

# Start all services concurrently via our custom orchestrator which keeps
# active service URLs pinned as a sticky footer at the bottom of the terminal output
bun run "$SCRIPT_DIR/run-dev-orchestrator.ts"
