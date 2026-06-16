import { type RiskLevel, type Tool, type ToolCategory } from "./catalog";

export type AiInstallType = "winget" | "installer" | "portable";

export type AiToolCandidate = {
  name: string;
  category?: ToolCategory;
  summary?: string;
  description?: string;
  license?: string;
  tags?: string[];
  risk?: RiskLevel;
  install: {
    type: AiInstallType;
    wingetId?: string;
    assetPattern?: string;
    archive?: "zip" | "7z";
    executable?: string;
    fileName?: string;
  };
  launch?: {
    startMenuNames?: string[];
    commands?: string[];
  };
};

export type AiToolGitHubContext = {
  owner: string;
  repo: string;
  htmlUrl: string;
  releaseApiUrl: string;
  stars?: number;
  license?: string;
};

const validCategories: ToolCategory[] = [
  "starter",
  "system",
  "files",
  "capture",
  "cleanup",
  "desktop",
  "network",
  "rescue",
  "ai",
  "ime"
];

export function createAiGeneratedTool(
  candidate: AiToolCandidate,
  context: AiToolGitHubContext,
  existingIds: Set<string>
): Tool {
  const name = String(candidate.name || context.repo).trim();
  if (!name) {
    throw new Error("AI 没有生成有效工具名称。");
  }

  const installType = candidate.install?.type;
  const id = uniqueId(`ai-${slugify(name) || slugify(context.repo) || "tool"}`, existingIds);
  const targetDirName = id.replace(/^ai-/, "");
  const category = validCategories.includes(candidate.category as ToolCategory)
    ? (candidate.category as ToolCategory)
    : "starter";
  const launchCommands = candidate.launch?.commands?.map(String).filter(Boolean) ?? [];
  const startMenuNames = uniqueStrings([name, ...(candidate.launch?.startMenuNames ?? []).map(String)]);

  const baseTool: Tool = {
    id,
    name,
    category,
    summary: String(candidate.summary || "AI 添加的 GitHub 工具").slice(0, 80),
    description: String(candidate.description || "由 AI 根据 GitHub 仓库信息生成的自定义工具。").slice(0, 180),
    source: installType === "winget" ? "winget" : "github",
    license: String(candidate.license || context.license || "Unknown"),
    stars: context.stars,
    homepage: context.htmlUrl,
    repoUrl: context.htmlUrl,
    tags: uniqueStrings([...(candidate.tags ?? []).map(String), "AI添加"]),
    risk: candidate.risk ?? "medium",
    launch: {
      startMenuNames,
      commands: launchCommands
    }
  };

  if (installType === "winget") {
    const wingetId = candidate.install.wingetId?.trim();
    if (!wingetId) {
      throw new Error("AI 选择了 winget 安装，但没有给出 winget ID。");
    }

    return {
      ...baseTool,
      source: "winget",
      wingetId
    };
  }

  if (installType === "installer") {
    const assetPattern = candidate.install.assetPattern?.trim();
    if (!assetPattern) {
      throw new Error("AI 选择了安装包，但没有给出发行版资产匹配规则。");
    }

    return {
      ...baseTool,
      installer: {
        releaseApiUrl: context.releaseApiUrl,
        assetPattern,
        targetDirName,
        fileName: candidate.install.fileName?.trim() || `${targetDirName}-setup.exe`
      }
    };
  }

  if (installType === "portable") {
    const assetPattern = candidate.install.assetPattern?.trim();
    const executable = candidate.install.executable?.trim();
    if (!assetPattern || !executable) {
      throw new Error("AI 选择了便携安装，但没有给出资产匹配规则或启动程序名。");
    }

    return {
      ...baseTool,
      portable: {
        releaseApiUrl: context.releaseApiUrl,
        assetPattern,
        targetDirName,
        archive: candidate.install.archive ?? "zip",
        executable
      }
    };
  }

  throw new Error("AI 没有给出可直接安装的方式。");
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

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
