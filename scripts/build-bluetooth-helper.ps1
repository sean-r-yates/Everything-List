$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$source = Join-Path $root "desktop\native-bluetooth-sync.cs"
$output = Join-Path $root "desktop\native-bluetooth-sync.exe"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Missing Bluetooth helper source: $source"
}

$csc = Get-Command csc.exe -ErrorAction SilentlyContinue
if (-not $csc) {
  $cscCandidates = @(
    "$env:windir\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:windir\Microsoft.NET\Framework\v4.0.30319\csc.exe"
  )
  $cscPath = $cscCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($cscPath) {
    $csc = @{ Source = $cscPath }
  }
}

$windowsKitRoot = "${env:ProgramFiles(x86)}\Windows Kits\10"
$winmd = Get-ChildItem -LiteralPath (Join-Path $windowsKitRoot "UnionMetadata") -Recurse -Filter Windows.winmd -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1
$winrt = Get-ChildItem -LiteralPath (Join-Path $windowsKitRoot "References") -Recurse -Filter System.Runtime.WindowsRuntime.dll -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1

if ($csc -and $winmd -and $winrt) {
  & $csc.Source /nologo /target:exe /out:$output /reference:$($winmd.FullName) /reference:$($winrt.FullName) $source
  exit $LASTEXITCODE
}

$dotnet = Get-Command dotnet.exe -ErrorAction SilentlyContinue
if (-not $dotnet) {
  throw "Install Visual Studio Build Tools, the .NET SDK, and the Windows 10/11 SDK to build the Bluetooth helper."
}

$sdkList = & $dotnet.Source --list-sdks
if (-not $sdkList) {
  throw "Install the .NET SDK and the Windows 10/11 SDK to build the Bluetooth helper. This PC only has the .NET runtime."
}

$buildDir = Join-Path $root "work\bluetooth-helper-build"
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

$project = Join-Path $buildDir "EveryListBluetoothHelper.csproj"
$program = Join-Path $buildDir "Program.cs"

Copy-Item -LiteralPath $source -Destination $program -Force
@"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0-windows10.0.19041.0</TargetFramework>
    <UseWindowsForms>false</UseWindowsForms>
    <ImplicitUsings>disable</ImplicitUsings>
    <Nullable>disable</Nullable>
  </PropertyGroup>
</Project>
"@ | Set-Content -LiteralPath $project -Encoding UTF8

& $dotnet.Source publish $project -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o $buildDir
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Copy-Item -LiteralPath (Join-Path $buildDir "EveryListBluetoothHelper.exe") -Destination $output -Force
