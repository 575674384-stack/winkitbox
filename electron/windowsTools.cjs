function normalizeLaunchDescriptor(descriptor) {
  return {
    toolId: String(descriptor?.toolId ?? ""),
    label: String(descriptor?.label ?? "Tool"),
    wingetId: String(descriptor?.wingetId ?? ""),
    appUserModelIds: Array.isArray(descriptor?.appUserModelIds)
      ? descriptor.appUserModelIds.map(String).slice(0, 8)
      : [],
    startMenuNames: Array.isArray(descriptor?.startMenuNames)
      ? descriptor.startMenuNames.map(String).slice(0, 8)
      : [],
    commands: Array.isArray(descriptor?.commands) ? descriptor.commands.map(String).slice(0, 8) : [],
    homepage: String(descriptor?.homepage ?? "")
  };
}

function normalizeLaunchDescriptors(descriptors) {
  return Array.isArray(descriptors) ? descriptors.map(normalizeLaunchDescriptor).slice(0, 80) : [];
}

function buildPayloadAssignment(value) {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64");

  return `
$payload = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}'))
$parsedTools = $payload | ConvertFrom-Json
$tools = @()

if ($null -ne $parsedTools) {
  if ($parsedTools -is [array]) {
    for ($index = 0; $index -lt $parsedTools.Count; $index++) {
      $tools += $parsedTools[$index]
    }
  } else {
    $tools = @($parsedTools)
  }
}
`;
}

function buildDetectToolsScript(descriptors, options = {}) {
  const safeDescriptors = normalizeLaunchDescriptors(descriptors);
  const setup = buildPayloadAssignment(safeDescriptors);

  if (options.fixtureMode) {
    return setup;
  }

  return `${setup}
$startApps = @(Get-StartApps -ErrorAction SilentlyContinue)
$programDirs = @(
  "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs",
  "$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs"
) | Where-Object { Test-Path -LiteralPath $_ }
$shortcuts = @()
$wingetOutput = ''

foreach ($programDir in $programDirs) {
  $shortcuts += @(Get-ChildItem -LiteralPath $programDir -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue)
}

if (($tools | Where-Object { -not [string]::IsNullOrWhiteSpace($_.wingetId) } | Select-Object -First 1)) {
  $wingetOutput = (& winget list --source winget --accept-source-agreements 2>&1 | Out-String)
}

function Test-CommandExists($command) {
  if ([string]::IsNullOrWhiteSpace($command)) { return $false }
  $expandedCommand = [Environment]::ExpandEnvironmentVariables([string]$command)
  if (Test-Path -LiteralPath $expandedCommand -PathType Leaf) { return $true }
  $resolved = Get-Command $expandedCommand -ErrorAction SilentlyContinue
  if ($resolved) { return $true }
  return $false
}

function Find-StartApp($tool) {
  foreach ($appId in @($tool.appUserModelIds)) {
    if ([string]::IsNullOrWhiteSpace($appId)) { continue }
    $match = $startApps | Where-Object { $_.AppID -eq $appId } | Select-Object -First 1
    if ($match) { return $match }
  }

  foreach ($name in @($tool.startMenuNames)) {
    if ([string]::IsNullOrWhiteSpace($name)) { continue }
    $match = $startApps | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    if ($match) { return $match }
  }

  foreach ($name in @($tool.startMenuNames)) {
    if ([string]::IsNullOrWhiteSpace($name)) { continue }
    $match = $startApps | Where-Object { $_.Name -like "*$name*" } | Select-Object -First 1
    if ($match) { return $match }
  }

  return $null
}

function Find-Shortcut($tool) {
  foreach ($name in @($tool.startMenuNames)) {
    if ([string]::IsNullOrWhiteSpace($name)) { continue }
    $shortcut = $shortcuts |
      Where-Object { $_.BaseName -like "*$name*" } |
      Sort-Object FullName |
      Select-Object -First 1

    if ($shortcut) { return $shortcut }
  }

  return $null
}

function Test-WingetInstalled($wingetId) {
  if ([string]::IsNullOrWhiteSpace($wingetId)) { return $false }
  return ($wingetOutput -match [regex]::Escape($wingetId))
}

$results = foreach ($tool in $tools) {
  $startApp = Find-StartApp $tool
  $shortcut = Find-Shortcut $tool
  $commandFound = $false

  foreach ($command in @($tool.commands)) {
    if (Test-CommandExists $command) {
      $commandFound = $true
      break
    }
  }

  $wingetInstalled = Test-WingetInstalled $tool.wingetId
  $installed = [bool]($wingetInstalled -or $startApp -or $shortcut -or $commandFound)
  $launcherFound = [bool]($startApp -or $shortcut -or $commandFound)
  $launcherType = if ($startApp) { 'app' } elseif ($shortcut) { 'shortcut' } elseif ($commandFound) { 'command' } else { '' }
  $message = if ($installed -and $launcherFound) {
    '已安装，可直接打开。'
  } elseif ($installed) {
    '已安装，但暂未找到启动入口。'
  } else {
    '未安装。'
  }

  [PSCustomObject]@{
    toolId = [string]$tool.toolId
    installed = $installed
    launcherFound = $launcherFound
    launcherType = $launcherType
    message = $message
  }
}

@($results) | ConvertTo-Json -Depth 6 -Compress
`;
}

