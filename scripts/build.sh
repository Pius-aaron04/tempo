#!/bin/bash
set -e

echo "Starting Tempo Build (Linux/macOS)..."

# 1. Install Dependencies
echo "Installing dependencies..."
pnpm install

# 2. Build Contracts
echo "Building Contracts..."
pnpm --filter @tempo/contracts build

# 3. Build & Package Agent
echo "Building Agent..."
pnpm --filter @tempo/agent build
echo "Packaging Agent..."
# We rely on the package script to handle output paths
pnpm --filter @tempo/agent package

# 4. Build UI
echo "Building UI & Packaging App..."
pnpm --filter @tempo/ui dist

echo "Build complete! Artifacts are in ui/release/"
