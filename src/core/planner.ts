import type { Tool } from "./catalog";
import { createRunEventLine } from "./runEvents";

export type InstallCommand = {
  toolId: string;
  label: string;
  command?: string;
  manualUrl?: string;
  source: Tool["source"];
  requiresAdmin: boolean;
  risk: Tool["risk"];
};

export type InstallPlan = {
  commands: InstallCommand[];
  readyCount: number;
  manualCount: number;
  adminCount: number;
  highRiskCount: number;
};

export type InstallOptions = {
  managedRootPath?: string;
};

export function buildInstallCommand(tool: Tool, options: InstallOptions = {}): InstallCommand {
  const base = {
    toolId: tool.id,
    label: tool.name,
    source: tool.source,
    requiresAdmin: Boolean(tool.requiresAdmin),
    risk: tool.risk
  };

  if (tool.customInstallCommand) {
    return {
      ...base,
      command: tool.customInstallCommand
    };
  }

  if (tool.portable) {
    return {
      ...base,
      command: buildPortableInstallCommand(tool, options)
    };
  }

  if (tool.installer) {
    return {
      ...base,
      command: buildInstallerInstallCommand(tool, options)
    };
  }

  if (tool.wingetId) {
    return {
      ...base,
      command: `winget install --id ${tool.wingetId} --exact --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity`
    };
  }

  if (tool.scoopPackage) {
    return {
      ...base,
      command: `scoop install ${tool.scoopPackage}`
    };
  }

  return {
    ...base,
    manualUrl: tool.homepage
  };
}

export function buildUninstallCommand(tool: Tool, options: InstallOptions = {}): InstallCommand {
  const base = {
    toolId: tool.id,
    label: tool.name,
    source: tool.source,
    requiresAdmin: Boolean(tool.requiresAdmin),
    risk: tool.risk
  };

  if (tool.customUninstallCommand) {
    return {
      ...base,
      command: tool.customUninstallCommand
    };
  }

  if (tool.portable) {
    return {
      ...base,
      command: buildPortableUninstallCommand(tool, options)
    };
  }

  if (tool.wingetId) {
    return {
      ...base,
      command: `winget uninstall --id ${tool.wingetId} --exact --source winget --disable-interactivity --accept-source-agreements`
    };
  }

  if (tool.scoopPackage) {
    return {
      ...base,
      command: `scoop uninstall ${tool.scoopPackage}`
    };
  }

  if (tool.installer) {
    return {
      ...base,
      command: buildInstallerUninstallCommand(tool)
    };
  }

  return {
    ...base,
    manualUrl: tool.homepage
  };
}

function buildPortableInstallCommand(tool: Tool, options: InstallOptions): string {
  const portable = tool.portable;

  if (!portable) {
    throw new Error(`${tool.name} is not a portable tool.`);
  }

  const targetDirName = escapePowerShellSingleQuoted(portable.targetDirName);
  const executable = escapePowerShellSingleQuoted(portable.executable);
  const archiveName = portable.archive
    ? escapePowerShellSingleQuoted(`${portable.targetDirName}.${portable.archive}`)
    : undefined;
  const downloadFileName = archiveName ?? escapePowerShellSingleQuoted(portable.fileName ?? portable.executable);
  const downloadUrlLines = buildDownloadUrlLines({
    downloadUrl: portable.downloadUrl,
    releaseApiUrl: portable.releaseApiUrl,
    assetPattern: portable.assetPattern
  });
  const extractionLines = buildPortableExtractionLines(portable.archive, portable.sevenZipDownloadUrl);

  return [
    "& {",
    "  $ErrorActionPreference = 'Stop'",
    "  $ProgressPreference = 'SilentlyContinue'",
    ...buildManagedRootLines(options),
    "  $toolRoot = Join-Path $managedRoot 'tools'",
    `  $targetDir = Join-Path $toolRoot '${targetDirName}'`,
    `  $downloadPath = Join-Path $targetDir '${downloadFileName}'`,
    `  $exePath = Join-Path $targetDir '${executable}'`,
    "  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null",
    ...downloadUrlLines,
    "  Write-Host \"[download] $downloadUrl\"",
    "  Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing",
    ...extractionLines,
    "  if (-not (Test-Path -LiteralPath $exePath)) {",
    `    throw 'WinKitBox portable install failed: ${escapePowerShellSingleQuoted(tool.name)} executable not found'`,
    "  }",
    "  $global:LASTEXITCODE = 0",
    "}"
  ].join("\n");
}

