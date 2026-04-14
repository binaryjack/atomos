#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Build and publish all @atomos-web packages to npm in dependency order.

.DESCRIPTION
  1. Verifies npm authentication.
  2. Builds packages in dependency order (core → prime-style → prime → mcp → structura).
  3. Publishes each package with pnpm publish --no-git-checks.

.PARAMETER DryRun
  Print what would be published without actually publishing.

.PARAMETER Tag
  npm dist-tag to publish under (default: latest).

.EXAMPLE
  .\scripts\publish-packages.ps1
  .\scripts\publish-packages.ps1 -DryRun
  .\scripts\publish-packages.ps1 -Tag next
#>
param(
  [switch]$DryRun,
  [string]$Tag = 'latest'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent

# Ordered by dependency — each package must come after its dependencies
$packages = @(
  'atomos-structura-core',
  'atomos-prime-style',
  'atomos-prime',
  'atomos-structura-mcp',
  'atomos-structura'
)

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "    ERR $msg" -ForegroundColor Red }

# ── 1. Auth check ──────────────────────────────────────────────────────────
Write-Step "Checking npm authentication..."
$whoami = npm whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Fail "Not logged in to npm. Run: npm login"
  exit 1
}
Write-Ok "Logged in as: $whoami"

# ── 2. Build ───────────────────────────────────────────────────────────────
Write-Step "Building packages..."
foreach ($pkg in $packages) {
  $pkgPath = Join-Path $root "packages\$pkg"
  Write-Host "  Building $pkg..." -NoNewline
  Push-Location $pkgPath
  try {
    $out = pnpm run build 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Host " FAILED" -ForegroundColor Red
      Write-Host $out
      exit 1
    }
    Write-Host " done" -ForegroundColor Green
  } finally {
    Pop-Location
  }
}

# ── 3. Publish ─────────────────────────────────────────────────────────────
Write-Step "Publishing packages (tag: $Tag)$(if ($DryRun) { ' [DRY RUN]' })..."
foreach ($pkg in $packages) {
  $pkgPath  = Join-Path $root "packages\$pkg"
  $pkgName  = (Get-Content "$pkgPath\package.json" | ConvertFrom-Json).name
  $pkgVer   = (Get-Content "$pkgPath\package.json" | ConvertFrom-Json).version

  Write-Host "  Publishing $pkgName@$pkgVer..." -NoNewline
  Push-Location $pkgPath
  try {
    if ($DryRun) {
      pnpm publish --dry-run --no-git-checks --tag $Tag 2>&1 | Out-Null
      Write-Host " (dry-run skipped)" -ForegroundColor Yellow
    } else {
      $out = pnpm publish --no-git-checks --tag $Tag 2>&1
      # pnpm exits 1 with a warning about --no-git-checks; treat publish line as success signal
      if ($out -match "\+ $pkgName@") {
        Write-Host " published" -ForegroundColor Green
      } elseif ($out -match 'previously published') {
        Write-Host " already published (skipped)" -ForegroundColor Yellow
      } else {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host $out
        exit 1
      }
    }
  } finally {
    Pop-Location
  }
}

Write-Host "`nAll packages published successfully.`n" -ForegroundColor Green
