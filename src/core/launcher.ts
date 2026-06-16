import type { Tool } from "./catalog";

export type LaunchDescriptor = {
  toolId: string;
  label: string;
  wingetId?: string;
  appUserModelIds: string[];
  startMenuNames: string[];
  commands: string[];
  homepage: string;
};

export type LaunchOptions = {
  managedRootPath?: string;
};

export function createLaunchDescriptor(tool: Tool, options: LaunchOptions = {}): LaunchDescriptor {
  const portableCommand = tool.portable
    ? [`${getManagedRootPath(options)}\\tools\\${tool.portable.targetDirName}\\${normalizeWindowsPath(tool.portable.executable)}`]
    : [];

  return {
    toolId: tool.id,
    label: tool.name,
    wingetId: tool.wingetId,
    appUserModelIds: tool.launch?.appUserModelIds ?? [],
    startMenuNames: tool.launch?.startMenuNames ?? [tool.name],
    commands: [...portableCommand, ...(tool.launch?.commands ?? [])],
    homepage: tool.homepage
  };
}

function getManagedRootPath(options: LaunchOptions) {
  const customPath = options.managedRootPath?.trim();
  return normalizeWindowsPath(customPath ? trimTrailingSlashes(customPath) : "%LOCALAPPDATA%\\WinKitBox");
}

function normalizeWindowsPath(value: string) {
  return value.replace(/\//g, "\\");
}

function trimTrailingSlashes(value: string) {
  return value.replace(/[\\/]+$/g, "");
}

export function getToolLogoUrl(tool: Tool): string | undefined {
  if (tool.logoUrl) {
    return tool.logoUrl;
  }

  if (tool.repoUrl) {
    try {
      const repoUrl = new URL(tool.repoUrl);
      const [, owner] = repoUrl.pathname.split("/");
      const homepageHost = new URL(tool.homepage).hostname;

      if (repoUrl.hostname === "github.com" && owner && homepageHost === "github.com") {
        return `https://github.com/${owner}.png?size=64`;
      }
    } catch {
      return undefined;
    }
  }

  try {
    const url = new URL(tool.homepage);
    return `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`;
  } catch {
    return undefined;
  }
}