function buildInstallerInstallCommand(tool: Tool, options: InstallOptions): string {
  const installer = tool.installer;

  if (!installer) {
    throw new Error(`${tool.name} is not an installer tool.`);
  }

  const targetDirName = escapePowerShellSingleQuoted(installer.targetDirName);
  const fileName = escapePowerShellSingleQuoted(installer.fileName);
  const args = installer.args ?? [];
  const argumentList = args.map((arg) => `'${escapePowerShellSingleQuoted(arg)}'`).join(", ");
  const downloadUrlLines = buildDownloadUrlLines({
    downloadUrl: installer.downloadUrl,
    releaseApiUrl: installer.releaseApiUrl,
    assetPattern: installer.assetPattern
  });
  const startProcessLines =
    args.length > 0
      ? [
          `  $process = Start-Process -FilePath $installerPath -ArgumentList @(${argumentList}) -Wait -PassThru`
        ]
      : ["  $process = Start-Process -FilePath $installerPath -Wait -PassThru"];

  return [
    "& {",
    "  $ErrorActionPreference = 'Stop'",
    "  $ProgressPreference = 'SilentlyContinue'",
    ...buildManagedRootLines(options),
    "  $installerRoot = Join-Path $managedRoot 'installers'",
    `  $targetDir = Join-Path $installerRoot '${targetDirName}'`,
    `  $installerPath = Join-Path $targetDir '${fileName}'`,
    "  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null",
    ...downloadUrlLines,
    "  Write-Host \"[download] $downloadUrl\"",
    "  Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing",
    ...startProcessLines,
    "  if ($null -ne $process.ExitCode -and $process.ExitCode -ne 0) {",
    `    throw 'WinKitBox installer failed: ${escapePowerShellSingleQuoted(tool.name)}'`,
    "  }",
    "  $global:LASTEXITCODE = 0",
    "}"
  ].join("\n");
}

function buildPortableUninstallCommand(tool: Tool, options: InstallOptions): string {
  const portable = tool.portable;

  if (!portable) {
    throw new Error(`${tool.name} is not a portable tool.`);
  }

  const targetDirName = escapePowerShellSingleQuoted(portable.targetDirName);

  return [
    "& {",
    "  $ErrorActionPreference = 'Stop'",
    ...buildManagedRootLines(options),
    "  $toolRoot = Join-Path $managedRoot 'tools'",
    `  $targetDir = Join-Path $toolRoot '${targetDirName}'`,
    "  if (Test-Path -LiteralPath $targetDir) {",
    "    Remove-Item -LiteralPath $targetDir -Recurse -Force",
    "  }",
    "  $global:LASTEXITCODE = 0",
    "}"
  ].join("\n");
}

function buildInstallerUninstallCommand(tool: Tool): string {
  const displayNames = uniqueStrings([tool.name, ...(tool.launch?.startMenuNames ?? [])]);
  const displayNameList = displayNames.map((name) => `'${escapePowerShellSingleQuoted(name)}'`).join(", ");

  return [
    "& {",
    "  $ErrorActionPreference = 'Stop'",
    `  $displayNames = @(${displayNameList})`,
    "  function Find-WinKitBoxUninstallEntry {",
    "    param([string[]]$Names)",
    "    $registryPaths = @(",
    "      'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',",
    "      'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',",
    "      'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'",
    "    )",
    "    foreach ($registryPath in $registryPaths) {",
    "      foreach ($entry in @(Get-ItemProperty -Path $registryPath -ErrorAction SilentlyContinue)) {",
    "        foreach ($name in $Names) {",
    "          if ([string]::IsNullOrWhiteSpace($entry.DisplayName) -or [string]::IsNullOrWhiteSpace($name)) { continue }",
    "          if ($entry.DisplayName -eq $name -or $entry.DisplayName -like \"*$name*\") { return $entry }",
    "        }",
    "      }",
    "    }",
    "    return $null",
    "  }",
    "  $entry = Find-WinKitBoxUninstallEntry -Names $displayNames",
    "  if (-not $entry) {",
    `    throw 'WinKitBox uninstall failed: ${escapePowerShellSingleQuoted(tool.name)} uninstall entry not found'`,
    "  }",
    "  $uninstallString = if (-not [string]::IsNullOrWhiteSpace($entry.QuietUninstallString)) {",
    "    [string]$entry.QuietUninstallString",
    "  } else {",
    "    [string]$entry.UninstallString",
    "  }",
    "  if ([string]::IsNullOrWhiteSpace($uninstallString)) {",
    `    throw 'WinKitBox uninstall failed: ${escapePowerShellSingleQuoted(tool.name)} uninstall command not found'`,
    "  }",
    "  $process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $uninstallString) -Wait -PassThru",
    "  if ($null -ne $process.ExitCode -and $process.ExitCode -ne 0) {",
    `    throw 'WinKitBox uninstall failed: ${escapePowerShellSingleQuoted(tool.name)}'`,
    "  }",
    "  $global:LASTEXITCODE = 0",
    "}"
  ].join("\n");
}

