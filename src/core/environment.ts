export type EnvironmentSnapshot = {
  wingetAvailable: boolean;
  wingetVersion?: string;
  powershellVersion?: string;
  dotnetRuntimes: string[];
  dotnetDesktopRuntimes?: string[];
  vcredistInstalled: boolean;
  webView2Installed?: boolean;
  longPathsEnabled: boolean;
  utf8BetaEnabled: boolean;
};

export type EnvironmentCheckId =
  | "winget"
  | "powershell"
  | "dotnet"
  | "vcredist"
  | "webview2"
  | "long-paths"
  | "utf8";

export type EnvironmentRepairAction = {
  id: string;
  checkId: EnvironmentCheckId;
  kind: "powershell" | "url" | "utf8";
  label: string;
  description: string;
  command?: string;
  url?: string;
  requiresAdmin?: boolean;
  recommended: boolean;
  disabledReason?: string;
};

export type EnvironmentCheck = {
  id: EnvironmentCheckId;
  label: string;
  status: "ok" | "warning" | "danger";
  detail: string;
  impact: string[];
  action?: string;
  repair?: EnvironmentRepairAction;
};

export type EnvironmentHealthSummary = {
  total: number;
  ok: number;
  warning: number;
  danger: number;
  score: number;
  recommendedRepairCount: number;
};

export function createEnvironmentChecks(snapshot: EnvironmentSnapshot): EnvironmentCheck[] {
  const desktopRuntimeVersions = getDotnetDesktopRuntimeVersions(snapshot);
  const wingetAvailable = Boolean(snapshot.wingetAvailable);

  return [
    {
      id: "winget",
      label: "winget 软件包管理器",
      status: wingetAvailable ? "ok" : "danger",
      impact: ["工具安装", "工具更新中心", "部分环境修复"],
      detail: wingetAvailable
        ? `可用${snapshot.wingetVersion ? ` · ${snapshot.wingetVersion}` : ""}`
        : "不可用，安装和更新中心会受到影响。",
      action: wingetAvailable ? undefined : "建议安装或修复 App Installer",
      repair: wingetAvailable
        ? undefined
        : {
            id: "open-app-installer",
            checkId: "winget",
            kind: "url",
            label: "打开 App Installer",
            description: "跳转到 Microsoft Store 的 App Installer 页面，安装后重新刷新体检。",
            url: "ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1",
            recommended: false,
          },
    },
    {
      id: "powershell",
      label: "Windows PowerShell",
      status: snapshot.powershellVersion ? "ok" : "danger",
      impact: ["安装脚本执行", "卸载脚本执行", "系统修复操作"],
      detail: snapshot.powershellVersion
        ? `版本 ${snapshot.powershellVersion}`
        : "无法读取 PowerShell 版本，脚本执行可能异常。",
    },
    {
      id: "dotnet",
      label: ".NET Desktop Runtime",
      status: desktopRuntimeVersions.length > 0 ? "ok" : "warning",
      impact: ["WPF/WinForms 桌面工具启动", "部分系统工具运行"],
      detail:
        desktopRuntimeVersions.length > 0
          ? `已检测到 ${formatRuntimeVersionList(desktopRuntimeVersions)}`
          : "未检测到 Windows Desktop Runtime，部分桌面工具可能无法启动。",
      action: desktopRuntimeVersions.length > 0 ? undefined : "需要时安装 .NET Desktop Runtime",
      repair:
        desktopRuntimeVersions.length > 0
          ? undefined
          : createWingetInstallRepair({
              checkId: "dotnet",
              id: "install-dotnet-desktop-runtime",
              label: "安装 .NET Desktop Runtime",
              description: "安装 .NET 8 Desktop Runtime，常见 WPF/WinForms 工具会用到它。",
              wingetId: "Microsoft.DotNet.DesktopRuntime.8",
              wingetAvailable,
            }),
    },
    {
      id: "vcredist",
      label: "VC++ 运行库",
      status: snapshot.vcredistInstalled ? "ok" : "warning",
      impact: ["C/C++ 桌面工具启动", "游戏和图形工具运行"],
      detail: snapshot.vcredistInstalled
        ? "已检测到 Microsoft Visual C++ Redistributable。"
        : "未检测到常见 VC++ 2015-2022 运行库。",
      action: snapshot.vcredistInstalled ? undefined : "需要时安装 VC++ 2015-2022",
      repair: snapshot.vcredistInstalled
        ? undefined
        : createWingetInstallRepair({
            checkId: "vcredist",
            id: "install-vcredist",
            label: "安装 VC++ 运行库",
            description: "安装 Microsoft Visual C++ 2015-2022 Redistributable x64。",
            wingetId: "Microsoft.VCRedist.2015+.x64",
            wingetAvailable,
          }),
    },
    {
      id: "webview2",
      label: "WebView2 Runtime",
      status: snapshot.webView2Installed ? "ok" : "warning",
      impact: ["网页壳桌面应用", "Electron 辅助组件"],
      detail: snapshot.webView2Installed
        ? "已检测到 Microsoft Edge WebView2 Runtime。"
        : "未检测到 WebView2 Runtime，部分 Electron/网页壳工具可能无法启动。",
      action: snapshot.webView2Installed ? undefined : "需要时安装 WebView2 Runtime",
      repair: snapshot.webView2Installed
        ? undefined
        : createWingetInstallRepair({
            checkId: "webview2",
            id: "install-webview2",
            label: "安装 WebView2",
            description: "安装 Microsoft Edge WebView2 Runtime，常见桌面网页组件会用到它。",
            wingetId: "Microsoft.EdgeWebView2Runtime",
            wingetAvailable,
          }),
    },
    {
      id: "long-paths",
      label: "Windows 长路径",
      status: snapshot.longPathsEnabled ? "ok" : "warning",
      impact: ["ZIP 解压", "开发工具", "深层目录软件"],
      detail: snapshot.longPathsEnabled
        ? "已开启，深层目录解压更稳。"
        : "未开启，深层 ZIP 解压或开发工具可能遇到路径过长。",
      action: snapshot.longPathsEnabled ? undefined : "可通过注册表或组策略开启",
      repair: snapshot.longPathsEnabled
        ? undefined
        : {
            id: "enable-long-paths",
            checkId: "long-paths",
            kind: "powershell",
            label: "开启长路径",
            description: "写入系统注册表，减少深层目录解压和开发工具路径过长问题。",
            command: buildEnableLongPathsCommand(),
            requiresAdmin: true,
            recommended: true,
          },
    },
    {
      id: "utf8",
      label: "UTF-8 beta",
      status: snapshot.utf8BetaEnabled ? "ok" : "warning",
      impact: ["跨语言软件乱码", "旧版非 Unicode 程序"],
      detail: snapshot.utf8BetaEnabled
        ? "已开启。"
        : "未开启，跨语言软件遇到乱码时可以尝试开启。",
      action: "可在本页一键切换",
      repair: snapshot.utf8BetaEnabled
        ? undefined
        : {
            id: "enable-utf8-beta",
            checkId: "utf8",
            kind: "utf8",
            label: "开启 UTF-8",
            description: "开启 Windows UTF-8 beta，需要重启后生效。只在确实遇到乱码时建议使用。",
            requiresAdmin: true,
            recommended: false,
          },
    },
  ];
}

