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


# 4. Rebuild Native Modules for Electron
echo "Rebuilding Native Modules..."
cd node_modules/better-sqlite3
npm run build-release -- --target=25.9.8 --dist-url=https://electronjs.org/headers
cd ../..

# 5. Build UI
echo "Building UI & Packaging App..."
pnpm --filter @tempo/ui dist

echo "Build complete! Artifacts are in ui/release/"
