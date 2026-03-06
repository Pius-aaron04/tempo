Write-Host "Starting Tempo Build (Windows)..." -ForegroundColor Cyan

# 1. Install Dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
pnpm install
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at install step"; exit 1 }

# 2. Build Contracts
Write-Host "Building Contracts..." -ForegroundColor Green
pnpm --filter @tempo/contracts build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at contracts step"; exit 1 }

# 3. Build & Package Agent
Write-Host "Building Agent..." -ForegroundColor Green
pnpm --filter @tempo/agent build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at agent build step"; exit 1 }

# 4. Rebuild Native Modules for Electron
Write-Host "Rebuilding Native Modules..." -ForegroundColor Green
Push-Location node_modules/better-sqlite3
cmd.exe /c "npm run build-release -- --target=25.9.8 --dist-url=https://electronjs.org/headers"
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at rebuild native step"; exit 1 }
Pop-Location

# 5. Build UI
Write-Host "Building UI & Packaging App..." -ForegroundColor Green
pnpm --filter @tempo/ui dist
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed at UI dist step"; exit 1 }

Write-Host "Build complete! Artifacts are in ui/release/" -ForegroundColor Cyan
