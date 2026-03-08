Write-Host "Starting Tempo Build (Windows)..." -ForegroundColor Cyan

# remove lock file
if (Test-Path pnpm-lock.yaml) { Remove-Item pnpm-lock.yaml -Force }
if (Test-Path node_modules) { Remove-Item node_modules -Recurse -Force }
# 1. Install Dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
pnpm install
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at install step"; exit 1 }

pnpm install -g typescript
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at typescript install step"; exit 1 }

# 2. Build Contracts
Write-Host "Building Contracts..." -ForegroundColor Green
pnpm --filter @tempo/contracts build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at contracts step"; exit 1 }

# 3. Build & Package Agent
Write-Host "Building Agent..." -ForegroundColor Green
pnpm --filter @tempo/agent build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at agent build step"; exit 1 }

Write-Host "Packaging Agent..." -ForegroundColor Green
# Agent is now bundled as source/dist by UI build.
# We create a self-contained deployment to ensure node_modules are valid.
Write-Host "Deploying Agent dependencies..." -ForegroundColor Green
if (Test-Path agent-deploy) { Remove-Item agent-deploy -Recurse -Force }
pnpm --filter @tempo/agent deploy agent-deploy --prod --legacy
# Ensure dist is fresh
Copy-Item -Path agent\dist -Destination agent-deploy\ -Recurse -Force


if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at agent package step"; exit 1 }

# Rebuild Native Modules for Electron (Root node_modules used by electron-builder)
Write-Host "Rebuilding Native Modules..." -ForegroundColor Green
Push-Location node_modules/better-sqlite3
cmd.exe /c "npm run build-release -- --target=25.9.8 --dist-url=https://electronjs.org/headers"
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at rebuild native step"; exit 1 }
Pop-Location

# 4. Build UI
Write-Host "Building UI & Packaging App..." -ForegroundColor Green
pnpm --filter @tempo/ui dist
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at UI dist step"; exit 1 }

Write-Host "Build complete! Artifacts are in ui/release/" -ForegroundColor Cyan
