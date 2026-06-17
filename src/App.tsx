import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  DownloadCloud,
  ExternalLink,
  Filter,
  FolderKanban,
  Gauge,
  Github,
  HardDriveDownload,
  Inbox,
  Info,
  Keyboard,
  Laptop,
  ListChecks,
  MonitorOff,
  Network,
  PackageOpen,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Tags,
  Terminal,
  Trash2,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import { DiscoverView } from "./DiscoverView";
import winkitboxIconUrl from "../assets/icon/winkitbox-icon.png";
import {
  customAddCategoryId,
  createUserCategory,
  getActiveCategoryDefinitions,
  getCategoryName,
  getDefaultCategoryDefinitions,
  normalizeCategoryDefinitions,
  resolveToolCategory,
  tools as catalogTools,
  type CategoryDefinition,
  type Tool,
  type ToolCategory,
  uncategorizedCategoryId,
} from "./core/catalog";
import {
  createAiGeneratedTool,
  type AiToolCandidate,
  type AiToolGitHubContext,
} from "./core/aiTool";
import { buildExportConfig, parseImportedConfig } from "./core/config";
import { createDashboardStats } from "./core/dashboardStats";
import { createLaunchDescriptor, getToolLogoUrl } from "./core/launcher";
import {
  flattenDnsServers,
  formatDnsServers,
  publicDnsProviders,
  rankDnsResults,
  type DnsLatencyResult,
} from "./core/network";
import {
  buildInstallCommand,
  buildPowerShellScript,
  buildUninstallCommand,
  buildUninstallPowerShellScript,
  createInstallPlan,
  createUninstallPlan,
  getDefaultSelection,
  searchTools,
} from "./core/planner";
import { parseRunEventLine, type RunEvent } from "./core/runEvents";
import {
  applyDetectionResults,
  applyRunEventSnapshot,
  createEmptyInstallProgress,
  getInstallButtonLabel,
  getStatusLabel,
  markToolsChecking,
  type InstallProgress,
  type ToolRuntimeState,
  type ToolRuntimeStates,
} from "./core/toolStatus";
import {
  getThemeDefinition,
  getThemeImageBackgroundUrl,
  imageThemeIds,
  isImageThemeId,
  isSolidThemeId,
  solidThemeIds,
  themeDefinitions,
  type ThemeId,
} from "./core/themes";
import { findSetupAsset, type UpdateInfo } from "./core/update";

type CategoryFilter = "all" | ToolCategory;
type ActiveView = "catalog" | "discover" | "system" | "settings";

type LogEntry = {
  id: number;
  level: "info" | "success" | "warning" | "error";
  message: string;
};

type ToolPathSettings = {
  toolRootPath: string;
  defaultToolRootPath: string;
  updateOnStartup: boolean;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  themeId: ThemeId;
  themeBackgrounds: Partial<Record<ThemeId, string>>;
  glassOpacity: number;
  glassBlur: number;
  customTools: Tool[];
  customCategories: CategoryDefinition[];
  toolCategoryOverrides: Record<string, string>;
};

type SystemAdapter = {
  id: string;
  name: string;
  description: string;
  status: string;
  macAddress: string;
  dhcpEnabled: boolean;
  ipv4: {
    address: string;
    prefixLength: number;
  }[];
  gateway: string;
  dnsServers: string[];
};

type SystemInfo = {
  computerName: string;
  os: {
    caption: string;
    version: string;
    buildNumber: string;
  };
  cpu: string;
  memoryGb: number;
  disks: {
    name: string;
    volumeName: string;
    fileSystem: string;
    sizeGb: number;
    freeGb: number;
  }[];
  physicalDisks: {
    model: string;
    interfaceType: string;
    mediaType: string;
    sizeGb: number;
  }[];
  gpus: {
    name: string;
    adapterRamGb?: number;
    driverVersion: string;
  }[];
  utf8BetaEnabled: boolean;
  adapters: SystemAdapter[];
};

type NetworkForm = {
  ipAddress: string;
  prefixLength: string;
  gateway: string;
  dnsServers: string;
};

const sourceLabels: Record<Tool["source"], string> = {
  winget: "winget",
  scoop: "scoop",
  github: "GitHub",
  store: "Store",
  website: "官网",
  builtin: "内置",
  custom: "自定义",
};

const riskLabels: Record<Tool["risk"], string> = {
  low: "低风险",
  medium: "需确认",
  high: "谨慎",
};

const categoryIcons: Record<string, typeof Download> = {
  [customAddCategoryId]: Plus,
  [uncategorizedCategoryId]: Inbox,
  starter: Sparkles,
  ai: Cpu,
  ime: Keyboard,
  system: Terminal,
  files: FolderKanban,
  capture: DownloadCloud,
  cleanup: Trash2,
  desktop: ListChecks,
  network: HardDriveDownload,
  rescue: ShieldAlert,
};

let logCounter = 0;
const selectionStorageKey = "winkitbox:selected-tools:v1";
const customToolsStorageKey = "winkitbox:custom-tools:v1";
const fallbackSettings: ToolPathSettings = {
  toolRootPath: "%LOCALAPPDATA%\\WinKitBox",
  defaultToolRootPath: "%LOCALAPPDATA%\\WinKitBox",
  updateOnStartup: true,
  aiBaseUrl: "",
  aiApiKey: "",
  aiModel: "",
  themeId: "light",
  themeBackgrounds: {},
  glassOpacity: 0.72,
  glassBlur: 28,
  customTools: [],
  customCategories: getDefaultCategoryDefinitions(),
  toolCategoryOverrides: {},
};
const releasePageUrl = "https://github.com/575674384-stack/winkitbox/releases";

function getCategoryLabel(category: CategoryFilter, categories: CategoryDefinition[]) {
  return category === "all" ? "全部工具" : getCategoryName(category, categories);
}

function toCssUrl(url: string) {
  return `url("${url.replace(/"/g, "%22")}")`;
}

