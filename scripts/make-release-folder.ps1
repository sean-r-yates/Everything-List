$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root "release"
$distDir = Join-Path $root "dist"

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$patterns = @(
  "EveryList Setup *.exe",
  "EveryList Android *.apk",
  "EveryList Android.apk"
)

foreach ($pattern in $patterns) {
  Get-ChildItem -LiteralPath $distDir -Filter $pattern -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 |
    ForEach-Object {
      Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $releaseDir $_.Name) -Force
    }
}

Write-Output "Release files copied to $releaseDir"