function buildLaunchToolScript(descriptor) {
  const setup = buildPayloadAssignment([normalizeLaunchDescriptor(descriptor)]);

  return `${setup}
$data = @($tools)[0]
$startApps = @(Get-StartApps -ErrorAction SilentlyContinue)
$programDirs = @(
  "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs",
  "$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs"
) | Where-Object { Test-Path -LiteralPath $_ }

foreach ($appId in @($data.appUserModelIds)) {
  if ([string]::IsNullOrWhiteSpace($appId)) { continue }
  $app = $startApps | Where-Object { $_.AppID -eq $appId } | Select-Object -First 1

  if ($app) {
    Start-Process -FilePath 'explorer.exe' -ArgumentList "shell:AppsFolder\\$($app.AppID)"
    Write-Host "Opened $($data.label) from Windows apps."
    exit 0
  }
}

foreach ($name in @($data.startMenuNames)) {
  if ([string]::IsNullOrWhiteSpace($name)) { continue }
  $app = $startApps | Where-Object { $_.Name -eq $name } | Select-Object -First 1

  if ($app) {
    Start-Process -FilePath 'explorer.exe' -ArgumentList "shell:AppsFolder\\$($app.AppID)"
    Write-Host "Opened $($data.label) from Windows apps."
    exit 0
  }
}

foreach ($name in @($data.startMenuNames)) {
  if ([string]::IsNullOrWhiteSpace($name)) { continue }
  $app = $startApps | Where-Object { $_.Name -like "*$name*" } | Select-Object -First 1

  if ($app) {
    Start-Process -FilePath 'explorer.exe' -ArgumentList "shell:AppsFolder\\$($app.AppID)"
    Write-Host "Opened $($data.label) from Windows apps."
    exit 0
  }
}

foreach ($name in @($data.startMenuNames)) {
  if ([string]::IsNullOrWhiteSpace($name)) { continue }
  foreach ($programDir in $programDirs) {
    $shortcut = Get-ChildItem -LiteralPath $programDir -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue |
      Where-Object { $_.BaseName -like "*$name*" } |
      Sort-Object FullName |
      Select-Object -First 1

    if ($shortcut) {
      Start-Process -FilePath $shortcut.FullName
      Write-Host "Opened $($data.label) from Start Menu."
      exit 0
    }
  }
}

foreach ($command in @($data.commands)) {
  if ([string]::IsNullOrWhiteSpace($command)) { continue }
  $expandedCommand = [Environment]::ExpandEnvironmentVariables([string]$command)

  if (Test-Path -LiteralPath $expandedCommand -PathType Leaf) {
    Start-Process -FilePath $expandedCommand
    Write-Host "Opened $($data.label) using $expandedCommand."
    exit 0
  }

  $resolved = Get-Command $expandedCommand -ErrorAction SilentlyContinue

  if ($resolved) {
    Start-Process -FilePath $resolved.Source
    Write-Host "Opened $($data.label) using $expandedCommand."
    exit 0
  }

  try {
    Start-Process -FilePath $expandedCommand -ErrorAction Stop
    Write-Host "Opened $($data.label) using $expandedCommand."
    exit 0
  } catch {}
}

Write-Error "Could not find an installed launcher for $($data.label)."
exit 1
`;
}

function buildOpenToolDirectoryScript(descriptor) {
  const setup = buildPayloadAssignment([normalizeLaunchDescriptor(descriptor)]);

  return `${setup}
$data = @($tools)[0]
$startApps = @(Get-StartApps -ErrorAction SilentlyContinue)
$programDirs = @(
  "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs",
  "$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs"
) | Where-Object { Test-Path -LiteralPath $_ }

function Open-Directory($path) {
  $directory = Split-Path -Parent -Path $path
  if (-not [string]::IsNullOrWhiteSpace($directory) -and (Test-Path -LiteralPath $directory)) {
    Start-Process -FilePath 'explorer.exe' -ArgumentList "\`"$directory\`""
    exit 0
  }
}

foreach ($command in @($data.commands)) {
  if ([string]::IsNullOrWhiteSpace($command)) { continue }
  $expandedCommand = [Environment]::ExpandEnvironmentVariables([string]$command)

  if (Test-Path -LiteralPath $expandedCommand -PathType Leaf) {
    Open-Directory $expandedCommand
  }

  $resolved = Get-Command $expandedCommand -ErrorAction SilentlyContinue
  if ($resolved) {
    Open-Directory $resolved.Source
  }
}

foreach ($name in @($data.startMenuNames)) {
  if ([string]::IsNullOrWhiteSpace($name)) { continue }
  foreach ($programDir in $programDirs) {
    $shortcut = Get-ChildItem -LiteralPath $programDir -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue |
      Where-Object { $_.BaseName -like "*$name*" } |
      Sort-Object FullName |
      Select-Object -First 1

    if ($shortcut) {
      $shell = New-Object -ComObject WScript.Shell
      $target = $shell.CreateShortcut($shortcut.FullName).TargetPath
      if (-not [string]::IsNullOrWhiteSpace($target) -and (Test-Path -LiteralPath $target)) {
        Open-Directory $target
      }
    }
  }
}

foreach ($appId in @($data.appUserModelIds)) {
  if ([string]::IsNullOrWhiteSpace($appId)) { continue }
  $app = $startApps | Where-Object { $_.AppID -eq $appId } | Select-Object -First 1
  if ($app) {
    $package = Get-AppxPackage | Where-Object { $_.PackageFamilyName -eq $app.AppID.Split('!')[0] } | Select-Object -First 1
    if ($package) {
      Start-Process -FilePath 'explorer.exe' -ArgumentList "\`"$($package.InstallLocation)\`""
      exit 0
    }
  }
}

Write-Error "Could not find an installed directory for $($data.label)."
exit 1
`;
}

module.exports = {
  buildDetectToolsScript,
  buildLaunchToolScript,
  buildOpenToolDirectoryScript,
  normalizeLaunchDescriptor,
  normalizeLaunchDescriptors
};
