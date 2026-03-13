param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutFile = "",
  [switch]$Stdout,
  [switch]$AllText,
  [string[]]$ExcludeDirs = @(
    ".git",
    ".svn",
    ".hg",
    "scripts",
    "node_modules",
    "dist",
    "build",
    "target",
    ".idea",
    ".vscode",
    ".venv",
    "venv",
    "bin",
    "obj"
  ),
  [string[]]$ExcludeFiles = @(
    ".gitignore"
  ),
  [string[]]$IncludeExtensions = @(
    ".nim",
    ".nims",
    ".nimble",
    ".md",
    ".txt",
    ".json",
    ".toml",
    ".yml",
    ".yaml",
    ".feature",
    ".ini",
    ".conf",
    ".env",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    ".prettierrc",
    ".pre-commit-config.yaml",
    ".ps1",
    ".psm1",
    ".sh",
    ".bash",
    ".zsh",
    ".bat",
    ".cmd",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".css",
    ".scss",
    ".html",
    ".xml",
    ".graphql",
    ".sql",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".cs",
    ".c",
    ".h",
    ".cpp",
    ".hpp"
  )
)

$ErrorActionPreference = "Stop"

function Get-RelativePath([string]$BasePath, [string]$FullPath) {
  $baseFull = [System.IO.Path]::GetFullPath($BasePath)
  $full = [System.IO.Path]::GetFullPath($FullPath)
  if ($full.StartsWith($baseFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    $rel = $full.Substring($baseFull.Length)
    return $rel.TrimStart([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
  }
  return $full
}

function Should-ExcludePath([string]$RelativePath, [string[]]$ExcludedDirectories) {
  $segments = $RelativePath -split "[/\\]"
  foreach ($segment in $segments) {
    if ([string]::IsNullOrWhiteSpace($segment)) { continue }
    foreach ($excluded in $ExcludedDirectories) {
      if ($segment.Equals($excluded, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
  }
  return $false
}

function Should-ExcludeFile([string]$RelativePath, [string[]]$ExcludedFiles) {
  $fileName = [System.IO.Path]::GetFileName($RelativePath)
  foreach ($excluded in $ExcludedFiles) {
    if ([string]::IsNullOrWhiteSpace($excluded)) { continue }
    if ($RelativePath.Equals($excluded, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
    if ($fileName.Equals($excluded, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
  }
  return $false
}

function LooksLike-TextFile([string]$Path) {
  try {
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    try {
      $max = 8192
      $buffer = New-Object byte[] $max
      $read = $stream.Read($buffer, 0, $max)
      for ($i = 0; $i -lt $read; $i++) {
        if ($buffer[$i] -eq 0) { return $false }
      }
      return $true
    } finally {
      $stream.Dispose()
    }
  } catch {
    return $false
  }
}

function Read-TextFile([string]$Path) {
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    return $utf8NoBom.GetString($bytes, 3, $bytes.Length - 3)
  }
  if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
    return [System.Text.Encoding]::Unicode.GetString($bytes, 2, $bytes.Length - 2)
  }
  if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
    return [System.Text.Encoding]::BigEndianUnicode.GetString($bytes, 2, $bytes.Length - 2)
  }
  $utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
  try {
    return $utf8Strict.GetString($bytes)
  } catch {
    return [System.Text.Encoding]::Default.GetString($bytes)
  }
}

function Should-IncludeFile([System.IO.FileInfo]$File, [string]$RelativePath, [switch]$IncludeAllText, [string[]]$Extensions) {
  if ($IncludeAllText) {
    return (LooksLike-TextFile -Path $File.FullName)
  }

  $fileName = $File.Name
  $lowerName = $fileName.ToLowerInvariant()
  foreach ($extOrName in $Extensions) {
    $needle = $extOrName.ToLowerInvariant()
    if ($needle.StartsWith(".")) {
      if ($lowerName.EndsWith($needle)) { return $true }
    } else {
      if ($lowerName -eq $needle) { return $true }
    }
  }

  return $false
}

if ([string]::IsNullOrWhiteSpace($OutFile) -and -not $Stdout) {
  $OutFile = (Join-Path $PSScriptRoot "source_dump.txt")
} elseif (-not $Stdout -and -not [System.IO.Path]::IsPathRooted($OutFile)) {
  $OutFile = (Join-Path $PSScriptRoot $OutFile)
}

$rootFullPath = [System.IO.Path]::GetFullPath($Root)
$outFileFullPath = ""
if (-not $Stdout) {
  $outFileFullPath = [System.IO.Path]::GetFullPath($OutFile)
}

$files = Get-ChildItem -LiteralPath $rootFullPath -Recurse -File -Force |
  ForEach-Object {
    $rel = Get-RelativePath -BasePath $rootFullPath -FullPath $_.FullName
    if (-not $Stdout) {
      if ([System.IO.Path]::GetFullPath($_.FullName).Equals($outFileFullPath, [System.StringComparison]::OrdinalIgnoreCase)) { return }
    }
    if (Should-ExcludePath -RelativePath $rel -ExcludedDirectories $ExcludeDirs) { return }
    if (Should-ExcludeFile -RelativePath $rel -ExcludedFiles $ExcludeFiles) { return }
    if (-not (Should-IncludeFile -File $_ -RelativePath $rel -IncludeAllText:$AllText -Extensions $IncludeExtensions)) { return }
    [PSCustomObject]@{ File = $_; RelativePath = $rel }
  } |
  Sort-Object -Property RelativePath

if ($Stdout) {
  foreach ($item in $files) {
    $file = $item.File
    $rel = $item.RelativePath
    Write-Output $rel
    $content = Read-TextFile -Path $file.FullName
    if ($null -ne $content -and $content.Length -gt 0) { Write-Output $content }
    Write-Output "------"
  }
} else {
  $utf8WithBom = New-Object System.Text.UTF8Encoding($true)
  $writer = New-Object System.IO.StreamWriter($outFileFullPath, $false, $utf8WithBom)
  try {
    foreach ($item in $files) {
      $file = $item.File
      $rel = $item.RelativePath
      $writer.WriteLine($rel)
      $content = Read-TextFile -Path $file.FullName
      if ($null -ne $content -and $content.Length -gt 0) {
        $writer.Write($content)
        if (-not $content.EndsWith("`n")) { $writer.WriteLine("") }
      }
      $writer.WriteLine("------")
    }
  } finally {
    $writer.Dispose()
  }
}
