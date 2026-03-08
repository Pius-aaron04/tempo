#!/bin/bash
set -e

echo "Starting Tempo Build (Linux/macOS)..."

# remove lock file
if [ -f "pnpm-lock.yaml" ]; then rm -f pnpm-lock.yaml; fi
if [ -d "node_modules" ]; then rm -rf node_modules; fi

# 1. Install Dependencies
echo "Installing dependencies..."
pnpm install

# 2. Set up typescript
echo "Setting up typescript..."
pnpm install -g typescript

# 3. Build Contracts
echo "Building Contracts..."
pnpm --filter @tempo/contracts build

# 4. Build & Package Agent
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
