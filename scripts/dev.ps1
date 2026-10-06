<#
  Lokal geliştirme ortamını başlatır: PostgreSQL -> Go backend (:8080) -> Next.js (:3000).

  Gereksinimler (ilk kurulum için README'deki "Lokal geliştirme" bölümüne bakın):
    - Go ve PostgreSQL ikilileri PATH'te ya da $env:DEVTOOLS altında (varsayılan %LOCALAPPDATA%\devtools)
    - backend/.env (ENV=development)
    - frontend/.env.development.local (NEXT_PUBLIC_API_URL=http://localhost:8080)

  Kullanım:
    ./scripts/dev.ps1              # hepsini başlat
    ./scripts/dev.ps1 -Seed        # önce lokal DB'yi prod API'den doldur
    ./scripts/dev.ps1 -NoFrontend  # yalnızca DB + backend
#>
param(
  [switch]$Seed,
  [switch]$NoFrontend,
  [string]$SeedSource = "https://local-db-app-413673987721.us-central1.run.app"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$tools = if ($env:DEVTOOLS) { $env:DEVTOOLS } else { Join-Path $env:LOCALAPPDATA "devtools" }

foreach ($bin in @("$tools\go\bin", "$tools\pgsql\bin")) {
  if ((Test-Path $bin) -and -not ($env:Path -split ";" -contains $bin)) { $env:Path = "$bin;$env:Path" }
}

# 1) PostgreSQL
$pgData = Join-Path $tools "pgdata"
if (Test-Path $pgData) {
  & pg_ctl -D $pgData status *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "PostgreSQL başlatılıyor..." -ForegroundColor Cyan
    & pg_ctl -D $pgData -l (Join-Path $tools "pg.log") -o "-p 5432 -c listen_addresses=localhost" start | Out-Null
  }
} else {
  Write-Host "Uyarı: $pgData bulunamadı, PostgreSQL'in zaten çalıştığı varsayılıyor." -ForegroundColor Yellow
}

# 2) Seed (opsiyonel)
Push-Location (Join-Path $root "backend")
try {
  if ($Seed) {
    Write-Host "Lokal DB $SeedSource kaynağından dolduruluyor..." -ForegroundColor Cyan
    & go run ./cmd/devseed -source $SeedSource
  }

  # 3) Backend
  Write-Host "Backend derleniyor..." -ForegroundColor Cyan
  Get-Process local-db-backend -ErrorAction SilentlyContinue | Stop-Process -Force
  $exe = Join-Path $tools "local-db-backend.exe"
  & go build -o $exe .
  $backend = Start-Process -FilePath $exe -WorkingDirectory (Get-Location) -NoNewWindow -PassThru
  Write-Host "Backend: http://localhost:8080 (PID $($backend.Id))" -ForegroundColor Green
} finally {
  Pop-Location
}

# 4) Frontend
if (-not $NoFrontend) {
  Push-Location (Join-Path $root "frontend")
  try {
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
    npm run dev
  } finally {
    Pop-Location
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
  }
}