function buildDownloadUrlLines({
  downloadUrl,
  releaseApiUrl,
  assetPattern
}: {
  downloadUrl?: string;
  releaseApiUrl?: string;
  assetPattern?: string;
}): string[] {
  if (downloadUrl) {
    return [`  $downloadUrl = '${escapePowerShellSingleQuoted(downloadUrl)}'`];
  }

  if (!releaseApiUrl || !assetPattern) {
    throw new Error("Release-backed tools need both releaseApiUrl and assetPattern.");
  }

  return [
    "  function Resolve-WinKitBoxReleaseAssetUrl {",
    "    param([string]$ReleaseApiUrl, [string]$AssetPattern)",
    "    $headers = @{ 'User-Agent' = 'WinKitBox' }",
    "    $response = Invoke-RestMethod -Uri $ReleaseApiUrl -Headers $headers",
    "    foreach ($release in @($response)) {",
    "      foreach ($asset in @($release.assets)) {",
    "        if ($asset.name -match $AssetPattern -and -not [string]::IsNullOrWhiteSpace($asset.browser_download_url)) {",
    "          return [string]$asset.browser_download_url",
    "        }",
    "      }",
    "    }",
    "    throw \"WinKitBox install failed: release asset not found for pattern $AssetPattern\"",
    "  }",
    `  $downloadUrl = Resolve-WinKitBoxReleaseAssetUrl -ReleaseApiUrl '${escapePowerShellSingleQuoted(
      releaseApiUrl
    )}' -AssetPattern '${escapePowerShellSingleQuoted(assetPattern)}'`
  ];
}

function buildPortableExtractionLines(
  archive: "zip" | "7z" | undefined,
  sevenZipDownloadUrl?: string
): string[] {
  if (!archive) {
    return [];
  }

  if (archive === "zip") {
    return [
      "  Expand-Archive -LiteralPath $downloadPath -DestinationPath $targetDir -Force",
      "  Remove-Item -LiteralPath $downloadPath -Force -ErrorAction SilentlyContinue"
    ];
  }

  if (archive === "7z") {
    const helperUrl = escapePowerShellSingleQuoted(sevenZipDownloadUrl ?? "https://www.7-zip.org/a/7zr.exe");

    return [
      "  $binRoot = Join-Path $managedRoot 'bin'",
      "  $sevenZipPath = Join-Path $binRoot '7zr.exe'",
      "  New-Item -ItemType Directory -Force -Path $binRoot | Out-Null",
      "  if (-not (Test-Path -LiteralPath $sevenZipPath -PathType Leaf)) {",
      `    Invoke-WebRequest -Uri '${helperUrl}' -OutFile $sevenZipPath -UseBasicParsing`,
      "  }",
      "  & $sevenZipPath x $downloadPath \"-o$targetDir\" -y | Out-Host",
      "  if ($LASTEXITCODE -ne 0) {",
      "    throw 'WinKitBox portable install failed: 7z extraction failed'",
      "  }",
      "  Remove-Item -LiteralPath $downloadPath -Force -ErrorAction SilentlyContinue"
    ];
  }

  throw new Error(`Unsupported portable archive: ${archive}`);
}

export function createInstallPlan(allTools: Tool[], selectedIds: Set<string>, options: InstallOptions = {}): InstallPlan {
  const selectedTools = allTools.filter((tool) => selectedIds.has(tool.id));
  const commands = selectedTools.map((tool) => buildInstallCommand(tool, options));

  return {
    commands,
    readyCount: commands.filter((item) => item.command).length,
    manualCount: commands.filter((item) => item.manualUrl && !item.command).length,
    adminCount: commands.filter((item) => item.requiresAdmin).length,
    highRiskCount: commands.filter((item) => item.risk === "high").length
  };
}

export function createUninstallPlan(allTools: Tool[], selectedIds: Set<string>, options: InstallOptions = {}): InstallPlan {
  const selectedTools = allTools.filter((tool) => selectedIds.has(tool.id));
  const commands = selectedTools.map((tool) => buildUninstallCommand(tool, options));

  return {
    commands,
    readyCount: commands.filter((item) => item.command).length,
    manualCount: commands.filter((item) => item.manualUrl && !item.command).length,
    adminCount: commands.filter((item) => item.requiresAdmin).length,
    highRiskCount: commands.filter((item) => item.risk === "high").length
  };
}

