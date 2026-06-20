import type { Tool } from "./catalog";
import {
  buildInstallCommand,
  type InstallCommand,
  type InstallOptions,
} from "./planner";

export type ToolUpdateStrategy = "winget" | "reinstall" | "manual" | "none";

export type ToolUpdateCheckStatus =
  | "unknown"
  | "available"
  | "current"
  | "reinstall"
  | "skipped"
  | "not-installed";

export type ToolUpdateCheckResult = {
  toolId: string;
  status: ToolUpdateCheckStatus;
  strategy: ToolUpdateStrategy;
  currentVersion?: string;
  latestVersion?: string;
  releaseUrl?: string;
  message: string;
};

export type ToolUpdateDescriptor = {
  id: string;
  name: string;
  strategy: ToolUpdateStrategy;
  wingetId?: string;
  releaseApiUrl?: string;
  homepage: string;
  collectionOnly?: boolean;
};

export function getToolUpdateStrategy(tool: Tool): ToolUpdateStrategy {
  if (tool.collectionOnly) {
    return "none";
  }

  if (tool.wingetId) {
    return "winget";
  }

  if (tool.customInstallCommand || tool.portable || tool.installer) {
    return "reinstall";
  }

  return "manual";
}

export function buildToolUpdateCommand(
  tool: Tool,
  options: InstallOptions = {},
): InstallCommand {
  const base = {
    toolId: tool.id,
    label: tool.name,
    source: tool.source,
    requiresAdmin: Boolean(tool.requiresAdmin),
    risk: tool.risk,
  };

  if (tool.collectionOnly) {
    return {
      ...base,
      skipReason: "只收纳到工具箱，不由 WinKitBox 更新。",
    };
  }

  if (tool.customUpdateCommand) {
    return {
      ...base,
      command: tool.customUpdateCommand,
    };
  }

  if (tool.wingetId) {
    return {
      ...base,
      command: `winget upgrade --id ${tool.wingetId} --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity --silent`,
    };
  }

  if (tool.customInstallCommand || tool.portable || tool.installer) {
    return buildInstallCommand(tool, options);
  }

  return {
    ...base,
    manualUrl: tool.repoUrl ?? tool.homepage,
  };
}

export function createToolUpdateDescriptors(tools: readonly Tool[]): ToolUpdateDescriptor[] {
  return tools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    strategy: getToolUpdateStrategy(tool),
    wingetId: tool.wingetId,
    releaseApiUrl: tool.portable?.releaseApiUrl ?? tool.installer?.releaseApiUrl,
    homepage: tool.repoUrl ?? tool.homepage,
    collectionOnly: tool.collectionOnly,
  }));
}
