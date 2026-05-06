#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Setting up Caxur Project..."

echo "------------------------------------------------"
echo "🛠️  Checking Dependencies..."
echo "------------------------------------------------"

# 1. Bun
if ! command -v bun &> /dev/null; then
    echo "📦 Bun is not installed. Installing..."
    curl -fsSL https://bun.sh/install | bash
    # Source bun into current session if possible
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
else
    echo "✅ Bun is already installed: $(bun --version)"
fi

# 2. Rust (Cargo)
if ! command -v cargo &> /dev/null; then
    echo "🦀 Rust/Cargo is not installed. Installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    # Source cargo env into current session
    source "$HOME/.cargo/env"
else
    echo "✅ Rust/Cargo is already installed: $(cargo --version)"
fi

# 3. SQLx CLI
if ! command -v sqlx &> /dev/null; then
    echo "🗄️ SQLx CLI is not installed. Installing..."
    cargo install sqlx-cli
else
    echo "✅ SQLx CLI is already installed: $(sqlx --version)"
fi

# 4. Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Docker is not installed."
    if command -v brew &> /dev/null; then
        echo "🍺 Installing Docker via Homebrew..."
        brew install --cask docker
    else
        echo "⚠️  Homebrew not found. Please install Docker manually from https://docs.docker.com/get-docker/"
        exit 1
    fi
else
    echo "✅ Docker is already installed: $(docker --version)"
fi

echo "------------------------------------------------"
echo "📄 Setting up Environment Files..."
echo "------------------------------------------------"

# Client env
if [ ! -f "client/.env.local" ]; then
    if [ -f "client/.env.example" ]; then
        echo "📝 Creating client/.env.local from example..."
        cp client/.env.example client/.env.local
    fi
else
    echo "✅ client/.env.local already exists. Skipping..."
fi

# Admin env
if [ ! -f "admin/.env.local" ]; then
    if [ -f "admin/.env.example" ]; then
        echo "📝 Creating admin/.env.local from example..."
        cp admin/.env.example admin/.env.local
    fi
else
    echo "✅ admin/.env.local already exists. Skipping..."
fi

# API env
if [ ! -f "api/.env" ]; then
    if [ -f "api/.env.example" ]; then
        echo "📝 Creating api/.env from example..."
        cp api/.env.example api/.env
    fi
else
    echo "✅ api/.env already exists. Skipping..."
fi

echo "------------------------------------------------"
echo "📦 Installing Dependencies..."
echo "------------------------------------------------"

echo "Installing Client dependencies..."
cd client
bun install
cd ..

echo "Installing Admin dependencies..."
cd admin
bun install
cd ..

echo "🎉 Setup complete! You can now run the development environment using './scripts/run-dev.sh'"
