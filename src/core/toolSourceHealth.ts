import type { Tool } from "./catalog";
import type { ToolUpdateStrategy } from "./toolUpdates";
import { getToolUpdateStrategy } from "./toolUpdates";

export type ToolSourceKind =
  | "winget"
  | "github-release"
  | "direct-download"
  | "local"
  | "custom-command"
  | "collection"
  | "manual";

export type ToolSourceHealthStatus =
  | "healthy"
  | "warning"
  | "broken"
  | "skipped"
  | "unknown";

export type ToolSourceHealthDescriptor = {
  id: string;
  name: string;
  kind: ToolSourceKind;
  updateStrategy: ToolUpdateStrategy;
  wingetId?: string;
  url?: string;
  releaseApiUrl?: string;
  assetPattern?: string;
  checksum?: string;
  homepage: string;
};

export type ToolSourceHealthResult = {
  toolId: string;
  name: string;
  status: ToolSourceHealthStatus;
  kind: ToolSourceKind;
  message: string;
  checkedUrl?: string;
  checksum?: string;
  httpStatus?: number;
  contentType?: string;
};

export type ToolSourceHealthSummary = {
  total: number;
  healthy: number;
  warning: number;
  broken: number;
  skipped: number;
  unknown: number;
};

export function createToolSourceHealthDescriptors(
  tools: readonly Tool[],
): ToolSourceHealthDescriptor[] {
  return tools.map((tool) => {
    const source = getToolSourceDescriptor(tool);

    return {
      id: tool.id,
      name: tool.name,
      updateStrategy: getToolUpdateStrategy(tool),
      homepage: tool.repoUrl ?? tool.homepage,
      ...source,
    };
  });
}

export function getToolSourceKindLabel(kind: ToolSourceKind) {
  const labels: Record<ToolSourceKind, string> = {
    winget: "winget",
    "github-release": "GitHub Release",
    "direct-download": "直链下载",
    local: "本地文件",
    "custom-command": "自定义命令",
    collection: "只收纳",
    manual: "手动来源",
  };

  return labels[kind];
}

export function getToolUpdateStrategyLabel(strategy: ToolUpdateStrategy) {
  const labels: Record<ToolUpdateStrategy, string> = {
    winget: "winget 精确更新",
    reinstall: "重装刷新",
    manual: "手动更新",
    none: "不由 WinKitBox 更新",
  };

  return labels[strategy];
}

export function getToolUpdateStrategyDescription(strategy: ToolUpdateStrategy) {
  const descriptions: Record<ToolUpdateStrategy, string> = {
    winget: "检测读取本机和源版本，更新时执行 winget 更新命令。",
    reinstall: "无法稳定读取当前版本，更新时重新从配置来源安装。",
    manual: "没有可靠自动更新来源，保留来源入口供手动处理。",
    none: "该工具只加入工具箱，不执行安装或更新。",
  };

  return descriptions[strategy];
}

export function summarizeToolSourceHealth(
  results: readonly ToolSourceHealthResult[],
): ToolSourceHealthSummary {
  const summary: ToolSourceHealthSummary = {
    total: results.length,
    healthy: 0,
    warning: 0,
    broken: 0,
    skipped: 0,
    unknown: 0,
  };

  for (const result of results) {
    summary[result.status] += 1;
  }

  return summary;
}

function getToolSourceDescriptor(
  tool: Tool,
): Omit<ToolSourceHealthDescriptor, "id" | "name" | "updateStrategy" | "homepage"> {
  if (tool.collectionOnly) {
    return { kind: "collection" };
  }

  if (tool.wingetId) {
    return {
      kind: "winget",
      wingetId: tool.wingetId,
    };
  }

  const releaseApiUrl = tool.portable?.releaseApiUrl ?? tool.installer?.releaseApiUrl;
  if (releaseApiUrl) {
    return {
      kind: "github-release",
      releaseApiUrl,
      assetPattern: tool.portable?.assetPattern ?? tool.installer?.assetPattern,
      checksum: tool.portable?.sha256 ?? tool.installer?.sha256,
    };
  }

  const directUrl = tool.portable?.downloadUrl ?? tool.installer?.downloadUrl;
  if (directUrl) {
    return {
      kind: "direct-download",
      url: directUrl,
      checksum: tool.portable?.sha256 ?? tool.installer?.sha256,
    };
  }

  if (tool.localSource) {
    return { kind: "local" };
  }

  if (tool.customInstallCommand || tool.customUninstallCommand || tool.customUpdateCommand) {
    return { kind: "custom-command" };
  }

  return { kind: "manual" };
}
