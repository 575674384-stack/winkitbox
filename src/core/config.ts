import type { CategoryDefinition, Tool, ToolCategory } from "./catalog";
import { normalizeCategoryDefinitions } from "./catalog";
import { isThemeId, type ThemeId } from "./themes";

const allowedProxyModes = new Set(["system", "direct", "manual"]);

function normalizeProxyMode(value: string): "system" | "direct" | "manual" | undefined {
  return allowedProxyModes.has(value) ? (value as "system" | "direct" | "manual") : undefined;
}

export type WinKitBoxExportConfig = {
  version: 1;
  exportedAt: string;
  settings: {
    toolRootPath: string;
    updateOnStartup: boolean;
    themeId?: ThemeId;
    proxyMode?: "system" | "direct" | "manual";
    proxyManual?: string;
  };
  selectedToolIds: string[];
  customTools: Tool[];
  customCategories?: CategoryDefinition[];
};

export type CustomToolInput = {
  mode?: "winget" | "local" | "command";
  name: string;
  category: ToolCategory;
  homepage: string;
  installCommand?: string;
  uninstallCommand?: string;
  launchCommand?: string;
  wingetId?: string;
  localPath?: string;
};

const maxExportBytes = 1024 * 1024;

export function createCustomTool(input: CustomToolInput, existingIds: Set<string>): Tool {
  const name = input.name.trim();

  if (!name) {
    throw new Error("工具名称不能为空。");
  }

  const baseId = `custom-${slugify(name) || "tool"}`;
  const id = uniqueId(baseId, existingIds);
  const homepage = input.homepage.trim() || "https://github.com";
  const launchCommand = input.launchCommand?.trim();
  const mode = input.mode ?? "command";

  if (mode === "winget") {
    const wingetId = input.wingetId?.trim();

    if (!wingetId) {
      throw new Error("winget ID 不能为空。");
    }

    return {
      id,
      name,
      category: input.category,
      summary: "自定义 winget 工具",
      description: "用户自行添加的 winget 软件，会自动生成安装和卸载命令。",
      source: "winget",
      license: "Custom",
      homepage,
      wingetId,
      launch: {
        startMenuNames: [name],
        commands: launchCommand ? [launchCommand] : []
      },
      tags: ["自定义", "winget"],
      risk: "medium"
    };
  }

  if (mode === "local") {
    const localPath = input.localPath?.trim();

    if (!localPath) {
      throw new Error("本地程序路径不能为空。");
    }

    const escapedPath = escapePowerShellSingleQuoted(localPath);

    return {
      id,
      name,
      category: input.category,
      summary: "自定义本地程序",
      description: "用户自行登记的本地程序，可直接从工具箱打开。",
      source: "custom",
      license: "Local",
      homepage,
      customInstallCommand: `& { if (-not (Test-Path -LiteralPath '${escapedPath}' -PathType Leaf)) { throw 'WinKitBox local tool not found: ${escapedPath}' }; $global:LASTEXITCODE = 0 }`,
      launch: {
        startMenuNames: [name],
        commands: [localPath]
      },
      tags: ["自定义", "本地"],
      risk: "medium"
    };
  }

  const installCommand = input.installCommand?.trim();

  if (!installCommand) {
    throw new Error("安装命令不能为空。");
  }

  return {
    id,
    name,
    category: input.category,
    summary: "自定义工具",
    description: "用户自行添加的工具，会按填写的安装命令执行。",
    source: "custom",
    license: "Custom",
    homepage,
    customInstallCommand: installCommand,
    customUninstallCommand: input.uninstallCommand?.trim() || undefined,
    launch: launchCommand
      ? {
          startMenuNames: [name],
          commands: [launchCommand]
        }
      : {
          startMenuNames: [name],
          commands: []
        },
    tags: ["自定义"],
    risk: "medium"
  };
}

function escapePowerShellSingleQuoted(value: string) {
  return value.replace(/'/g, "''");
}

export function buildExportConfig(config: WinKitBoxExportConfig) {
  const payload = JSON.stringify(config, null, 2);

  if (new Blob([payload]).size > maxExportBytes) {
    throw new Error("导出配置超过 1MB，请减少自定义工具数量或说明文本。");
  }

  return payload;
}

export function parseImportedConfig(text: string): WinKitBoxExportConfig {
  const parsed = JSON.parse(text) as Partial<WinKitBoxExportConfig>;

  if (parsed.version !== 1 || !parsed.settings || !Array.isArray(parsed.customTools)) {
    throw new Error("这不是有效的 WinKitBox 配置文件。");
  }

  return {
    version: 1,
    exportedAt: String(parsed.exportedAt || new Date().toISOString()),
    settings: {
      toolRootPath: String(parsed.settings.toolRootPath || ""),
      updateOnStartup: parsed.settings.updateOnStartup !== false,
      themeId: isThemeId(String(parsed.settings.themeId || "")) ? parsed.settings.themeId : undefined,
      proxyMode: normalizeProxyMode(String(parsed.settings.proxyMode || "")),
      proxyManual: String(parsed.settings.proxyManual || "").trim() || undefined
    },
    selectedToolIds: Array.isArray(parsed.selectedToolIds) ? parsed.selectedToolIds.map(String) : [],
    customTools: parsed.customTools.slice(0, 200).filter(isLikelyTool),
    customCategories: normalizeCategoryDefinitions((parsed as { customCategories?: unknown }).customCategories)
  };
}

function isLikelyTool(tool: unknown): tool is Tool {
  return (
    typeof tool === "object" &&
    tool !== null &&
    typeof (tool as Tool).id === "string" &&
    typeof (tool as Tool).name === "string" &&
    typeof (tool as Tool).category === "string"
  );
}

function uniqueId(baseId: string, existingIds: Set<string>) {
  let id = baseId;
  let suffix = 2;

  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return id;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
