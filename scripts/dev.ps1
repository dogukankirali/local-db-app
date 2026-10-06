<#
  Lokal geliştirme ortamını başlatır: Worker API + lokal D1 (:8787) -> Next.js (:3000).
  Next.js /api isteklerini Worker'a yönlendirir; prod'daki tek origin düzeniyle aynı.

  Kullanım:
    ./scripts/dev.ps1                       # API + frontend
    ./scripts/dev.ps1 -Import <dump.sql>    # önce lokal D1'i bir pg_dump çıktısıyla doldur
    ./scripts/dev.ps1 -NoFrontend           # yalnızca API

  İlk açılışta worker bağımlılıklarını kurar, .dev.vars oluşturur ve D1 şemasını uygular.
  Taşınan kullanıcıların şifresi için: cd worker; npm run set-password -- <kullanıcı-adı>
#>
param(
  [string]$Import,
  [switch]$NoFrontend
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$worker = Join-Path $root "worker"

Push-Location $worker
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "Worker bağımlılıkları kuruluyor..." -ForegroundColor Cyan
    npm install
  }
  if (-not (Test-Path ".dev.vars")) { Copy-Item ".dev.vars.example" ".dev.vars" }
  # Frontend henüz derlenmediyse wrangler'ın beklediği assets klasörünü oluştur
  $out = Join-Path $root "frontend\out"
  if (-not (Test-Path $out)) { New-Item -ItemType Directory $out | Out-Null }

  npx wrangler d1 migrations apply kiroku --local
  if ($Import) {
    Write-Host "Lokal D1 $Import ile dolduruluyor..." -ForegroundColor Cyan
    node scripts/pg-dump-to-d1.mjs $Import
    npx wrangler d1 execute kiroku --local --file=.import/data.sql
  }

  Write-Host "API: http://localhost:8787/api" -ForegroundColor Green
  $api = Start-Process -FilePath "npx.cmd" -ArgumentList "wrangler", "dev", "--port", "8787" -PassThru -NoNewWindow
} finally {
  Pop-Location
}

if (-not $NoFrontend) {
  Push-Location (Join-Path $root "frontend")
  try {
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
    npm run dev
  } finally {
    Pop-Location
    Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue
  }
} else {
  Wait-Process -Id $api.Id
}
