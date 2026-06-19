import { customAddCategoryId, type ToolCategory } from "./catalog";
import type { CustomToolInput } from "./config";

export type AddToolMode = NonNullable<CustomToolInput["mode"]>;

export type AddToolDraft = {
  mode: AddToolMode;
  name: string;
  categoryId: ToolCategory;
  homepage: string;
  sourceUrl: string;
  localPath: string;
  archiveExecutable: string;
  installCommand: string;
  uninstallCommand: string;
  launchCommand: string;
  wingetId: string;
  aiExplanation: string;
};

export function createDefaultAddToolDraft(
  categoryId: ToolCategory = customAddCategoryId,
): AddToolDraft {
  return {
    mode: "collect",
    name: "",
    categoryId,
    homepage: "",
    sourceUrl: "",
    localPath: "",
    archiveExecutable: "",
    installCommand: "",
    uninstallCommand: "",
    launchCommand: "",
    wingetId: "",
    aiExplanation: "",
  };
}

export function inferAddToolDraftFromLocalPath(filePath: string): AddToolDraft {
  const name = inferToolNameFromPath(filePath);
  const extension = getFileExtension(filePath);
  const base = createDefaultAddToolDraft();

  if (extension === "msi") {
    return {
      ...base,
      mode: "local-installer",
      name,
      localPath: filePath,
      aiExplanation: "已识别为本地 MSI 安装包，安装时会启动该文件。",
    };
  }

  if (extension === "zip") {
    return {
      ...base,
      mode: "local-archive",
      name,
      localPath: filePath,
      aiExplanation: "已识别为 ZIP 便携包，AI 可继续判断 ZIP 里的启动程序。",
    };
  }

  if (extension === "exe") {
    return {
      ...base,
      mode: "collect",
      name,
      localPath: filePath,
      launchCommand: filePath,
      aiExplanation: "已按可直接打开的本地程序处理，只加入工具箱。",
    };
  }

  if (["lnk", "bat", "cmd", "ps1"].includes(extension)) {
    return {
      ...base,
      mode: "collect",
      name,
      localPath: filePath,
      launchCommand: filePath,
      aiExplanation: "已按快捷方式或脚本处理，只加入工具箱用于打开。",
    };
  }

  return {
    ...base,
    mode: "collect",
    name,
    localPath: filePath,
    launchCommand: filePath,
    aiExplanation: "已按本地文件处理，只加入工具箱用于打开。",
  };
}

export function updateAddToolDraftFromSourceUrl(
  draft: AddToolDraft,
  sourceUrl: string,
): AddToolDraft {
  const normalized = sourceUrl.trim();
  return {
    ...draft,
    sourceUrl: normalized,
    homepage: normalized,
    name: draft.name || inferToolNameFromUrl(normalized),
    categoryId: draft.categoryId || customAddCategoryId,
  };
}

export function getAddToolModeLabel(mode: AddToolMode | undefined) {
  if (mode === "local-installer") {
    return "本地安装包";
  }

  if (mode === "local-archive") {
    return "ZIP 便携包";
  }

  if (mode === "command") {
    return "自定义命令";
  }

  if (mode === "winget") {
    return "winget 包";
  }

  return "只加入工具箱";
}

export function describeAddToolDraft(draft: Pick<AddToolDraft, "mode" | "localPath" | "archiveExecutable">) {
  if (!draft.localPath) {
    return "选择文件或输入链接后会自动生成处理方案。";
  }

  if (draft.mode === "local-installer") {
    return "安装时会运行这个本地安装包。";
  }

  if (draft.mode === "local-archive") {
    return draft.archiveExecutable
      ? "安装时会解压 ZIP 并打开指定程序。"
      : "安装时会解压 ZIP，启动程序可由 AI 分析或高级设置补充。";
  }

  if (draft.mode === "command") {
    return "会按高级设置里的命令执行。";
  }

  if (draft.mode === "winget") {
    return "会按高级设置里的 winget ID 安装和更新。";
  }

  return "会直接收纳到工具箱，不执行安装。";
}

export function toCustomToolInput(
  draft: AddToolDraft,
  managedRootPath: string,
): CustomToolInput {
  const fallback = draft.localPath
    ? inferAddToolDraftFromLocalPath(draft.localPath)
    : undefined;

  return {
    mode: draft.mode || fallback?.mode,
    name: draft.name.trim() || fallback?.name || "",
    category: draft.categoryId,
    homepage: draft.homepage,
    localPath: draft.localPath.trim() || draft.localPath,
    archiveExecutable: draft.archiveExecutable,
    installCommand: draft.installCommand,
    uninstallCommand: draft.uninstallCommand,
    launchCommand: draft.launchCommand,
    wingetId: draft.wingetId,
    managedRootPath,
  };
}

export function getBaseName(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).pop() || filePath;
}

function inferToolNameFromPath(filePath: string) {
  return getBaseName(filePath).replace(/\.[^.]+$/, "");
}

function getFileExtension(filePath: string) {
  const baseName = getBaseName(filePath);
  const match = baseName.match(/\.([^.]+)$/);

  return match?.[1]?.toLowerCase() ?? "";
}

function inferToolNameFromUrl(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    return decodeURIComponent(segments.at(-1) || url.hostname)
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ");
  } catch {
    return "";
  }
}
