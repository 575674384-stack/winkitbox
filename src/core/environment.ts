export type EnvironmentSnapshot = {
  wingetAvailable: boolean;
  wingetVersion?: string;
  powershellVersion?: string;
  dotnetRuntimes: string[];
  dotnetDesktopRuntimes?: string[];
  vcredistInstalled: boolean;
  longPathsEnabled: boolean;
  utf8BetaEnabled: boolean;
};

export type EnvironmentCheck = {
  id: "winget" | "powershell" | "dotnet" | "vcredist" | "long-paths" | "utf8";
  label: string;
  status: "ok" | "warning" | "danger";
  detail: string;
  action?: string;
};

export function createEnvironmentChecks(snapshot: EnvironmentSnapshot): EnvironmentCheck[] {
  const desktopRuntimeVersions = getDotnetDesktopRuntimeVersions(snapshot);

  return [
    {
      id: "winget",
      label: "winget 软件包管理器",
      status: snapshot.wingetAvailable ? "ok" : "danger",
      detail: snapshot.wingetAvailable
        ? `可用${snapshot.wingetVersion ? ` · ${snapshot.wingetVersion}` : ""}`
        : "不可用，安装和更新中心会受到影响。",
      action: snapshot.wingetAvailable ? undefined : "建议安装或修复 App Installer",
    },
    {
      id: "powershell",
      label: "Windows PowerShell",
      status: snapshot.powershellVersion ? "ok" : "danger",
      detail: snapshot.powershellVersion
        ? `版本 ${snapshot.powershellVersion}`
        : "无法读取 PowerShell 版本，脚本执行可能异常。",
    },
    {
      id: "dotnet",
      label: ".NET Desktop Runtime",
      status: desktopRuntimeVersions.length > 0 ? "ok" : "warning",
      detail:
        desktopRuntimeVersions.length > 0
          ? `已检测到 ${formatRuntimeVersionList(desktopRuntimeVersions)}`
          : "未检测到 Windows Desktop Runtime，部分桌面工具可能无法启动。",
      action: desktopRuntimeVersions.length > 0 ? undefined : "需要时安装 .NET Desktop Runtime",
    },
    {
      id: "vcredist",
      label: "VC++ 运行库",
      status: snapshot.vcredistInstalled ? "ok" : "warning",
      detail: snapshot.vcredistInstalled
        ? "已检测到 Microsoft Visual C++ Redistributable。"
        : "未检测到常见 VC++ 2015-2022 运行库。",
      action: snapshot.vcredistInstalled ? undefined : "需要时安装 VC++ 2015-2022",
    },
    {
      id: "long-paths",
      label: "Windows 长路径",
      status: snapshot.longPathsEnabled ? "ok" : "warning",
      detail: snapshot.longPathsEnabled
        ? "已开启，深层目录解压更稳。"
        : "未开启，深层 ZIP 解压或开发工具可能遇到路径过长。",
      action: snapshot.longPathsEnabled ? undefined : "可通过注册表或组策略开启",
    },
    {
      id: "utf8",
      label: "UTF-8 beta",
      status: snapshot.utf8BetaEnabled ? "ok" : "warning",
      detail: snapshot.utf8BetaEnabled
        ? "已开启。"
        : "未开启，跨语言软件遇到乱码时可以尝试开启。",
      action: "可在本页一键切换",
    },
  ];
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
