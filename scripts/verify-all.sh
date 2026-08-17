#!/bin/bash

# Exit immediately if a command exits with a non-zero status or a piped command fails
set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Ensure we always return to the repository root on exit or error
trap 'cd "$REPO_ROOT"' EXIT ERR

# Styling helpers
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SKIP_BUMP=false
TARGET_SERVICE="all"

# Parse CLI arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --skip-bump)
      SKIP_BUMP=true
      shift
      ;;
    --service)
      TARGET_SERVICE="$2"
      shift 2
      ;;
    -h|--help)
      echo -e "${BOLD}Usage:${NC} ./scripts/verify-all.sh [options]"
      echo ""
      echo "Options:"
      echo "  --skip-bump            Skip semantic versioning auto-bump check"
      echo "  --service <name>       Verify a specific service: client, admin, api, or all (default: all)"
      echo "  -h, --help             Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for available options."
      exit 1
      ;;
  esac
done

echo -e "${BOLD}${BLUE}🚀 Starting full project verification...${NC}"

# 0. Semantic Versioning Auto-Bump
if [ "$SKIP_BUMP" = false ]; then
  echo -e "\n${BOLD}🏷️  Step 0: Semantic Versioning Auto-Bump...${NC}"
  bun scripts/increment-versions.ts
else
  echo -e "\n${YELLOW}⏩ Step 0: Skipping version auto-bump (--skip-bump provided).${NC}"
fi

# Verification functions
verify_client() {
  echo -e "\n${BOLD}${BLUE}📦 [1/3] Verification: Next.js Client...${NC}"
  cd "$REPO_ROOT/client"

  echo -e "   🧹 Running Linter (Zero Warnings Enforced: --max-warnings 0)..."
  if ! bun run lint --max-warnings 0; then
    echo -e "${RED}❌ Next.js Client linting failed! Fix all lint errors and warnings.${NC}"
    exit 1
  fi

  echo -e "   📦 Building Production Bundle..."
  if ! bun run build; then
    echo -e "${RED}❌ Next.js Client build failed! Fix compilation and type errors.${NC}"
    exit 1
  fi

  cd "$REPO_ROOT"
  echo -e "${GREEN}✅ Next.js Client verification successful (0 warnings, 0 errors).${NC}"
}

verify_admin() {
  echo -e "\n${BOLD}${BLUE}📦 [2/3] Verification: React Admin...${NC}"
  cd "$REPO_ROOT/admin"

  echo -e "   🧹 Running Linter (Zero Warnings Enforced: --max-warnings 0)..."
  if ! bun run lint -- --max-warnings 0; then
    echo -e "${RED}❌ React Admin linting failed! Fix all lint errors and warnings.${NC}"
    exit 1
  fi

  echo -e "   📦 Building Production Bundle..."
  if ! bun run build; then
    echo -e "${RED}❌ React Admin build failed! Fix compilation and type errors.${NC}"
    exit 1
  fi

  cd "$REPO_ROOT"
  echo -e "${GREEN}✅ React Admin verification successful (0 warnings, 0 errors).${NC}"
}

verify_api() {
  echo -e "\n${BOLD}${BLUE}📦 [3/3] Verification: Rust Axum API...${NC}"
  cd "$REPO_ROOT/api"

  echo -e "   🎨 Checking Code Formatting..."
  if ! cargo fmt --all -- --check; then
    echo -e "${RED}❌ Rust formatting check failed! Run 'cargo fmt' to format code.${NC}"
    exit 1
  fi

  echo -e "   🗃️  Preparing SQLx Queries..."
  if ! cargo sqlx prepare; then
    echo -e "${RED}❌ SQLx query preparation failed! Check database connection and schema metadata.${NC}"
    exit 1
  fi

  echo -e "   🦀 Running Clippy Lints (Zero Warnings Enforced: -D warnings)..."
  if ! cargo clippy --all-targets -- -D warnings; then
    echo -e "${RED}❌ Clippy lint check failed! Fix all Rust warnings and lints.${NC}"
    exit 1
  fi

  echo -e "   🧪 Running Unit Tests & OpenAPI Spec Generation..."
  if ! cargo test --lib; then
    echo -e "${RED}❌ Unit tests or OpenAPI spec generation failed!${NC}"
    exit 1
  fi

  cd "$REPO_ROOT"
  echo -e "${GREEN}✅ Rust Axum API verification successful (0 warnings, 0 errors).${NC}"
}

# Execute based on target service
case "$TARGET_SERVICE" in
  client)
    verify_client
    ;;
  admin)
    verify_admin
    ;;
  api)
    verify_api
    ;;
  all)
    verify_client
    verify_admin
    verify_api
    ;;
  *)
    echo -e "${RED}Invalid service: $TARGET_SERVICE. Choose from: client, admin, api, all${NC}"
    exit 1
    ;;
esac

echo -e "\n${BOLD}${GREEN}🎉 All verifications passed with ZERO warnings and ZERO errors! You are ready to commit and push.${NC}\n"
