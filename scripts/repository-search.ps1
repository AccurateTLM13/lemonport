param(
  [Parameter(Mandatory = $true)][string]$Root,
  [Parameter(Mandatory = $true)][string]$Pattern,
  [string]$Glob = '*',
  [switch]$Regex
)

$ErrorActionPreference = 'Stop'
$skipDirectories = @('.git', '.orchestration-local', 'node_modules')
$files = Get-ChildItem -LiteralPath $Root -Recurse -File -Filter $Glob | Where-Object {
  $parts = $_.FullName.Substring($Root.Length).TrimStart('\', '/') -split '[\\/]'
  -not ($parts | Where-Object { $skipDirectories -contains $_ })
}

if ($Regex) {
  $matches = $files | Select-String -Pattern $Pattern
} else {
  $matches = $files | Select-String -Pattern $Pattern -SimpleMatch
}

foreach ($match in $matches) {
  '{0}:{1}:{2}' -f $match.Path, $match.LineNumber, $match.Line
}