export function getRecommendedEnvironmentRepairs(
  checks: readonly EnvironmentCheck[],
): EnvironmentRepairAction[] {
  return checks
    .map((check) => check.repair)
    .filter(
      (repair): repair is EnvironmentRepairAction =>
        Boolean(repair?.recommended && !repair.disabledReason),
    );
}

export function createEnvironmentHealthSummary(
  checks: readonly EnvironmentCheck[],
): EnvironmentHealthSummary {
  const total = checks.length;
  const ok = checks.filter((check) => check.status === "ok").length;
  const warning = checks.filter((check) => check.status === "warning").length;
  const danger = checks.filter((check) => check.status === "danger").length;
  const recommendedRepairCount = getRecommendedEnvironmentRepairs(checks).length;
  const score = Math.max(0, Math.round(100 - warning * 10 - danger * 24));

  return {
    total,
    ok,
    warning,
    danger,
    score,
    recommendedRepairCount,
  };
}

function createWingetInstallRepair({
  checkId,
  id,
  label,
  description,
  wingetId,
  wingetAvailable,
}: {
  checkId: EnvironmentCheckId;
  id: string;
  label: string;
  description: string;
  wingetId: string;
  wingetAvailable: boolean;
}): EnvironmentRepairAction {
  const command = `winget install --id ${wingetId} --source winget --exact --accept-package-agreements --accept-source-agreements`;

  return {
    id,
    checkId,
    kind: "powershell",
    label,
    description,
    command,
    recommended: wingetAvailable,
    disabledReason: wingetAvailable ? undefined : "需要先修复 winget。",
  };
}

function buildEnableLongPathsCommand() {
  return `$repairScript = "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem' -Name LongPathsEnabled -Type DWord -Value 1"
Start-Process -FilePath powershell.exe -Verb RunAs -Wait -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $repairScript)`;
}

function getDotnetDesktopRuntimeVersions(snapshot: EnvironmentSnapshot): string[] {
  const runtimeLines =
    snapshot.dotnetDesktopRuntimes && snapshot.dotnetDesktopRuntimes.length > 0
      ? snapshot.dotnetDesktopRuntimes
      : snapshot.dotnetRuntimes.filter(isDotnetDesktopRuntimeLine);

  return runtimeLines
    .map(parseDotnetRuntimeVersion)
    .filter((version): version is string => Boolean(version));
}

function isDotnetDesktopRuntimeLine(value: string) {
  return /^Microsoft\.WindowsDesktop\.App\s+/i.test(value.trim());
}

function parseDotnetRuntimeVersion(value: string) {
  const line = value.trim();
  const match = line.match(/^Microsoft\.WindowsDesktop\.App\s+([^\s]+)/i);

  if (match?.[1]) {
    return match[1];
  }

  return /^\d+(?:\.\d+){1,3}/.test(line) ? line.split(/\s+/)[0] : undefined;
}

function formatRuntimeVersionList(versions: string[]) {
  const visible = versions.slice(0, 3);
  const suffix = versions.length > visible.length ? ` 等 ${versions.length} 个版本` : "";

  return `${visible.join("、")}${suffix}`;
}
