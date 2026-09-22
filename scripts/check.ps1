param(
  [string]$Distro = 'Ubuntu-Ext'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Assert-ExitCode([string]$Label) {
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

Push-Location $repoRoot
try {
  Write-Host '==> Agent tests'
  & npm.cmd run test:agent
  Assert-ExitCode 'Agent tests'

  Write-Host '==> Web typecheck'
  & npm.cmd run typecheck
  Assert-ExitCode 'Web typecheck'

  Write-Host '==> Web production build'
  & npm.cmd run build
  Assert-ExitCode 'Web build'

  Write-Host '==> Production dependency audit'
  & npm.cmd audit --omit=dev
  Assert-ExitCode 'Dependency audit'

  if ($repoRoot -notmatch '^([A-Za-z]):\\(.*)$') {
    throw "Unsupported workspace path: $repoRoot"
  }
  $drive = $Matches[1].ToLowerInvariant()
  $relative = $Matches[2].Replace('\', '/')
  $wslRoot = "/mnt/$drive/$relative"
  $linuxHome = (& wsl.exe -d $Distro -- bash -c 'printf %s "$HOME"').Trim()
  Assert-ExitCode 'WSL home lookup'

  Write-Host '==> Foundry tests'
  & wsl.exe -d $Distro --cd "$wslRoot/contracts" --exec "$linuxHome/.foundry/bin/forge" test -vv
  Assert-ExitCode 'Foundry tests'

  Write-Host '==> RISC Zero workspace check'
  $toolPath = "$linuxHome/.cargo/bin:$linuxHome/.risc0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
  & wsl.exe -d $Distro --cd "$wslRoot/zk" --exec env "PATH=$toolPath" cargo check
  Assert-ExitCode 'RISC Zero check'

  Write-Host 'All checks passed.' -ForegroundColor Green
}
finally {
  Pop-Location
}