export function buildPowerShellScript(plan: InstallPlan): string {
  const lines = [
    "$ErrorActionPreference = 'Stop'",
    "Write-Host 'WinKitBox install plan started.'",
    `Write-Host '${createRunEventLine({
      type: "plan-start",
      total: plan.commands.filter((item) => item.command).length
    })}'`,
    ""
  ];

  for (const item of plan.commands) {
    if (!item.command) {
      lines.push(
        `Write-Host '${createRunEventLine({
          type: "manual",
          toolId: item.toolId,
          label: item.label
        })}'`
      );
      lines.push(`Write-Host '[manual] ${item.label}: ${item.manualUrl}'`);
      continue;
    }

    lines.push(
      `Write-Host '${createRunEventLine({
        type: "install-start",
        toolId: item.toolId,
        label: item.label
      })}'`
    );
    lines.push(`Write-Host '[install] ${item.label}'`);
    lines.push(item.command);
    lines.push("if ($LASTEXITCODE -ne 0) {");
    lines.push(
      `  Write-Host '${createRunEventLine({
        type: "install-failed",
        toolId: item.toolId,
        label: item.label
      })}'`
    );
    lines.push(`  throw 'WinKitBox install failed: ${escapePowerShellSingleQuoted(item.label)}'`);
    lines.push("}");
    lines.push(
      `Write-Host '${createRunEventLine({
        type: "install-success",
        toolId: item.toolId,
        label: item.label
      })}'`
    );
    lines.push("");
  }

  lines.push(`Write-Host '${createRunEventLine({ type: "plan-complete" })}'`);
  lines.push("Write-Host 'WinKitBox install plan finished.'");
  return lines.join("\n");
}

export function buildUninstallPowerShellScript(plan: InstallPlan): string {
  const lines = [
    "$ErrorActionPreference = 'Stop'",
    "Write-Host 'WinKitBox uninstall plan started.'",
    `Write-Host '${createRunEventLine({
      type: "plan-start",
      total: plan.commands.filter((item) => item.command).length,
      action: "uninstall"
    })}'`,
    ""
  ];

  for (const item of plan.commands) {
    if (!item.command) {
      lines.push(
        `Write-Host '${createRunEventLine({
          type: "manual",
          toolId: item.toolId,
          label: item.label
        })}'`
      );
      lines.push(`Write-Host '[manual] ${item.label}: ${item.manualUrl}'`);
      continue;
    }

    lines.push(
      `Write-Host '${createRunEventLine({
        type: "uninstall-start",
        toolId: item.toolId,
        label: item.label
      })}'`
    );
    lines.push(`Write-Host '[uninstall] ${item.label}'`);
    lines.push(item.command);
    lines.push("if ($LASTEXITCODE -ne 0) {");
    lines.push(
      `  Write-Host '${createRunEventLine({
        type: "uninstall-failed",
        toolId: item.toolId,
        label: item.label
      })}'`
    );
    lines.push(`  throw 'WinKitBox uninstall failed: ${escapePowerShellSingleQuoted(item.label)}'`);
    lines.push("}");
    lines.push(
      `Write-Host '${createRunEventLine({
        type: "uninstall-success",
        toolId: item.toolId,
        label: item.label
      })}'`
    );
    lines.push("");
  }

  lines.push(`Write-Host '${createRunEventLine({ type: "plan-complete" })}'`);
  lines.push("Write-Host 'WinKitBox uninstall plan finished.'");
  return lines.join("\n");
}

function escapePowerShellSingleQuoted(value: string) {
  return value.replace(/'/g, "''");
}

function buildManagedRootLines(options: InstallOptions): string[] {
  const managedRootPath = options.managedRootPath?.trim();

  if (managedRootPath) {
    return [
      `  $managedRoot = [Environment]::ExpandEnvironmentVariables('${escapePowerShellSingleQuoted(managedRootPath)}')`
    ];
  }

  return ["  $managedRoot = Join-Path $env:LOCALAPPDATA 'WinKitBox'"];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

export function searchTools(allTools: Tool[], query: string): Tool[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return allTools;
  }

  return allTools.filter((tool) => {
    const haystack = [
      tool.name,
      tool.summary,
      tool.description,
      tool.license,
      tool.source,
      ...tool.tags
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function getDefaultSelection(allTools: Tool[]): Set<string> {
  return new Set(allTools.filter((tool) => tool.defaultSelected).map((tool) => tool.id));
}