function formatStars(stars?: number) {
  if (!stars) {
    return "未标注";
  }

  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(stars >= 10000 ? 0 : 1)}k`;
  }

  return `${stars}`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const unit = units[Math.min(index, units.length - 1)];
  const value = bytes / 1024 ** Math.min(index, units.length - 1);
  return `${value.toFixed(1)} ${unit}`;
}

function loadCustomTools(): Tool[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(customToolsStorageKey) || "[]",
    );
    return Array.isArray(parsed) ? parsed.filter(isStoredTool) : [];
  } catch {
    return [];
  }
}

function parseGitHubRepoFromUrl(url?: string) {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") {
      return undefined;
    }

    const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo) {
      return undefined;
    }

    return {
      owner,
      repo: repo.replace(/\.git$/i, ""),
    };
  } catch {
    return undefined;
  }
}

function isStoredTool(value: unknown): value is Tool {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Tool).id === "string" &&
    typeof (value as Tool).name === "string" &&
    typeof (value as Tool).category === "string" &&
    typeof (value as Tool).customInstallCommand === "string"
  );
}

function parseDnsText(value: string) {
  return value
    .split(/[,，\s]+/)
    .map((server) => server.trim())
    .filter(Boolean);
}

export function App() {
  const [customTools, setCustomTools] = useState<Tool[]>(() =>
    loadCustomTools(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initialTools = [...catalogTools, ...loadCustomTools()];
    const fallback = getDefaultSelection(initialTools);
    const knownIds = new Set(initialTools.map((tool) => tool.id));
    const stored = localStorage.getItem(selectionStorageKey);

    if (!stored) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(stored) as string[];
      const validIds = parsed.filter((id) => knownIds.has(id));
      return validIds.length > 0 ? new Set(validIds) : fallback;
    } catch {
      return fallback;
    }
  });
  const [activeView, setActiveView] = useState<ActiveView>("catalog");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [installedOnly, setInstalledOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: ++logCounter,
      level: "info",
      message: "WinKitBox 已就绪。安装、打开、卸载都会自动刷新状态。",
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [toolStates, setToolStates] = useState<ToolRuntimeStates>({});
  const [installProgress, setInstallProgress] = useState<InstallProgress>(() =>
    createEmptyInstallProgress(),
  );
  const [settings, setSettings] = useState<ToolPathSettings>(fallbackSettings);
  const [toolRootDraft, setToolRootDraft] = useState(
    fallbackSettings.toolRootPath,
  );
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  const allTools = useMemo(() => {
    const applyCategoryOverrides = (tools: Tool[]) =>
      tools.map((tool) => {
        const override = settings.toolCategoryOverrides[tool.id];
        return override && override !== tool.category
          ? { ...tool, category: override }
          : tool;
      });
    return [
      ...applyCategoryOverrides(catalogTools),
      ...applyCategoryOverrides(customTools),
    ];
  }, [customTools, settings.toolCategoryOverrides]);
  const activeCategoryDefinitions = useMemo(
    () => getActiveCategoryDefinitions(settings.customCategories),
    [settings.customCategories],
  );
  const categoryNavigation = useMemo(() => {
    const activeCategories = activeCategoryDefinitions.map(
      (category) => category.id,
    );
    const hasUncategorizedTools = allTools.some(
      (tool) =>
        resolveToolCategory(tool, settings.customCategories) ===
        uncategorizedCategoryId,
    );

    return [
      "all",
      ...activeCategories,
      ...(hasUncategorizedTools ? [uncategorizedCategoryId] : []),
    ] as CategoryFilter[];
  }, [activeCategoryDefinitions, allTools, settings.customCategories]);
  const plannerOptions = useMemo(
    () => ({ managedRootPath: settings.toolRootPath }),
    [settings.toolRootPath],
  );
  const installPlan = useMemo(
    () => createInstallPlan(allTools, selectedIds, plannerOptions),
    [allTools, selectedIds, plannerOptions],
  );
  const selectedInstalledIds = useMemo(
    () =>
      new Set(
        allTools
          .filter(
            (tool) =>
              selectedIds.has(tool.id) &&
              toolStates[tool.id]?.status === "installed",
          )
          .map((tool) => tool.id),
      ),
    [allTools, selectedIds, toolStates],
  );
  const uninstallPlan = useMemo(
    () => createUninstallPlan(allTools, selectedInstalledIds, plannerOptions),
    [allTools, selectedInstalledIds, plannerOptions],
  );
  const script = useMemo(
    () => buildPowerShellScript(installPlan),
    [installPlan],
  );
  const uninstallScript = useMemo(
    () => buildUninstallPowerShellScript(uninstallPlan),
    [uninstallPlan],
  );
  const selectedTools = useMemo(
    () => allTools.filter((tool) => selectedIds.has(tool.id)),
    [allTools, selectedIds],
  );
  const selectedInstalledTools = useMemo(
    () => allTools.filter((tool) => selectedInstalledIds.has(tool.id)),
    [allTools, selectedInstalledIds],
  );
  const dashboardStats = useMemo(
    () =>
      createDashboardStats({
        tools: allTools,
        selectedIds,
        toolStates,
        installPlan,
      }),
    [allTools, selectedIds, toolStates, installPlan],
  );

  const visibleTools = useMemo(() => {
    const categoryFiltered =
      activeCategory === "all"
        ? allTools
        : allTools.filter(
            (tool) =>
              resolveToolCategory(tool, settings.customCategories) ===
              activeCategory,
          );
    const statusFiltered = installedOnly
      ? categoryFiltered.filter(
          (tool) => toolStates[tool.id]?.status === "installed",
        )
      : categoryFiltered;
    return searchTools(statusFiltered, query);
  }, [allTools, activeCategory, query, settings.customCategories, installedOnly, toolStates]);
  const currentTheme = useMemo(
    () => getThemeDefinition(settings.themeId),
    [settings.themeId],
  );
  const currentThemeBackground = getThemeImageBackgroundUrl(settings.themeId);
  const themeStyle = useMemo(
    () =>
      ({
        "--theme-background-image": currentThemeBackground
          ? toCssUrl(currentThemeBackground)
          : "none",
        "--theme-backdrop": currentTheme.background,
        "--glass-opacity": String(settings.glassOpacity),
        "--glass-blur": `${settings.glassBlur}px`,
      }) as CSSProperties,
    [
      currentTheme,
      currentThemeBackground,
      settings.glassOpacity,
      settings.glassBlur,
    ],
  );

  useEffect(() => {
    void (async () => {
      if (!window.winKitBox) {
        await refreshToolStates(allTools);
        return;
      }

      try {
        const nextSettings = await window.winKitBox.getSettings();
        const storedCustomTools =
          Array.isArray(nextSettings.customTools) &&
          nextSettings.customTools.length > 0
            ? nextSettings.customTools
            : loadCustomTools();
        const normalizedSettings = {
          ...fallbackSettings,
          ...nextSettings,
          updateOnStartup: nextSettings.updateOnStartup !== false,
          customTools: storedCustomTools,
          customCategories: normalizeCategoryDefinitions(
            nextSettings.customCategories,
          ),
        };
        setCustomTools(storedCustomTools);
        setSettings(normalizedSettings);
        setToolRootDraft(normalizedSettings.toolRootPath);
        await refreshToolStates([...catalogTools, ...storedCustomTools], {
          managedRootPath: normalizedSettings.toolRootPath,
        });

        if (storedCustomTools.length > 0 && nextSettings.customTools.length === 0) {
          await window.winKitBox.setSettings(normalizedSettings);
        }

        if (normalizedSettings.updateOnStartup) {
          await checkForUpdates(true);
        }
      } catch (error) {
        appendLog(
          "warning",
          error instanceof Error ? error.message : "读取工具目录设置失败。",
        );
        await refreshToolStates(allTools);
      }
    })();
  }, []);

  useEffect(() => {
    let pendingOutput = "";
    const dispose = window.winKitBox?.onRunOutput((value) => {
      pendingOutput += value;
      const lines = pendingOutput.split(/\r?\n/);
      pendingOutput = lines.pop() ?? "";

      for (const line of lines) {
        handleRunOutputLine(line);
      }
    });

    return () => {
      if (pendingOutput.trim()) {
        handleRunOutputLine(pendingOutput);
      }
      dispose?.();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      selectionStorageKey,
      JSON.stringify(Array.from(selectedIds)),
    );
  }, [selectedIds]);

  useEffect(() => {
    localStorage.setItem(customToolsStorageKey, JSON.stringify(customTools));
  }, [customTools]);

  useEffect(() => {
    if (!categoryNavigation.includes(activeCategory)) {
      setActiveCategory("all");
      setInstalledOnly(false);
    }
  }, [activeCategory, categoryNavigation]);

  useEffect(() => {
    const knownIds = new Set(allTools.map((tool) => tool.id));
    setSelectedIds((current) => {
      const next = new Set(
        Array.from(current).filter((id) => knownIds.has(id)),
      );
      return next.size === current.size ? current : next;
    });
  }, [allTools]);

  function appendLog(level: LogEntry["level"], message: string) {
    if (!message) {
      return;
    }

    setLogs((current) => [
      {
        id: ++logCounter,
        level,
        message,
      },
      ...current,
    ]);
  }

  function handleRunOutputLine(line: string) {
    const message = line.trim();

    if (!message) {
      return;
    }

    const event = parseRunEventLine(message);

    if (event) {
      applyRunEvent(event);
      return;
    }

    appendLog("info", message);
  }

  function applyRunEvent(event: RunEvent) {
    setToolStates(
      (current) =>
        applyRunEventSnapshot(event, current, createEmptyInstallProgress())
          .states,
    );
    setInstallProgress(
      (current) => applyRunEventSnapshot(event, {}, current).progress,
    );

    if (event.type === "plan-start") {
      appendLog(
        "info",
        event.action === "uninstall"
          ? `开始执行卸载计划，共 ${event.total} 个卸载项。`
          : `开始执行安装计划，共 ${event.total} 个自动安装项。`,
      );
      return;
    }

    if (event.type === "plan-complete") {
      appendLog("success", "计划已跑完，正在刷新安装状态。");
      return;
    }

    if (event.type === "manual") {
      appendLog("warning", `${event.label} 需要手动下载，已保留来源入口。`);
      return;
    }

    if (event.type === "uninstall-start") {
      appendLog("info", `正在卸载 ${event.label}。`);
      return;
    }

    if (event.type === "uninstall-success") {
      appendLog("success", `${event.label} 已卸载，稍后自动刷新状态。`);
      return;
    }

    if (event.type === "uninstall-failed") {
      appendLog("error", `${event.label} 卸载失败。`);
      return;
    }

    if (event.type === "install-start") {
      appendLog("info", `正在安装 ${event.label}。`);
      return;
    }

    if (event.type === "install-success") {
      appendLog("success", `${event.label} 安装完成，稍后自动检测打开入口。`);
      return;
    }

    appendLog("error", `${event.label} 安装失败。`);
  }

  async function refreshToolStates(
    targetTools: Tool[],
    options = plannerOptions,
  ) {
    if (!window.winKitBox || targetTools.length === 0) {
      return;
    }

    const descriptors = targetTools.map((tool) =>
      createLaunchDescriptor(tool, options),
    );
    const toolIds = descriptors.map((descriptor) => descriptor.toolId);

    setToolStates((current) => markToolsChecking(current, toolIds));

    try {
      const results = await window.winKitBox.detectTools(descriptors);
      setToolStates((current) =>
        applyDetectionResults(current, results, toolIds),
      );
    } catch (error) {
      setToolStates((current) => {
        const next = { ...current };
        for (const toolId of toolIds) {
          if (next[toolId]?.status === "checking") {
            next[toolId] = {
              status: "unknown",
              message: "检测失败，可以稍后重试。",
            };
          }
        }
        return next;
      });
      appendLog(
        "warning",
        error instanceof Error ? error.message : "安装状态检测失败。",
      );
    }
  }

  function toggleTool(toolId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  }

  async function persistSettings(nextSettings: ToolPathSettings) {
    if (!window.winKitBox) {
      setSettings(nextSettings);
      setToolRootDraft(nextSettings.toolRootPath);
      appendLog(
        "warning",
        "浏览器预览模式只会临时保存设置，桌面版才能写入本机配置。",
      );
      return nextSettings;
    }

    const savedSettings = await window.winKitBox.setSettings({
      toolRootPath: nextSettings.toolRootPath,
      updateOnStartup: nextSettings.updateOnStartup,
      aiBaseUrl: nextSettings.aiBaseUrl,
      aiApiKey: nextSettings.aiApiKey,
      aiModel: nextSettings.aiModel,
      themeId: nextSettings.themeId,
      themeBackgrounds: nextSettings.themeBackgrounds,
      glassOpacity: nextSettings.glassOpacity,
      glassBlur: nextSettings.glassBlur,
      customTools: nextSettings.customTools,
      customCategories: nextSettings.customCategories,
    });
    const normalizedSettings = {
      ...fallbackSettings,
      ...savedSettings,
      updateOnStartup: savedSettings.updateOnStartup !== false,
      customCategories: normalizeCategoryDefinitions(
        savedSettings.customCategories,
      ),
    };
    setCustomTools(normalizedSettings.customTools);
    setSettings(normalizedSettings);
    setToolRootDraft(normalizedSettings.toolRootPath);
    return normalizedSettings;
  }

  async function saveToolRootPath(path = toolRootDraft) {
    const nextPath = path.trim();

    if (!nextPath) {
      appendLog("warning", "工具目录不能为空。");
      return;
    }

    try {
      const savedSettings = await persistSettings({
        ...settings,
        toolRootPath: nextPath,
      });
      appendLog("success", `工具目录已切换到 ${savedSettings.toolRootPath}。`);
      await refreshToolStates(allTools, {
        managedRootPath: savedSettings.toolRootPath,
      });
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "保存工具目录失败。",
      );
    }
  }

  async function chooseToolRootPath() {
    if (!window.winKitBox) {
      appendLog("warning", "浏览器预览模式不能打开本机目录选择器。");
      return;
    }

    const selectedPath = await window.winKitBox.selectToolRoot(toolRootDraft);
    if (selectedPath) {
      setToolRootDraft(selectedPath);
      await saveToolRootPath(selectedPath);
    }
  }

  async function resetToolRootPath() {
    setToolRootDraft(settings.defaultToolRootPath);
    await saveToolRootPath(settings.defaultToolRootPath);
  }

  async function saveUpdateOnStartup(updateOnStartup: boolean) {
    try {
      await persistSettings({ ...settings, updateOnStartup });
      appendLog(
        "success",
        updateOnStartup
          ? "已开启启动时自动检测更新。"
          : "已关闭启动时自动检测更新。",
      );
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "保存更新设置失败。",
      );
    }
  }

  async function saveAiSettings(aiSettings: {
    aiBaseUrl: string;
    aiApiKey: string;
    aiModel: string;
  }) {
    try {
      await persistSettings({ ...settings, ...aiSettings });
      appendLog("success", "AI 添加工具配置已保存。");
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "保存 AI 配置失败。",
      );
    }
  }

  async function saveCustomCategories(nextCategories: CategoryDefinition[]) {
    try {
      await persistSettings({
        ...settings,
        customCategories: normalizeCategoryDefinitions(nextCategories),
      });
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "保存分类失败。",
      );
    }
  }

  async function saveToolCategory(toolId: string, categoryId: string) {
    try {
      const originalTool =
        catalogTools.find((tool) => tool.id === toolId) ??
        customTools.find((tool) => tool.id === toolId);
      const nextOverrides = { ...settings.toolCategoryOverrides };
      if (originalTool && categoryId === originalTool.category) {
        delete nextOverrides[toolId];
      } else {
        nextOverrides[toolId] = categoryId;
      }
      await persistSettings({
        ...settings,
        toolCategoryOverrides: nextOverrides,
      });
      appendLog("success", "已修改工具分类。");
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "修改工具分类失败。",
      );
    }
  }

  async function addCustomCategory(name: string) {
    try {
      const category = createUserCategory(name, settings.customCategories);
      await saveCustomCategories([...settings.customCategories, category]);
      appendLog("success", `已添加分类：${category.name}。`);
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "添加分类失败。",
      );
    }
  }

  async function renameCategory(categoryId: string, name: string) {
    const trimmed = name.trim();
    const category = settings.customCategories.find(
      (item) => item.id === categoryId,
    );

    if (!category || category.protected) {
      appendLog("warning", "这个分类不能改名。");
      return;
    }

    if (!trimmed) {
      appendLog("warning", "分类名称不能为空。");
      return;
    }

    await saveCustomCategories(
      settings.customCategories.map((item) =>
        item.id === categoryId ? { ...item, name: trimmed.slice(0, 20) } : item,
      ),
    );
    appendLog("success", `分类已改名为：${trimmed.slice(0, 20)}。`);
  }

  async function removeCategory(categoryId: string) {
    const category = settings.customCategories.find(
      (item) => item.id === categoryId,
    );

    if (!category || category.protected) {
      appendLog("warning", "这个分类不能删除。");
      return;
    }

    const nextCategories = category.builtin
      ? settings.customCategories.map((item) =>
          item.id === categoryId ? { ...item, hidden: true } : item,
        )
      : settings.customCategories.filter((item) => item.id !== categoryId);

    await saveCustomCategories(nextCategories);
    if (activeCategory === categoryId) {
      setActiveCategory("all");
      setInstalledOnly(false);
    }
    appendLog(
      "success",
      `已删除分类：${category.name}。原有工具会显示在“未分类”。`,
    );
  }

  async function restoreCategory(categoryId: string) {
    const category = settings.customCategories.find(
      (item) => item.id === categoryId,
    );

    if (!category?.builtin) {
      return;
    }

    await saveCustomCategories(
      settings.customCategories.map((item) =>
        item.id === categoryId ? { ...item, hidden: undefined } : item,
      ),
    );
    appendLog("success", `已恢复分类：${category.name}。`);
  }

  async function saveTheme(themeId: ThemeId) {
    const nextSettings = {
      ...settings,
      themeId,
      glassOpacity: getThemeDefinition(themeId).defaultGlassOpacity,
      glassBlur: getThemeDefinition(themeId).defaultGlassBlur,
      themeBackgrounds: {},
    };
    try {
      await persistSettings(nextSettings);
      appendLog(
        "success",
        `已切换到 ${themeDefinitions.find((theme) => theme.id === themeId)?.name ?? themeId} 主题。`,
      );
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "保存主题失败。",
      );
    }
  }

  async function saveGlassSettings(glass: {
    glassOpacity: number;
    glassBlur: number;
  }) {
    try {
      await persistSettings({ ...settings, ...glass });
      appendLog(
        "success",
        `面板效果已调整为不透明度 ${Math.round(glass.glassOpacity * 100)}%、背景柔化 ${glass.glassBlur}px。`,
      );
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "保存面板效果失败。",
      );
    }
  }


  async function checkForUpdates(silent = false) {
    if (!window.winKitBox) {
      if (!silent) {
        appendLog("warning", "浏览器预览模式不能检查桌面版更新。");
      }
      return;
    }

    setIsCheckingUpdate(true);

    try {
      const info = await window.winKitBox.checkUpdates();
      setUpdateInfo(info);

      if (info.hasUpdate) {
        appendLog(
          "success",
          `发现新版 v${info.latestVersion}，可以打开发行页下载。`,
        );
        return;
      }

      if (info.error) {
        if (!silent) {
          appendLog("warning", info.error);
        }
        return;
      }

      if (!silent) {
        appendLog("success", `已是最新版本 v${info.currentVersion}。`);
      }
    } catch (error) {
      if (!silent) {
        appendLog(
          "error",
          error instanceof Error ? error.message : "检查更新失败。",
        );
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  async function openUpdateRelease() {
    await openUrl(updateInfo?.releaseUrl || releasePageUrl);
  }

  async function exportConfig() {
    try {
      const payload = buildExportConfig({
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: {
          toolRootPath: settings.toolRootPath,
          updateOnStartup: settings.updateOnStartup,
          themeId: settings.themeId,
        },
        selectedToolIds: Array.from(selectedIds),
        customTools,
        customCategories: settings.customCategories,
      });

      if (window.winKitBox) {
        const result = await window.winKitBox.saveConfigFile({
          content: payload,
        });
        if (!result.canceled) {
          appendLog("success", `配置已导出：${result.filePath}`);
        }
        return;
      }

      const url = URL.createObjectURL(
        new Blob([payload], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "winkitbox-config.json";
      anchor.click();
      URL.revokeObjectURL(url);
      appendLog("success", "配置已导出。");
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "导出配置失败。",
      );
    }
  }

  async function importConfig() {
    try {
      const opened = window.winKitBox
        ? await window.winKitBox.openConfigFile()
        : await openBrowserConfigFile();
      if (!opened || opened.canceled || !opened.content) {
        return;
      }

      const imported = parseImportedConfig(opened.content);
      const nextCustomTools = imported.customTools;
      const nextCustomCategories = normalizeCategoryDefinitions(
        imported.customCategories,
      );
      const knownIds = new Set(
        [...catalogTools, ...nextCustomTools].map((tool) => tool.id),
      );
      const nextSelectedIds = imported.selectedToolIds.filter((id) =>
        knownIds.has(id),
      );
      const nextSettings = {
        ...settings,
        toolRootPath: imported.settings.toolRootPath || settings.toolRootPath,
        updateOnStartup: imported.settings.updateOnStartup,
        themeId: imported.settings.themeId ?? settings.themeId,
        customTools: nextCustomTools,
        customCategories: nextCustomCategories,
      };

      setCustomTools(nextCustomTools);
      setSelectedIds(new Set(nextSelectedIds));
      await persistSettings(nextSettings);
      appendLog(
        "success",
        `配置已导入${opened.filePath ? `：${opened.filePath}` : ""}。`,
      );
      await refreshToolStates([...catalogTools, ...nextCustomTools], {
        managedRootPath: nextSettings.toolRootPath,
      });
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "导入配置失败。",
      );
    }
  }

  async function openBrowserConfigFile(): Promise<
    { canceled: boolean; content?: string; filePath?: string } | undefined
  > {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve({ canceled: true });
          return;
        }

        if (file.size > 1024 * 1024) {
          resolve(undefined);
          appendLog("error", "配置文件超过 1MB，已拒绝导入。");
          return;
        }

        file
          .text()
          .then((content) =>
            resolve({ canceled: false, content, filePath: file.name }),
          );
      };
      input.click();
    });
  }

  async function addAiGeneratedTool(
    candidate: AiToolCandidate,
    context: AiToolGitHubContext,
    categoryId = customAddCategoryId,
  ) {
    try {
      const customTool = createAiGeneratedTool(
        {
          ...candidate,
          category: categoryId,
        },
        context,
        new Set(allTools.map((tool) => tool.id)),
      );
      const nextCustomTools = [...customTools, customTool];
      setCustomTools(nextCustomTools);
      await persistSettings({ ...settings, customTools: nextCustomTools });
      appendLog("success", `AI 已添加工具：${customTool.name}。`);
      setSelectedIds((current) => new Set([...current, customTool.id]));
      await refreshToolStates([customTool]);
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "AI 添加工具失败。",
      );
    }
  }

  async function removeCustomTool(toolId: string) {
    const tool = customTools.find((item) => item.id === toolId);
    const nextCustomTools = customTools.filter((item) => item.id !== toolId);
    setCustomTools(nextCustomTools);
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(toolId);
      return next;
    });
    await persistSettings({ ...settings, customTools: nextCustomTools });
    appendLog("success", `已移除自定义工具：${tool?.name ?? toolId}。`);
  }

  async function fixToolWithAi(tool: Tool) {
    if (!window.winKitBox) {
      appendLog("warning", "浏览器预览模式不能调用 AI 修复工具。");
      return;
    }

    if (!settings.aiBaseUrl || !settings.aiApiKey || !settings.aiModel) {
      appendLog("warning", "请先在设置里保存 AI 接口 URL、API Key 和模型名称。");
      setActiveView("settings");
      return;
    }

    const toolState = toolStates[tool.id] ?? { status: "unknown" };
    const isBuiltinTool = !customTools.some((item) => item.id === tool.id);
    appendLog("info", `正在用 AI 分析 ${tool.name} 的安装失败原因...`);

    try {
      const result = await window.winKitBox.fixAiTool({
        baseUrl: settings.aiBaseUrl,
        apiKey: settings.aiApiKey,
        model: settings.aiModel,
        tool,
        errorMessage: toolState.message ?? "安装失败",
      });

      const repoRef = parseGitHubRepoFromUrl(tool.repoUrl);
      const fixedTool = createAiGeneratedTool(
        result.candidate as AiToolCandidate,
        {
          owner: repoRef?.owner,
          repo: repoRef?.repo,
          htmlUrl: tool.homepage,
          releaseApiUrl: repoRef
            ? `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}/releases/latest`
            : "",
          stars: tool.stars,
          license: tool.license,
        },
        new Set(allTools.filter((item) => item.id !== tool.id).map((item) => item.id)),
        tool.id,
      );

      const nextCustomTools = customTools.some((item) => item.id === tool.id)
        ? customTools.map((item) => (item.id === tool.id ? fixedTool : item))
        : [...customTools, fixedTool];

      setCustomTools(nextCustomTools);
      await persistSettings({ ...settings, customTools: nextCustomTools });
      appendLog(
        "success",
        isBuiltinTool
          ? `AI 已修复 ${tool.name} 的安装配置，已保存为自定义覆盖版本，后续安装将使用修复后的配置。`
          : `AI 已修复 ${tool.name} 的安装配置，请重新尝试安装。`,
      );
      await refreshToolStates([fixedTool]);
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "AI 修复工具失败。",
      );
    }
  }

  async function addDiscoverRepoWithAi(repoUrl: string, categoryId: string) {
    if (!window.winKitBox) {
      appendLog("warning", "浏览器预览模式不能调用 AI 添加工具。");
      return;
    }

    if (!settings.aiBaseUrl || !settings.aiApiKey || !settings.aiModel) {
      appendLog("warning", "请先在设置里保存 AI 接口 URL、API Key 和模型名称。");
      setActiveView("settings");
      return;
    }

    const result = await window.winKitBox.generateAiTool({
      baseUrl: settings.aiBaseUrl,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      toolUrl: repoUrl,
      categoryId,
    });
    await addAiGeneratedTool(result.candidate, result.context, categoryId);
  }

  async function runInstallPlan() {
    if (!window.winKitBox) {
      appendLog("warning", "当前在浏览器预览模式，不能直接执行 PowerShell。");
      return;
    }

    const confirmed = window.confirm(
      `将执行 ${installPlan.readyCount} 条安装命令。是否继续？`,
    );

    if (!confirmed) {
      appendLog("info", "已取消执行安装计划。");
      return;
    }

    setIsRunning(true);
    appendLog("info", "开始执行安装计划。");

    try {
      const result = await window.winKitBox.runPowerShell(script);
      if (result.code === 0) {
        appendLog("success", "安装计划执行完成。");
      } else {
        appendLog("error", `安装计划结束，退出码 ${result.code ?? "未知"}。`);
      }
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "执行安装计划失败。",
      );
    } finally {
      await refreshToolStates(selectedTools);
      setIsRunning(false);
    }
  }

  async function runUninstallPlan() {
    if (!window.winKitBox) {
      appendLog("warning", "当前在浏览器预览模式，不能直接执行 PowerShell。");
      return;
    }

    const confirmed = window.confirm(
      `将卸载已选择且已安装的 ${uninstallPlan.readyCount} 个工具。卸载可能会弹出软件自己的确认窗口，是否继续？`,
    );

    if (!confirmed) {
      appendLog("info", "已取消执行卸载计划。");
      return;
    }

    setIsRunning(true);
    appendLog("info", "开始执行卸载计划。");

    try {
      const result = await window.winKitBox.runPowerShell(uninstallScript);
      if (result.code === 0) {
        appendLog("success", "卸载计划执行完成。");
      } else {
        appendLog("error", `卸载计划结束，退出码 ${result.code ?? "未知"}。`);
      }
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "执行卸载计划失败。",
      );
    } finally {
      await refreshToolStates(selectedInstalledTools);
      setIsRunning(false);
    }
  }

  async function openUrl(url: string) {
    if (window.winKitBox) {
      await window.winKitBox.openUrl(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function installTool(tool: Tool) {
    const installCommand = buildInstallCommand(tool, plannerOptions);

    if (!installCommand.command) {
      appendLog("warning", `${tool.name} 需要手动下载，已打开来源页面。`);
      await openUrl(installCommand.manualUrl ?? tool.homepage);
      return;
    }

    if (!window.winKitBox) {
      appendLog(
        "warning",
        `浏览器预览不能直接安装 ${tool.name}，请用桌面版运行 WinKitBox。`,
      );
      return;
    }

    appendLog("info", `开始安装 ${tool.name}。`);
    const singlePlan = createInstallPlan(
      [tool],
      new Set([tool.id]),
      plannerOptions,
    );
    const result = await window.winKitBox.runPowerShell(
      buildPowerShellScript(singlePlan),
    );
    await refreshToolStates([tool]);

    if (result.code === 0) {
      appendLog("success", `${tool.name} 安装命令已完成，可以点击打开试试。`);
    } else {
      appendLog(
        "error",
        `${tool.name} 安装命令结束，退出码 ${result.code ?? "未知"}。`,
      );
    }
  }

  async function uninstallTool(tool: Tool) {
    const uninstallCommand = buildUninstallCommand(tool, plannerOptions);

    if (!uninstallCommand.command) {
      appendLog("warning", `${tool.name} 没有可执行卸载命令，已打开来源页面。`);
      await openUrl(uninstallCommand.manualUrl ?? tool.homepage);
      return;
    }

    if (!window.winKitBox) {
      appendLog(
        "warning",
        `浏览器预览不能直接卸载 ${tool.name}，请用桌面版运行 WinKitBox。`,
      );
      return;
    }

    const confirmed = window.confirm(
      `将卸载 ${tool.name}。卸载可能会弹出软件自己的确认窗口，是否继续？`,
    );

    if (!confirmed) {
      appendLog("info", `已取消卸载 ${tool.name}。`);
      return;
    }

    appendLog("info", `开始卸载 ${tool.name}。`);
    const singlePlan = createUninstallPlan(
      [tool],
      new Set([tool.id]),
      plannerOptions,
    );
    const result = await window.winKitBox.runPowerShell(
      buildUninstallPowerShellScript(singlePlan),
    );
    await refreshToolStates([tool]);

    if (result.code === 0) {
      appendLog("success", `${tool.name} 卸载命令已完成。`);
    } else {
      appendLog(
        "error",
        `${tool.name} 卸载命令结束，退出码 ${result.code ?? "未知"}。`,
      );
    }
  }

  async function launchTool(tool: Tool) {
    if (!window.winKitBox) {
      appendLog(
        "warning",
        `浏览器预览不能打开本地软件。请用桌面版运行 WinKitBox 后打开 ${tool.name}。`,
      );
      return;
    }

    appendLog("info", `正在打开 ${tool.name}。`);
    setToolStates((current) => ({
      ...current,
      [tool.id]: {
        ...current[tool.id],
        status: "opening",
        message: `正在打开 ${tool.name}...`,
      },
    }));

    const result = await window.winKitBox.launchTool(
      createLaunchDescriptor(tool, plannerOptions),
    );

    if (result.code === 0) {
      setToolStates((current) => ({
        ...current,
        [tool.id]: {
          ...current[tool.id],
          status: "installed",
          message: `${tool.name} 已打开。`,
          launcherFound: true,
        },
      }));
      appendLog("success", `${tool.name} 已发送启动请求。`);
    } else {
      await refreshToolStates([tool]);
      appendLog(
        "warning",
        `没有找到 ${tool.name} 的已安装入口。可以先安装，或打开来源页面确认安装方式。`,
      );
    }
  }

  return (
    <main
      className={`app-shell theme-${settings.themeId} ${currentThemeBackground ? "has-custom-background" : ""} ${
        activeView !== "catalog" ? "wide-mode" : ""
      }`}
      style={themeStyle}
    >
      <aside className="sidebar" aria-label="WinKitBox navigation">
        <div className="sidebar-main">
          <div className="brand-block">
            <div className="brand-mark">
              <img src={winkitboxIconUrl} alt="" />
            </div>
            <div>
              <h1>WinKitBox</h1>
              <p>v{__APP_VERSION__} 装机工具箱</p>
            </div>
          </div>

          <div className="nav-section">
            <div className="section-title">
              <Laptop size={15} />
              本机
            </div>
            <button
              className={`category-button ${activeView === "system" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveView("system")}
            >
              <span>
                <Network size={16} />
                查看本机
              </span>
              <strong>配置</strong>
            </button>
          </div>

          <div className="nav-section">
            <div className="section-title">
              <Filter size={15} />
              分类
            </div>
            <div className="category-list">
              {categoryNavigation.map((category) => {
                const count =
                  category === "all"
                    ? allTools.length
                    : allTools.filter(
                        (tool) =>
                          resolveToolCategory(tool, settings.customCategories) ===
                          category,
                      ).length;
                const Icon =
                  category === "all"
                    ? ListChecks
                    : categoryIcons[category] ?? Tags;
                const categoryDef = settings.customCategories.find(
                  (item) => item.id === category,
                );
                const editable =
                  category !== "all" && category !== customAddCategoryId && !categoryDef?.protected;
                const isEditing = editingCategoryId === category;

                return (
                  <div
                    className={`category-row ${
                      activeView === "catalog" && activeCategory === category
                        ? "active"
                        : ""
                    }`}
                    key={category}
                  >
                    <button
                      className="category-button"
                      type="button"
                      onClick={() => {
                        setActiveView("catalog");
                        setActiveCategory(category);
                        setInstalledOnly(false);
                      }}
                    >
                      <span>
                        <Icon size={16} />
                        {isEditing ? (
                          <input
                            className="category-edit-input"
                            value={editingCategoryName}
                            onChange={(event) =>
                              setEditingCategoryName(event.target.value)
                            }
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                void renameCategory(category, editingCategoryName);
                                setEditingCategoryId(null);
                              } else if (event.key === "Escape") {
                                setEditingCategoryId(null);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          getCategoryLabel(category, settings.customCategories)
                        )}
                      </span>
                      <strong>{count}</strong>
                    </button>
                    {editable && !isEditing && (
                      <div className="category-actions">
                        <button
                          className="category-action"
                          type="button"
                          title="重命名"
                          onClick={() => {
                            setEditingCategoryId(category);
                            setEditingCategoryName(
                              getCategoryLabel(category, settings.customCategories),
                            );
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="category-action danger"
                          type="button"
                          title="删除"
                          onClick={() => {
                            const categoryDef = settings.customCategories.find(
                              (item) => item.id === category,
                            );
                            if (
                              window.confirm(
                                `确定要删除分类“${categoryDef?.name ?? category}”吗？该分类下的工具将移至未分类。`,
                              )
                            ) {
                              void removeCategory(category);
                            }
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                    {isEditing && (
                      <div className="category-actions">
                        <button
                          className="category-action"
                          type="button"
                          title="确认"
                          onClick={() => {
                            void renameCategory(category, editingCategoryName);
                            setEditingCategoryId(null);
                          }}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          className="category-action danger"
                          type="button"
                          title="取消"
                          onClick={() => setEditingCategoryId(null)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {isAddingCategory ? (
                <div className="category-row adding">
                  <div className="category-button">
                    <span>
                      <Plus size={16} />
                      <input
                        className="category-edit-input"
                        value={newCategoryInput}
                        onChange={(event) =>
                          setNewCategoryInput(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void addCustomCategory(newCategoryInput);
                            setNewCategoryInput("");
                            setIsAddingCategory(false);
                          } else if (event.key === "Escape") {
                            setIsAddingCategory(false);
                            setNewCategoryInput("");
                          }
                        }}
                        placeholder="新分类名称"
                        autoFocus
                      />
                    </span>
                  </div>
                  <div className="category-actions">
                    <button
                      className="category-action"
                      type="button"
                      title="确认"
                      onClick={() => {
                        void addCustomCategory(newCategoryInput);
                        setNewCategoryInput("");
                        setIsAddingCategory(false);
                      }}
                    >
                      <Check size={12} />
                    </button>
                    <button
                      className="category-action danger"
                      type="button"
                      title="取消"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryInput("");
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="category-button add-category"
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                >
                  <span>
                    <Plus size={16} />
                    添加分类
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="nav-section">
            <div className="section-title">
              <Github size={15} />
              发现
            </div>
            <button
              className={`category-button ${activeView === "discover" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveView("discover")}
            >
              <span>
                <Github size={16} />
                GitHub 榜单
              </span>
              <strong>Win</strong>
            </button>
          </div>
        </div>

        <div className="sidebar-bottom">
          <button
            className={`category-button ${activeView === "settings" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveView("settings")}
          >
            <span>
              <Settings size={16} />
              设置
            </span>
          </button>
        </div>
      </aside>

      {activeView === "discover" && (
        <section className="workspace">
          <DiscoverView
            categories={activeCategoryDefinitions}
            defaultCategoryId={customAddCategoryId}
            onAddRepoWithAi={addDiscoverRepoWithAi}
            onOpenUrl={openUrl}
          />
        </section>
      )}

      {activeView === "system" && (
        <section className="workspace">
          <SystemView onLog={appendLog} />
        </section>
      )}

      {activeView === "settings" && (
        <section className="workspace">
          <SettingsView
            settings={settings}
            toolRootDraft={toolRootDraft}
            setToolRootDraft={setToolRootDraft}
            saveToolRootPath={saveToolRootPath}
            chooseToolRootPath={chooseToolRootPath}
            resetToolRootPath={resetToolRootPath}
            updateInfo={updateInfo}
            isCheckingUpdate={isCheckingUpdate}
            checkForUpdates={checkForUpdates}
            openUpdateRelease={openUpdateRelease}
            saveUpdateOnStartup={saveUpdateOnStartup}
            saveAiSettings={saveAiSettings}
            saveTheme={saveTheme}
            saveGlassSettings={saveGlassSettings}
            onLog={appendLog}
            logs={logs}
            customTools={customTools}
            categories={activeCategoryDefinitions}
            allCategories={settings.customCategories}
            onAddAiTool={addAiGeneratedTool}
            onRemoveCustomTool={removeCustomTool}
            onExportConfig={exportConfig}
            onImportConfig={importConfig}
          />
        </section>
      )}

      {activeView === "catalog" && (
        <section className="workspace workspace-catalog">
          <header className="command-bar">
            <div className="command-bar-title">
              <div className="command-bar-icon">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="eyebrow">装机方案</p>
                <h2>选择工具，一键恢复环境</h2>
              </div>
            </div>
            <div className="top-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setSelectedIds(getDefaultSelection(allTools))}
              >
                <RotateCcw size={16} />
                恢复默认
              </button>
              <button
                className="ghost-button danger"
                type="button"
                onClick={() => setSelectedIds(new Set())}
              >
                <Trash2 size={16} />
                清空选择
              </button>
            </div>
          </header>

          <div className="stats-row">
            <Metric
              label="已选择"
              value={dashboardStats.selectedCount}
              tone="blue"
              icon={ListChecks}
            />
            <Metric
              label="已安装"
              value={dashboardStats.installedCount}
              tone="green"
              icon={Check}
              onClick={() => {
                setActiveView("catalog");
                setActiveCategory("all");
                setInstalledOnly(true);
                setQuery("");
              }}
            />
          </div>

          {installedOnly && (
            <div className="active-filter-bar">
              <span className="active-filter-chip">
                仅显示已安装工具
                <button
                  className="icon-button tiny"
                  type="button"
                  onClick={() => setInstalledOnly(false)}
                  aria-label="清除已安装筛选"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          )}

          <div className="search-row search-row-prominent">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索工具名称、标签、来源..."
            />
          </div>

          {visibleTools.length === 0 ? (
            <EmptyState
              icon={Search}
              title="没有找到匹配的工具"
              description={`当前分类和搜索词“${query || "全部"}”下没有工具，试试其他关键词或分类。`}
              compact
            >
              {query && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setQuery("")}
                >
                  <RotateCcw size={14} />
                  清除搜索
                </button>
              )}
            </EmptyState>
          ) : (
            <div className="tool-grid" aria-label="Tool catalog">
              {visibleTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  toolState={toolStates[tool.id] ?? { status: "unknown" }}
                  selected={selectedIds.has(tool.id)}
                  categories={activeCategoryDefinitions}
                  onToggle={() => toggleTool(tool.id)}
                  onInstall={() => installTool(tool)}
                  onUninstall={() => uninstallTool(tool)}
                  onLaunch={() => launchTool(tool)}
                  onOpen={() => openUrl(tool.repoUrl ?? tool.homepage)}
                  onAiFix={() => fixToolWithAi(tool)}
                  onSetCategory={(categoryId) =>
                    saveToolCategory(tool.id, categoryId)
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {activeView === "catalog" && (
        <aside className="plan-panel" aria-label="Install plan">
          <div className="plan-panel-header">
            <div className="plan-panel-brand">
              <div className="plan-panel-icon">
                <Play size={20} />
              </div>
              <div>
                <p className="eyebrow">安装计划</p>
                <h2>{dashboardStats.selectedCount} 个已选工具</h2>
              </div>
            </div>
            {installPlan.highRiskCount > 0 && (
              <span className="risk-warning">
                <ShieldAlert size={15} />
                {installPlan.highRiskCount} 项需谨慎
              </span>
            )}
          </div>

          {dashboardStats.selectedCount === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="还没有选择工具"
              description="在左侧勾选想安装的软件，这里会生成对应的 PowerShell 安装计划。"
              compact
            />
          ) : (
            <>
              <InstallProgressCard
                progress={installProgress}
                readyCount={installPlan.readyCount}
              />

              <div className="command-preview">
                <pre>{script}</pre>
              </div>

              <div className="plan-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={isRunning || installPlan.readyCount === 0}
                  onClick={runInstallPlan}
                >
                  <Play size={16} />
                  执行安装
                </button>
                <button
                  className="secondary-button danger"
                  type="button"
                  disabled={isRunning || uninstallPlan.readyCount === 0}
                  onClick={runUninstallPlan}
                >
                  <Trash2 size={16} />
                  卸载已选
                </button>
              </div>

              <div className="manual-list">
                <div className="section-title">
                  <ExternalLink size={15} />
                  手动来源
                </div>
                {installPlan.commands.filter((item) => item.manualUrl)
                  .length === 0 ? (
                  <p className="empty-text">当前没有手动下载项。</p>
                ) : (
                  installPlan.commands
                    .filter((item) => item.manualUrl)
                    .map((item) => (
                      <button
                        className="manual-link"
                        key={item.toolId}
                        type="button"
                        onClick={() => openUrl(item.manualUrl!)}
                      >
                        {item.label}
                        <ExternalLink size={14} />
                      </button>
                    ))
                )}
              </div>
            </>
          )}
        </aside>
      )}
    </main>
  );
}

function InstallProgressCard({
  progress,
  readyCount,
}: {
  progress: InstallProgress;
  readyCount: number;
}) {
  const total = progress.total || readyCount;
  const percent =
    total > 0
      ? Math.min(100, Math.round((progress.completed / total) * 100))
      : 0;
  const finished =
    progress.total > 0 &&
    progress.completed >= progress.total &&
    !progress.active;
  const action = progress.action ?? "install";
  const activeVerb = action === "uninstall" ? "正在卸载" : "正在安装";
  const finishedText = action === "uninstall" ? "卸载已完成" : "安装已完成";
  const idleText = action === "uninstall" ? "个可卸载" : "个可自动安装";
  const title = progress.active
    ? progress.currentLabel
      ? `${activeVerb} ${progress.currentLabel}`
      : activeVerb
    : finished
      ? finishedText
      : "等待执行";
  const meta =
    progress.total > 0
      ? `${progress.completed}/${progress.total} 完成 · 成功 ${progress.succeeded} · 失败 ${progress.failed}`
      : `${readyCount} ${idleText}`;

  const steps =
    action === "uninstall"
      ? ["等待", "检测", "卸载", "完成"]
      : ["等待", "检测", "安装", "完成"];
  const stepIndex = finished ? 3 : progress.active ? 2 : readyCount > 0 ? 1 : 0;

  return (
    <div className={`install-progress-card ${progress.active ? "active" : ""}`}>
      <div className="progress-head">
        <span>{title}</span>
        <strong>{percent}%</strong>
      </div>
      <div className="progress-stepper" aria-label="安装阶段">
        {steps.map((label, index) => (
          <div
            className={`progress-step ${index < stepIndex ? "completed" : ""} ${index === stepIndex ? "active" : ""}`}
            key={label}
          >
            <div className="progress-step-dot">
              {index < stepIndex ? <Check size={14} /> : index + 1}
            </div>
            <span className="progress-step-label">{label}</span>
          </div>
        ))}
      </div>
      <div className="progress-track" aria-label="安装进度">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p>{meta}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "teal" | "amber" | "red";
  icon?: typeof Download;
  onClick?: () => void;
}) {
  return (
    <div
      className={`metric ${tone} ${onClick ? "clickable" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="metric-header">
        <span>{label}</span>
        {Icon && <Icon size={16} />}
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  compact = false,
}: {
  icon: typeof Inbox;
  title: string;
  description: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? "empty-state-compact" : ""}`}>
      <div className="empty-state-icon">
        <Icon size={compact ? 22 : 28} />
      </div>
      <h4>{title}</h4>
      <p>{description}</p>
      {children}
    </div>
  );
}

function SystemView({
  onLog,
}: {
  onLog: (level: LogEntry["level"], message: string) => void;
}) {
  const [info, setInfo] = useState<SystemInfo>();
  const [selectedAdapterId, setSelectedAdapterId] = useState("");
  const [form, setForm] = useState<NetworkForm>({
    ipAddress: "",
    prefixLength: "24",
    gateway: "",
    dnsServers: "",
  });
  const [dnsResults, setDnsResults] = useState<DnsLatencyResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingDns, setIsTestingDns] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSettingUtf8, setIsSettingUtf8] = useState(false);
  const dnsCandidates = useMemo(
    () => flattenDnsServers(publicDnsProviders),
    [],
  );
  const selectedAdapter = info?.adapters.find(
    (adapter) => adapter.id === selectedAdapterId,
  );

  useEffect(() => {
    void refreshSystemInfo();
  }, []);

  async function refreshSystemInfo() {
    if (!window.winKitBox) {
      onLog("warning", "浏览器预览模式不能读取本机配置，请用桌面版打开。");
      return;
    }

    setIsLoading(true);
    try {
      const nextInfo = await window.winKitBox.getSystemInfo();
      setInfo(nextInfo);
      const adapter =
        nextInfo.adapters.find((item) => item.id === selectedAdapterId) ??
        nextInfo.adapters[0];
      if (adapter) {
        setSelectedAdapterId(adapter.id);
        syncFormFromAdapter(adapter);
      }
      onLog("success", "本机配置已刷新。");
    } catch (error) {
      onLog(
        "error",
        error instanceof Error ? error.message : "读取本机配置失败。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function syncFormFromAdapter(adapter: SystemAdapter) {
    const ipv4 = adapter.ipv4[0];
    setForm({
      ipAddress: ipv4?.address ?? "",
      prefixLength: String(ipv4?.prefixLength ?? 24),
      gateway: adapter.gateway ?? "",
      dnsServers: formatDnsServers(adapter.dnsServers),
    });
  }

  function selectAdapter(adapter: SystemAdapter) {
    setSelectedAdapterId(adapter.id);
    syncFormFromAdapter(adapter);
  }

  async function testDnsServers() {
    if (!window.winKitBox) {
      onLog("warning", "浏览器预览模式不能进行 DNS 延迟检测。");
      return;
    }

    setIsTestingDns(true);
    try {
      const providerByServer = new Map(
        dnsCandidates.map((candidate) => [
          candidate.server,
          candidate.provider,
        ]),
      );
      const results = await window.winKitBox.testDnsServers(
        dnsCandidates.map((candidate) => candidate.server),
      );
      const ranked = rankDnsResults(
        results.map((result) => ({
          ...result,
          provider: providerByServer.get(result.server),
        })),
      );
      setDnsResults(ranked);
      const fastest = ranked.find((result) => result.ok);
      if (fastest) {
        onLog(
          "success",
          `DNS 延迟检测完成，最快的是 ${fastest.server}（${fastest.latencyMs}ms）。`,
        );
      } else {
        onLog("warning", "DNS 延迟检测完成，但没有可用结果。");
      }
    } catch (error) {
      onLog(
        "error",
        error instanceof Error ? error.message : "DNS 延迟检测失败。",
      );
    } finally {
      setIsTestingDns(false);
    }
  }

  async function applyNetworkConfig(mode: "dns" | "static" | "dhcp") {
    if (!window.winKitBox || !selectedAdapter) {
      onLog("warning", "请选择有效网卡后再修改网络配置。");
      return;
    }

    const message =
      mode === "dhcp"
        ? "将把当前网卡恢复为自动获取 IP 和 DNS，是否继续？"
        : mode === "static"
          ? "将修改当前网卡的静态 IP 和 DNS，系统会弹出管理员确认，是否继续？"
          : "将修改当前网卡的 DNS，系统会弹出管理员确认，是否继续？";

    if (!window.confirm(message)) {
      return;
    }

    setIsApplying(true);
    try {
      const result = await window.winKitBox.applyNetworkConfig({
        adapterId: selectedAdapter.id,
        mode,
        ipAddress: form.ipAddress,
        prefixLength: Number.parseInt(form.prefixLength, 10) || 24,
        gateway: form.gateway,
        dnsServers: parseDnsText(form.dnsServers),
      });

      if (result.code === 0) {
        onLog("success", "网络配置已应用。");
      } else {
        onLog("warning", `网络配置命令结束，退出码 ${result.code ?? "未知"}。`);
      }
      await refreshSystemInfo();
    } catch (error) {
      onLog(
        "error",
        error instanceof Error ? error.message : "应用网络配置失败。",
      );
    } finally {
      setIsApplying(false);
    }
  }

  async function setUtf8Beta(enabled: boolean) {
    if (!window.winKitBox) {
      onLog("warning", "浏览器预览模式不能修改系统区域设置。");
      return;
    }

    const confirmed = window.confirm(
      enabled
        ? "将开启 Windows 的“使用 Unicode UTF-8 提供全球语言支持”，需要管理员确认并重启系统后生效。是否继续？"
        : "将关闭 Windows UTF-8 beta 开关并尽量恢复之前的代码页，需要管理员确认并重启系统后生效。是否继续？",
    );

    if (!confirmed) {
      return;
    }

    setIsSettingUtf8(true);
    try {
      const result = await window.winKitBox.setSystemUtf8Beta({ enabled });
      if (result.code === 0) {
        onLog(
          "success",
          enabled
            ? "UTF-8 beta 开关已开启，重启系统后生效。"
            : "UTF-8 beta 开关已关闭，重启系统后生效。",
        );
      } else {
        onLog("warning", `UTF-8 设置命令结束，退出码 ${result.code ?? "未知"}。`);
      }
      await refreshSystemInfo();
    } catch (error) {
      onLog(
        "error",
        error instanceof Error ? error.message : "修改 UTF-8 设置失败。",
      );
    } finally {
      setIsSettingUtf8(false);
    }
  }

  return (
    <div className="system-page">
      <header className="command-bar page-topbar">
        <div className="command-bar-title">
          <div className="command-bar-icon system-icon">
            <Laptop size={22} />
          </div>
          <div>
            <p className="eyebrow">本机配置</p>
            <h2>查看本机，调整 IP / DNS</h2>
          </div>
        </div>
        <button
          className="ghost-button"
          type="button"
          disabled={isLoading}
          onClick={refreshSystemInfo}
        >
          <RotateCcw size={16} className={isLoading ? "spin" : ""} />
          {isLoading ? "刷新中" : "刷新配置"}
        </button>
      </header>

      <div className="info-grid">
        <div className="info-card">
          <span>计算机名</span>
          <strong>{info?.computerName || "未读取"}</strong>
        </div>
        <div className="info-card">
          <span>系统版本</span>
          <strong>{info?.os.caption || "未读取"}</strong>
          {info?.os.buildNumber && <small>Build {info.os.buildNumber}</small>}
        </div>
        <div className="info-card">
          <span>处理器</span>
          <strong>{info?.cpu || "未读取"}</strong>
        </div>
        <div className="info-card">
          <span>内存</span>
          <strong>{info?.memoryGb ? `${info.memoryGb} GB` : "未读取"}</strong>
        </div>
      </div>

      <div className="hardware-grid">
        <section className="settings-card hardware-card">
          <div className="section-title">
            <HardDriveDownload size={15} />
            硬盘
          </div>
          <div className="hardware-list">
            {(info?.disks ?? []).map((disk) => (
              <div className="hardware-row" key={disk.name}>
                <div>
                  <strong>
                    {disk.name} {disk.volumeName ? `· ${disk.volumeName}` : ""}
                  </strong>
                  <span>{disk.fileSystem || "未知文件系统"}</span>
                </div>
                <em>
                  {disk.freeGb} GB 可用 / {disk.sizeGb} GB
                </em>
              </div>
            ))}
            {(info?.physicalDisks ?? []).map((disk, index) => (
              <div className="hardware-row subtle" key={`${disk.model}-${index}`}>
                <div>
                  <strong>{disk.model || "未知磁盘"}</strong>
                  <span>
                    {disk.interfaceType || "未知接口"} ·{" "}
                    {disk.mediaType || "未知介质"}
                  </span>
                </div>
                <em>{disk.sizeGb ? `${disk.sizeGb} GB` : "容量未知"}</em>
              </div>
            ))}
            {!info?.disks?.length && !info?.physicalDisks?.length && (
              <p className="empty-text">还没有读取到硬盘信息。</p>
            )}
          </div>
        </section>

        <section className="settings-card hardware-card">
          <div className="section-title">
            <Cpu size={15} />
            显卡与编码
          </div>
          <div className="hardware-list">
            {(info?.gpus ?? []).map((gpu) => (
              <div className="hardware-row" key={`${gpu.name}-${gpu.driverVersion}`}>
                <div>
                  <strong>{gpu.name || "未知显卡"}</strong>
                  <span>驱动 {gpu.driverVersion || "未知"}</span>
                </div>
                <em>
                  {gpu.adapterRamGb ? `${gpu.adapterRamGb} GB` : "显存未知"}
                </em>
              </div>
            ))}
            {!info?.gpus?.length && (
              <p className="empty-text">还没有读取到显卡信息。</p>
            )}
          </div>
          <div className="utf8-panel">
            <div>
              <strong>UTF-8 beta</strong>
              <span>
                {info?.utf8BetaEnabled
                  ? "当前已开启，重启后状态以系统为准。"
                  : "当前未开启，可用于部分跨语言软件的乱码场景。"}
              </span>
            </div>
            <button
              className={info?.utf8BetaEnabled ? "secondary-button danger" : "primary-button"}
              type="button"
              disabled={isSettingUtf8 || !info}
              onClick={() => setUtf8Beta(!info?.utf8BetaEnabled)}
            >
              <Keyboard size={15} />
              {isSettingUtf8
                ? "设置中"
                : info?.utf8BetaEnabled
                  ? "关闭 UTF-8"
                  : "开启 UTF-8"}
            </button>
          </div>
        </section>
      </div>

      <div className="system-layout">
        <section className="settings-card adapter-panel">
          <div className="section-title">
            <Network size={15} />
            网卡
          </div>
          <div className="adapter-list">
            {(info?.adapters ?? []).map((adapter) => (
              <button
                className={`adapter-button ${adapter.id === selectedAdapterId ? "active" : ""}`}
                key={adapter.id}
                type="button"
                onClick={() => selectAdapter(adapter)}
              >
                <span>{adapter.name}</span>
                <small>
                  {adapter.status} · {adapter.dhcpEnabled ? "DHCP" : "静态"}
                </small>
              </button>
            ))}
            {!info?.adapters?.length && (
              <EmptyState
                icon={MonitorOff}
                title="还没有读取到网卡"
                description="点击右上角“刷新配置”按钮读取本机网卡信息。"
                compact
              />
            )}
          </div>
        </section>

        <section className="settings-card network-config-card">
          <div className="section-title">
            <Gauge size={15} />
            IP / DNS
          </div>
          {selectedAdapter && (
            <div className="adapter-summary">
              <strong>
                {selectedAdapter.description || selectedAdapter.name}
              </strong>
              <span>MAC：{selectedAdapter.macAddress || "未知"}</span>
            </div>
          )}
          <div className="form-grid">
            <label className="field-label">
              IPv4 地址
              <input
                value={form.ipAddress}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ipAddress: event.target.value,
                  }))
                }
                placeholder="例如 192.168.1.88"
              />
            </label>
            <label className="field-label">
              前缀长度
              <input
                value={form.prefixLength}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    prefixLength: event.target.value,
                  }))
                }
                placeholder="24"
              />
            </label>
            <label className="field-label">
              默认网关
              <input
                value={form.gateway}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    gateway: event.target.value,
                  }))
                }
                placeholder="例如 192.168.1.1"
              />
            </label>
            <label className="field-label">
              DNS 服务器
              <input
                value={form.dnsServers}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dnsServers: event.target.value,
                  }))
                }
                placeholder="223.5.5.5, 119.29.29.29"
              />
            </label>
          </div>
          <div className="settings-actions">
            <button
              className="primary-button"
              type="button"
              disabled={isApplying || !selectedAdapter}
              onClick={() => applyNetworkConfig("dns")}
            >
              <Save size={15} />
              应用 DNS
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={isApplying || !selectedAdapter}
              onClick={() => applyNetworkConfig("static")}
            >
              应用静态 IP
            </button>
            <button
              className="secondary-button danger"
              type="button"
              disabled={isApplying || !selectedAdapter}
              onClick={() => applyNetworkConfig("dhcp")}
            >
              恢复自动获取
            </button>
          </div>
        </section>
      </div>

      <section className="settings-card dns-card">
        <div className="dns-head">
          <div>
            <div className="section-title">
              <HardDriveDownload size={15} />
              公共 DNS 推荐
            </div>
            <p>
              先测延迟，再点“使用”填入上方 DNS。实际快慢也会受运营商和地区影响。
            </p>
          </div>
          <button
            className="secondary-button"
            type="button"
            disabled={isTestingDns}
            onClick={testDnsServers}
          >
            <Gauge size={15} />
            {isTestingDns ? "检测中" : "延迟检测"}
          </button>
        </div>

        <div className="dns-provider-grid">
          {publicDnsProviders.map((provider) => (
            <div className="dns-provider" key={provider.id}>
              <div>
                <strong>{provider.name}</strong>
                <span>{provider.servers.join(" / ")}</span>
                <small>{provider.note}</small>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    dnsServers: formatDnsServers(provider.servers),
                  }))
                }
              >
                使用
              </button>
            </div>
          ))}
        </div>

        {dnsResults.length > 0 && (
          <div className="dns-table">
            {dnsResults.map((result) => (
              <div
                className={`dns-row ${result.ok ? "ok" : "failed"}`}
                key={result.server}
              >
                <span>{result.provider ?? "公共 DNS"}</span>
                <strong>{result.server}</strong>
                <em>
                  {result.ok ? `${result.latencyMs}ms` : result.error || "失败"}
                </em>
                <button
                  className="text-button"
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      dnsServers: result.server,
                    }))
                  }
                >
                  使用
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsView({
  settings,
  toolRootDraft,
  setToolRootDraft,
  saveToolRootPath,
  chooseToolRootPath,
  resetToolRootPath,
  updateInfo,
  isCheckingUpdate,
  checkForUpdates,
  openUpdateRelease,
  saveUpdateOnStartup,
  saveAiSettings,
  saveTheme,
  saveGlassSettings,
  onLog,
  logs,
  customTools,
  categories,
  allCategories,
  onAddAiTool,
  onRemoveCustomTool,
  onExportConfig,
  onImportConfig,
}: {
  settings: ToolPathSettings;
  toolRootDraft: string;
  setToolRootDraft: (value: string) => void;
  saveToolRootPath: (path?: string) => Promise<void>;
  chooseToolRootPath: () => Promise<void>;
  resetToolRootPath: () => Promise<void>;
  updateInfo?: UpdateInfo;
  isCheckingUpdate: boolean;
  checkForUpdates: (silent?: boolean) => Promise<void>;
  openUpdateRelease: () => Promise<void>;
  saveUpdateOnStartup: (updateOnStartup: boolean) => Promise<void>;
  saveAiSettings: (aiSettings: {
    aiBaseUrl: string;
    aiApiKey: string;
    aiModel: string;
  }) => Promise<void>;
  saveTheme: (themeId: ThemeId) => Promise<void>;
  saveGlassSettings: (glass: {
    glassOpacity: number;
    glassBlur: number;
  }) => Promise<void>;
  onLog: (level: LogEntry["level"], message: string) => void;
  logs: LogEntry[];
  customTools: Tool[];
  categories: CategoryDefinition[];
  allCategories: CategoryDefinition[];
  onAddAiTool: (
    candidate: AiToolCandidate,
    context: AiToolGitHubContext,
    categoryId?: string,
  ) => Promise<void>;
  onRemoveCustomTool: (toolId: string) => Promise<void>;
  onExportConfig: () => Promise<void>;
  onImportConfig: () => Promise<void>;
}) {
  const [aiDraft, setAiDraft] = useState({
    aiBaseUrl: settings.aiBaseUrl,
    aiApiKey: settings.aiApiKey,
    aiModel: settings.aiModel,
    toolUrl: "",
    categoryId: customAddCategoryId,
  });
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [showModelList, setShowModelList] = useState(false);
  const [aiBusy, setAiBusy] = useState<
    "models" | "test" | "generate" | undefined
  >();
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<
    { downloaded: number; total: number; percent: number } | undefined
  >();

  useEffect(() => {
    setAiDraft((current) => ({
      ...current,
      aiBaseUrl: settings.aiBaseUrl,
      aiApiKey: settings.aiApiKey,
      aiModel: settings.aiModel,
    }));
  }, [settings.aiBaseUrl, settings.aiApiKey, settings.aiModel]);

  useEffect(() => {
    if (!window.winKitBox) {
      return;
    }
    return window.winKitBox.onDownloadUpdateProgress((progress) => {
      setDownloadProgress(progress);
    });
  }, []);

  async function downloadAndInstallUpdate() {
    if (!window.winKitBox) {
      onLog("warning", "浏览器预览模式不能下载更新。");
      return;
    }

    const setupAsset = updateInfo?.assets
      ? findSetupAsset(updateInfo.assets)
      : undefined;

    if (!setupAsset) {
      onLog("error", "未找到可用的安装版更新包，请打开发行页手动下载。");
      return;
    }

    setIsDownloadingUpdate(true);
    setDownloadProgress(undefined);

    try {
      onLog("info", `正在下载 v${updateInfo?.latestVersion} 更新包...`);
      const { filePath } = await window.winKitBox.downloadUpdate({
        downloadUrl: setupAsset.browser_download_url,
        fileName: setupAsset.name,
      });
      onLog("success", "更新包下载完成，即将静默安装并重启应用。");
      await window.winKitBox.applyUpdate({ installerPath: filePath });
    } catch (error) {
      onLog(
        "error",
        error instanceof Error ? error.message : "下载或安装更新失败。",
      );
      setIsDownloadingUpdate(false);
      setDownloadProgress(undefined);
    }
  }

  async function detectModels() {
    if (!window.winKitBox) {
      return;
    }

    setAiBusy("models");
    try {
      const result = await window.winKitBox.listAiModels({
        baseUrl: aiDraft.aiBaseUrl,
        apiKey: aiDraft.aiApiKey,
      });
      setDetectedModels(result.models);
      setShowModelList(true);
      if (!aiDraft.aiModel && result.models[0]) {
        setAiDraft((current) => ({ ...current, aiModel: result.models[0] }));
      }
      onLog("success", `已检测到 ${result.models.length} 个可用模型。`);
    } catch (error) {
      onLog("error", error instanceof Error ? error.message : "模型检测失败。");
    } finally {
      setAiBusy(undefined);
    }
  }

  async function testAiConnection() {
    if (!window.winKitBox) {
      return;
    }

    setAiBusy("test");
    try {
      await window.winKitBox.testAiConnection({
        baseUrl: aiDraft.aiBaseUrl,
        apiKey: aiDraft.aiApiKey,
        model: aiDraft.aiModel,
      });
      await saveAiSettings({
        aiBaseUrl: aiDraft.aiBaseUrl,
        aiApiKey: aiDraft.aiApiKey,
        aiModel: aiDraft.aiModel,
      });
      onLog("success", "AI 接口连通性测试通过。");
    } catch (error) {
      onLog(
        "error",
        error instanceof Error ? error.message : "AI 连通性测试失败。",
      );
    } finally {
      setAiBusy(undefined);
    }
  }

  async function generateAiTool() {
    if (!window.winKitBox) {
      return;
    }

    setAiBusy("generate");
    try {
      await saveAiSettings({
        aiBaseUrl: aiDraft.aiBaseUrl,
        aiApiKey: aiDraft.aiApiKey,
        aiModel: aiDraft.aiModel,
      });
      const result = await window.winKitBox.generateAiTool({
        baseUrl: aiDraft.aiBaseUrl,
        apiKey: aiDraft.aiApiKey,
        model: aiDraft.aiModel,
        toolUrl: aiDraft.toolUrl,
        categoryId: aiDraft.categoryId,
      });
      await onAddAiTool(result.candidate, result.context, aiDraft.categoryId);
      setAiDraft((current) => ({ ...current, toolUrl: "" }));
    } catch (error) {
      onLog(
        "error",
        error instanceof Error ? error.message : "AI 添加工具失败。",
      );
    } finally {
      setAiBusy(undefined);
    }
  }

  return (
    <div className="settings-page">
      <header className="command-bar page-topbar">
        <div className="command-bar-title">
          <div className="command-bar-icon settings-icon">
            <Settings size={22} />
          </div>
          <div>
            <p className="eyebrow">设置</p>
            <h2>工具目录、AI、主题和配置同步</h2>
          </div>
        </div>
      </header>

      <div className="settings-layout">
        <section className="settings-card full-span">
          <div className="section-title">
            <Sparkles size={15} />
            主题与背景
          </div>

          <div className="section-title compact-title">颜色主题</div>
          <div className="theme-grid">
            {themeDefinitions.filter((theme) => isSolidThemeId(theme.id)).map((theme) => {
              const active = settings.themeId === theme.id;

              return (
                <button
                  className={`theme-card ${active ? "active" : ""}`}
                  key={theme.id}
                  type="button"
                  onClick={() => saveTheme(theme.id)}
                >
                  <span
                    className="theme-swatch"
                    style={{
                      background: theme.background,
                      borderColor: theme.accent,
                    }}
                  />
                  <strong>{theme.name}</strong>
                  <small>{theme.description}</small>
                </button>
              );
            })}
          </div>

          <div className="section-title compact-title">图片背景主题</div>
          <div className="background-grid">
            {themeDefinitions.filter((theme) => isImageThemeId(theme.id)).map((theme) => {
              const active = settings.themeId === theme.id;

              return (
                <button
                  aria-pressed={active}
                  className={`background-card ${active ? "active" : ""}`}
                  key={theme.id}
                  type="button"
                  onClick={() => saveTheme(theme.id)}
                >
                  <span
                    className="background-thumb"
                    style={{
                      backgroundImage: toCssUrl(theme.imageBackground ?? ""),
                      borderColor: theme.accent,
                    }}
                  />
                  <strong>{theme.name}</strong>
                  <small>{theme.description}</small>
                </button>
              );
            })}
          </div>

          <div className="glass-controls">
            <div className="glass-slider">
              <div className="slider-label">
                <span>面板透明度</span>
                <strong>{Math.round(settings.glassOpacity * 100)}%</strong>
              </div>
              <input
                type="range"
                min={10}
                max={95}
                value={Math.round(settings.glassOpacity * 100)}
                onChange={(event) =>
                  void saveGlassSettings({
                    glassOpacity: Number(event.target.value) / 100,
                    glassBlur: settings.glassBlur,
                  })
                }
              />
            </div>
            <div className="glass-slider">
              <div className="slider-label">
                <span>背景柔化</span>
                <strong>{settings.glassBlur}px</strong>
              </div>
              <input
                type="range"
                min={4}
                max={48}
                value={settings.glassBlur}
                onChange={(event) =>
                  void saveGlassSettings({
                    glassOpacity: settings.glassOpacity,
                    glassBlur: Number(event.target.value),
                  })
                }
              />
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="section-title">
            <HardDriveDownload size={15} />
            工具目录
          </div>
          <div className="path-row">
            <input
              value={toolRootDraft}
              onChange={(event) => setToolRootDraft(event.target.value)}
              placeholder="选择工具安装目录"
            />
            <button
              className="secondary-button"
              type="button"
              onClick={chooseToolRootPath}
            >
              选择
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => saveToolRootPath()}
            >
              保存
            </button>
          </div>
          <div className="settings-actions">
            <button
              className="text-button"
              type="button"
              onClick={resetToolRootPath}
            >
              恢复默认
            </button>
            <span>当前默认目录：{settings.defaultToolRootPath}</span>
          </div>
        </section>

        <section
          className={`settings-card update-card ${updateInfo?.hasUpdate ? "has-update" : ""}`}
        >
          <div className="update-head">
            <div>
              <div className="section-title">
                <RotateCcw size={15} />
                更新
              </div>
              <p>
                当前 v{__APP_VERSION__}
                {updateInfo?.latestVersion
                  ? ` · 最新 v${updateInfo.latestVersion}`
                  : ""}
              </p>
            </div>
            {updateInfo?.hasUpdate && <strong>有新版</strong>}
          </div>
          <label className="setting-row">
            <input
              type="checkbox"
              checked={settings.updateOnStartup}
              onChange={(event) =>
                void saveUpdateOnStartup(event.target.checked)
              }
            />
            <span>启动时自动检测更新</span>
          </label>
          <div className="settings-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={isCheckingUpdate || isDownloadingUpdate}
              onClick={() => checkForUpdates(false)}
            >
              <RotateCcw size={15} />
              {isCheckingUpdate ? "检查中" : "检查更新"}
            </button>
            {updateInfo?.hasUpdate && (
              <button
                className="primary-button"
                type="button"
                disabled={isDownloadingUpdate}
                onClick={() => downloadAndInstallUpdate()}
              >
                <Download size={15} />
                {isDownloadingUpdate
                  ? "下载中"
                  : `下载并安装 v${updateInfo.latestVersion}`}
              </button>
            )}
            <button
              className="secondary-button"
              type="button"
              onClick={openUpdateRelease}
            >
              <ExternalLink size={15} />
              发行页
            </button>
          </div>
          {downloadProgress && (
            <div className="update-progress">
              <div className="update-progress-track">
                <div
                  className="update-progress-bar"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <span className="update-progress-text">
                {downloadProgress.percent}% · {formatBytes(downloadProgress.downloaded)} / {formatBytes(downloadProgress.total)}
              </span>
            </div>
          )}
          {updateInfo?.error && (
            <p className="settings-error">{updateInfo.error}</p>
          )}
        </section>

        <section className="settings-card full-span">
          <div className="section-title">
            <Plus size={15} />
            AI 添加工具
          </div>
          <div className="custom-tool-form ai-tool-form">
            <label className="field-label">
              API URL
              <input
                value={aiDraft.aiBaseUrl}
                onChange={(event) =>
                  setAiDraft((current) => ({
                    ...current,
                    aiBaseUrl: event.target.value,
                  }))
                }
                placeholder="https://api.openai.com/v1"
              />
            </label>
            <label className="field-label">
              API Key
              <input
                value={aiDraft.aiApiKey}
                onChange={(event) =>
                  setAiDraft((current) => ({
                    ...current,
                    aiApiKey: event.target.value,
                  }))
                }
                placeholder="sk-..."
                type="password"
              />
            </label>
            <label className="field-label ai-model-field">
              模型名称
              <input
                value={aiDraft.aiModel}
                onChange={(event) =>
                  setAiDraft((current) => ({
                    ...current,
                    aiModel: event.target.value,
                  }))
                }
                placeholder="gpt-4o-mini"
              />
              {detectedModels.length > 0 && (
                <div className="ai-model-panel">
                  <div className="ai-model-panel-header">
                    <span>检测到的模型（点击填入）</span>
                    <button
                      className="icon-button tiny"
                      type="button"
                      onClick={() => setShowModelList((current) => !current)}
                    >
                      {showModelList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                  {showModelList && (
                    <div className="ai-model-list">
                      {detectedModels.map((model) => (
                        <button
                          key={model}
                          className={`ai-model-item ${aiDraft.aiModel === model ? "active" : ""}`}
                          type="button"
                          onClick={() =>
                            setAiDraft((current) => ({
                              ...current,
                              aiModel: model,
                            }))
                          }
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </label>
            <label className="field-label wide">
              工具主页 / 下载页
              <input
                value={aiDraft.toolUrl}
                onChange={(event) =>
                  setAiDraft((current) => ({
                    ...current,
                    toolUrl: event.target.value,
                  }))
                }
                placeholder="https://github.com/owner/repo 或 https://example.com/download"
              />
            </label>
            <label className="field-label">
              添加到分类
              <select
                value={aiDraft.categoryId}
                onChange={(event) =>
                  setAiDraft((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="settings-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={Boolean(aiBusy)}
              onClick={detectModels}
            >
              <Search size={15} />
              {aiBusy === "models" ? "检测中" : "检测可用模型"}
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={Boolean(aiBusy)}
              onClick={testAiConnection}
            >
              <Gauge size={15} />
              {aiBusy === "test" ? "测试中" : "测试连通性"}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={Boolean(aiBusy)}
              onClick={generateAiTool}
            >
              <Plus size={15} />
              {aiBusy === "generate" ? "生成中" : "AI 添加工具"}
            </button>
          </div>
          {customTools.length > 0 && (
            <div className="custom-tool-list">
              {customTools.map((tool) => (
                <div className="custom-tool-row" key={tool.id}>
                  <div>
                    <strong>{tool.name}</strong>
                    <span>
                      {getCategoryName(tool.category, allCategories)} ·{" "}
                      {describeCustomTool(tool)}
                    </span>
                  </div>
                  <button
                    className="secondary-button danger"
                    type="button"
                    onClick={() => onRemoveCustomTool(tool.id)}
                  >
                    <Trash2 size={14} />
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="settings-card">
          <div className="section-title">
            <Upload size={15} />
            配置同步
          </div>
          <p className="settings-text">
            导出的配置只包含工具目录、更新设置、当前主题、已选工具和自定义工具，不包含安装包和本地背景图。
          </p>
          <div className="settings-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onExportConfig}
            >
              <Download size={15} />
              导出配置
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onImportConfig}
            >
              <Upload size={15} />
              导入配置
            </button>
          </div>
        </section>

        <section className="settings-card log-panel-settings">
          <div className="section-title">
            <Info size={15} />
            日志
          </div>
          <div className="log-list">
            {logs.map((log) => (
              <div className={`log-entry ${log.level}`} key={log.id}>
                {log.message}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function getToolPlaceholder(tool: Tool) {
  const first = tool.name.trim().slice(0, 1);
  return first || "?";
}

function describeCustomTool(tool: Tool) {
  if (tool.wingetId) {
    return `winget · ${tool.wingetId}`;
  }

  if (tool.installer) {
    return tool.installer.assetPattern
      ? `GitHub 安装包 · ${tool.installer.assetPattern}`
      : `下载安装包 · ${tool.installer.fileName}`;
  }

  if (tool.portable) {
    return tool.portable.assetPattern
      ? `GitHub 便携包 · ${tool.portable.assetPattern}`
      : `下载便携包 · ${tool.portable.executable}`;
  }

  if (tool.customInstallCommand) {
    return "自定义命令";
  }

  return tool.repoUrl ?? tool.homepage;
}

function ToolCard({
  tool,
  toolState,
  selected,
  categories,
  onToggle,
  onInstall,
  onUninstall,
  onLaunch,
  onOpen,
  onAiFix,
  onSetCategory,
}: {
  tool: Tool;
  toolState: ToolRuntimeState;
  selected: boolean;
  categories: CategoryDefinition[];
  onToggle: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onLaunch: () => void;
  onOpen: () => void;
  onAiFix: () => void;
  onSetCategory: (categoryId: string) => void;
}) {
  const Icon = categoryIcons[tool.category];
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = getToolLogoUrl(tool);
  const installDisabled =
    toolState.status === "installing" ||
    toolState.status === "uninstalling" ||
    toolState.status === "checking";
  const uninstallDisabled = toolState.status !== "installed";
  const openDisabled =
    toolState.status === "installing" ||
    toolState.status === "uninstalling" ||
    toolState.status === "opening" ||
    toolState.status === "checking" ||
    toolState.status === "not-installed" ||
    toolState.launcherFound === false;

  return (
    <article
      className={`tool-card ${selected ? "selected" : ""} status-${toolState.status}`}
    >
      <button
        className="select-check"
        type="button"
        aria-label={`选择 ${tool.name}`}
        onClick={onToggle}
      >
        {selected && <Check size={15} />}
      </button>

      <div className="tool-card-header">
        <div className="tool-icon">
          {logoUrl && !logoFailed ? (
            <img
              className="tool-logo"
              src={logoUrl}
              alt=""
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className={`tool-logo-placeholder ${tool.category}`}>
              {getToolPlaceholder(tool)}
            </div>
          )}
        </div>
        <div>
          <h3>{tool.name}</h3>
          <p>{tool.summary}</p>
        </div>
      </div>

      <p className="tool-description">{tool.description}</p>

      <div className="tag-row">
        <span>{sourceLabels[tool.source]}</span>
        <span>{tool.license}</span>
        <span>{formatStars(tool.stars)} stars</span>
      </div>

      <div className="tool-footer">
        <select
          className="tool-category-select"
          value={tool.category}
          onChange={(event) => onSetCategory(event.target.value)}
          title="修改分类"
        >
          <option value={uncategorizedCategoryId}>未分类</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <div className="tool-meta-pills">
          <span
            className={`tool-status-pill ${toolState.status}`}
            title={toolState.message}
          >
            {getStatusLabel(toolState.status)}
          </span>
          <span className={`risk-pill ${tool.risk}`}>
            {riskLabels[tool.risk]}
          </span>
          {tool.requiresAdmin && <span className="admin-pill">管理员</span>}
        </div>
        <div className="tool-actions">
          <button
            className="mini-action install"
            type="button"
            disabled={installDisabled}
            onClick={onInstall}
          >
            <Download size={14} />
            {getInstallButtonLabel(toolState.status)}
          </button>
          {toolState.status === "failed" && (
            <button
              className="mini-action ai-fix"
              type="button"
              onClick={onAiFix}
            >
              <Sparkles size={14} />
              AI修复
            </button>
          )}
          <button
            className="mini-action open"
            type="button"
            disabled={openDisabled}
            onClick={onLaunch}
          >
            <Play size={14} />
            {toolState.status === "opening" ? "打开中" : "打开"}
          </button>
          <button
            className="mini-action uninstall"
            type="button"
            disabled={uninstallDisabled}
            onClick={onUninstall}
          >
            <Trash2 size={14} />
            {toolState.status === "uninstalling" ? "卸载中" : "卸载"}
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={`打开 ${tool.name} 来源`}
            onClick={onOpen}
          >
            <ExternalLink size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
