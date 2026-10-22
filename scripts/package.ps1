# Builds release/SealBeach-Lively.zip - a zip Lively Wallpaper can import directly
# (LivelyInfo.json must sit at the root of the zip, not inside a sub-folder).
#
# Usage (from the repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/package.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'release'
$zipPath = Join-Path $outDir 'SealBeach-Lively.zip'

$include = @(
  'index.html',
  'LivelyInfo.json',
  'LivelyProperties.json',
  'thumbnail.png',
  'css',
  'js'
)

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  foreach ($item in $include) {
    $full = Join-Path $root $item
    if (-not (Test-Path $full)) { throw "Missing $item" }
    $files = if ((Get-Item $full).PSIsContainer) { Get-ChildItem $full -Recurse -File } else { Get-Item $full }
    foreach ($f in $files) {
      # Forward slashes so every zip reader sees proper folders.
      $entry = $f.FullName.Substring($root.Length + 1) -replace '\\', '/'
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $entry, 'Optimal') | Out-Null
      Write-Host "  + $entry"
    }
  }
}
finally {
  $zip.Dispose()
}

Write-Host "Created $zipPath"
