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
# Agent is now bundled as source/dist by UI build.
# We create a self-contained deployment to ensure node_modules are valid (no workspace symlinks).
echo "Deploying Agent dependencies..."
rm -rf agent-deploy
pnpm --filter @tempo/agent deploy agent-deploy --prod --legacy
# Ensure dist is fresh (deploy might copy old dist or none)
cp -r agent/dist agent-deploy/



# 4. Build UI
echo "Building UI & Packaging App..."
pnpm --filter @tempo/ui dist

echo "Build complete! Artifacts are in ui/release/"
