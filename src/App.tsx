import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
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
  Wrench,
  X,
} from "lucide-react";
import { AddToolView, type AddToolFocus } from "./AddToolView";
import { DiscoverView } from "./DiscoverView";
import { LogsView, type LogsViewFocus } from "./LogsView";
import winkitboxIconUrl from "../assets/icon/winkitbox-icon.png";
import developerAvatarUrl from "../assets/developer/avatar.jpg";
import assistantWorkbenchUrl from "../assets/decor/assistant-workbench.png";
import {
  categoryLabels,
  customAddCategoryId,
  createUserCategory,
  getActiveCategoryDefinitions,
  getCategoryName,
  getDefaultCategoryDefinitions,
  normalizeCategoryDefinitions,
  reorderUserCategories,
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
import {
  addActivityLogEntry,
  getActivityLogStats,
  getLatestToolFailure,
  normalizeActivityLog,
  type ActivityLogEntry,
  type ActivityLogInput,
} from "./core/activityLog";
import {
  addAiLogEntry,
  normalizeAiLog,
  type AiLogEntry,
  type AiLogInput,
} from "./core/aiLog";
import {
  buildExportConfig,
  createCustomTool,
  normalizeStoredCustomTools,
  parseImportedConfig,
  type CustomToolInput,
} from "./core/config";
import {
  getConfigBackupLabel,
  normalizeConfigBackups,
  type ConfigBackupEntry,
} from "./core/configBackups";
import { createDashboardStats } from "./core/dashboardStats";
import {
  getVisibleCatalogTools,
  toggleCatalogQuickFilter,
  type CatalogQuickFilter,
} from "./core/catalogFilters";
import {
  categoryDragMimeType,
  createCategoryDragPayload,
  createToolDragPayload,
  getDroppableCategoryId,
  parseCategoryDragPayload,
  parseToolDragPayload,
  toolDragMimeType,
} from "./core/catalogDrag";
import {
  createEnvironmentChecks,
  createEnvironmentHealthSummary,
  getRecommendedEnvironmentRepairs,
  type EnvironmentSnapshot,
  type EnvironmentRepairAction,
} from "./core/environment";
import { createLaunchDescriptor, getToolLogoUrl } from "./core/launcher";
import {
  customDnsDomainId,
  dnsTestDomains,
  flattenDnsServers,
  formatDnsServers,
  getDnsTestDomainLabel,
  isValidDomain,
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
} from "./core/planner";
import { parseRunEventLine, type RunEvent } from "./core/runEvents";
import {
  buildToolUpdateCommand,
  createToolUpdateDescriptors,
  getToolUpdateStrategy,
  type ToolUpdateCheckResult,
} from "./core/toolUpdates";
import {
  createToolSourceHealthDescriptors,
  getToolSourceKindLabel,
  getToolUpdateStrategyDescription,
  getToolUpdateStrategyLabel,
  summarizeToolSourceHealth,
  type ToolSourceHealthResult,
} from "./core/toolSourceHealth";
import {
  addTaskQueueItem,
  completeTaskQueueItem,
  failTaskQueueItem,
  getTaskStatusLabel,
  getTaskQueueStats,
  startTaskQueueItem,
  type TaskQueueItem,
  type TaskQueueKind,
  type TaskQueueStats,
  type TaskQueueStatus,
} from "./core/taskQueue";
import {
  applyDetectionResults,
  applyRunEventSnapshot,
  createEmptyInstallProgress,
  getInstallButtonLabel,
  getStatusLabel,
  isActiveStatus,
  markToolsChecking,
  type DetectionMergeOptions,
  type InstallProgress,
  type ToolRuntimeState,
  type ToolRuntimeStates,
} from "./core/toolStatus";
import {
  defaultThemeId,
  getThemeDefinition,
  getThemeImageBackgroundUrl,
  isThemeId,
  themeDefinitions,
  type ThemeId,
} from "./core/themes";
import { findSetupAsset, type UpdateInfo } from "./core/update";
import type { ProxyMode } from "./core/github";

type CategoryFilter = "all" | ToolCategory;
type ActiveView =
  | "catalog"
  | "discover"
  | "system"
  | "updates"
  | "addTool"
  | "logs"
  | "settings";

type LogEntry = {
  id: number;
  level: "info" | "success" | "warning" | "error";
  message: string;
};

export type PageFeedback = {
  level: LogEntry["level"];
  message: string;
};

type ToolPathSettings = {
  toolRootPath: string;
  defaultToolRootPath: string;
  updateOnStartup: boolean;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  proxyMode: ProxyMode;
  proxyManual: string;
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
  environment?: EnvironmentSnapshot;
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
const ignoredToolUpdatesStorageKey = "winkitbox:ignored-tool-updates:v1";
const fallbackSettings: ToolPathSettings = {
  toolRootPath: "%LOCALAPPDATA%\\WinKitBox",
  defaultToolRootPath: "%LOCALAPPDATA%\\WinKitBox",
  updateOnStartup: true,
  aiBaseUrl: "",
  aiApiKey: "",
  aiModel: "",
  proxyMode: "system",
  proxyManual: "",
  themeId: defaultThemeId,
  themeBackgrounds: {},
  glassOpacity: 0.72,
  glassBlur: 28,
  customTools: [],
  customCategories: getDefaultCategoryDefinitions(),
  toolCategoryOverrides: {},
};
const releasePageUrl = "https://github.com/575674384-stack/winkitbox/releases";
const developerGitHubUrl = "https://github.com/575674384-stack";

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

function getAiResponseText(payload: unknown) {
  if (payload && typeof payload === "object" && "aiResponse" in payload) {
    const response = (payload as { aiResponse?: unknown }).aiResponse;
    if (typeof response === "string" && response.trim()) {
      return response;
    }
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload ?? "");
  }
}

function createTaskId(kind: string, target: string) {
  return `${kind}-${target}-${Date.now()}`;
}

function formatTaskDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const totalSeconds = Math.round(durationMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m${seconds ? `${seconds}s` : ""}`;
}

export function App() {
  const [customTools, setCustomTools] = useState<Tool[]>(() =>
    normalizeStoredCustomTools(loadCustomTools()),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initialTools = [...catalogTools, ...normalizeStoredCustomTools(loadCustomTools())];
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
  const [failedOnly, setFailedOnly] = useState(false);
  const [installedOnly, setInstalledOnly] = useState(false);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [updatableOnly, setUpdatableOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: ++logCounter,
      level: "info",
      message: "WinKitBox 已就绪。安装、打开、卸载都会自动刷新状态。",
    },
  ]);
  const logsRef = useRef<LogEntry[]>(logs);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [aiLog, setAiLog] = useState<AiLogEntry[]>([]);
  const [configBackups, setConfigBackups] = useState<ConfigBackupEntry[]>([]);
  const [taskQueue, setTaskQueue] = useState<TaskQueueItem[]>([]);
  const taskQueueRef = useRef<TaskQueueItem[]>([]);
  const [logsViewFocus, setLogsViewFocus] = useState<LogsViewFocus>({
    nonce: 0,
  });
  const [addToolFocus, setAddToolFocus] = useState<AddToolFocus>({
    nonce: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [toolStates, setToolStates] = useState<ToolRuntimeStates>({});
  const [installProgress, setInstallProgress] = useState<InstallProgress>(() =>
    createEmptyInstallProgress(),
  );
  const [toolUpdateResults, setToolUpdateResults] = useState<Record<string, ToolUpdateCheckResult>>({});
  const [toolSourceHealthResults, setToolSourceHealthResults] = useState<Record<string, ToolSourceHealthResult>>({});
  const [ignoredToolUpdateVersions, setIgnoredToolUpdateVersions] = useState<Record<string, string>>(
    () => {
      try {
        const parsed = JSON.parse(
          localStorage.getItem(ignoredToolUpdatesStorageKey) || "{}",
        );
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? Object.fromEntries(
              Object.entries(parsed).filter(
                ([, value]) => typeof value === "string" && value,
              ),
            ) as Record<string, string>
          : {};
      } catch {
        return {};
      }
    },
  );
  const [isCheckingToolUpdates, setIsCheckingToolUpdates] = useState(false);
  const [isCheckingToolSources, setIsCheckingToolSources] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState(customAddCategoryId);
  const [settings, setSettings] = useState<ToolPathSettings>(fallbackSettings);
  const [toolRootDraft, setToolRootDraft] = useState(
    fallbackSettings.toolRootPath,
  );
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<PageFeedback>();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [detailToolId, setDetailToolId] = useState<string>();
  const [draggedToolId, setDraggedToolId] = useState<string>();
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string>();
  const [draggedCategoryId, setDraggedCategoryId] = useState<string>();
  const [categorySortOverId, setCategorySortOverId] = useState<string>();

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
  const installedTools = useMemo(
    () => allTools.filter((tool) => toolStates[tool.id]?.status === "installed"),
    [allTools, toolStates],
  );
  const failedToolCount = useMemo(
    () => allTools.filter((tool) => toolStates[tool.id]?.status === "failed").length,
    [allTools, toolStates],
  );
  const updatableToolCount = useMemo(
    () =>
      allTools.filter((tool) => {
        const status = toolUpdateResults[tool.id]?.status;
        return status === "available" || status === "reinstall";
      }).length,
    [allTools, toolUpdateResults],
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
  const activityStats = useMemo(
    () => getActivityLogStats(activityLog),
    [activityLog],
  );
  const taskQueueStats = useMemo(
    () => getTaskQueueStats(taskQueue),
    [taskQueue],
  );
  const detailTool = useMemo(
    () => allTools.find((tool) => tool.id === detailToolId),
    [allTools, detailToolId],
  );

  const visibleTools = useMemo(() => {
    return getVisibleCatalogTools(allTools, {
      activeCategory,
      customCategories: settings.customCategories,
      failedOnly,
      installedOnly,
      selectedIds,
      selectedOnly,
      query,
      toolStates,
      toolUpdateResults,
      updatableOnly,
    });
  }, [
    allTools,
    activeCategory,
    failedOnly,
    installedOnly,
    query,
    selectedIds,
    selectedOnly,
    settings.customCategories,
    toolStates,
    toolUpdateResults,
    updatableOnly,
  ]);
  const currentTheme = useMemo(
    () => getThemeDefinition(settings.themeId),
    [settings.themeId],
  );
  const currentThemeBackground =
    settings.themeBackgrounds[settings.themeId] ??
    getThemeImageBackgroundUrl(settings.themeId);
  const themeStyle = useMemo(
    () =>
      ({
        "--theme-background-image": currentThemeBackground
          ? toCssUrl(currentThemeBackground)
          : "none",
        "--theme-backdrop": currentTheme.background,
        "--glass-opacity": String(currentTheme.defaultGlassOpacity),
        "--glass-blur": `${currentTheme.defaultGlassBlur}px`,
      }) as CSSProperties,
    [currentTheme, currentThemeBackground],
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
            ? normalizeStoredCustomTools(nextSettings.customTools)
            : normalizeStoredCustomTools(loadCustomTools());
        const migratedThemeId = isThemeId(nextSettings.themeId)
          ? nextSettings.themeId
          : defaultThemeId;
        const normalizedSettings = {
          ...fallbackSettings,
          ...nextSettings,
          themeId: migratedThemeId,
          updateOnStartup: nextSettings.updateOnStartup !== false,
          customTools: storedCustomTools,
          customCategories: normalizeCategoryDefinitions(
            nextSettings.customCategories,
          ),
        };
        setCustomTools(storedCustomTools);
        setSettings(normalizedSettings);
        setToolRootDraft(normalizedSettings.toolRootPath);
        const backups = await window.winKitBox.getConfigBackups();
        setConfigBackups(normalizeConfigBackups(backups));
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
    void loadActivityLog();
    void loadAiLog();
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
    localStorage.setItem(
      ignoredToolUpdatesStorageKey,
      JSON.stringify(ignoredToolUpdateVersions),
    );
  }, [ignoredToolUpdateVersions]);

  useEffect(() => {
    if (!categoryNavigation.includes(activeCategory)) {
      setActiveCategory("all");
      setFailedOnly(false);
      setInstalledOnly(false);
      setSelectedOnly(false);
      setUpdatableOnly(false);
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

  function toggleQuickFilter(filter: CatalogQuickFilter) {
    const nextFilter = toggleCatalogQuickFilter(
      { failedOnly, installedOnly, selectedOnly, updatableOnly },
      filter,
    );

    setActiveView("catalog");
    setActiveCategory("all");
    setQuery("");
    setFailedOnly(nextFilter.failedOnly);
    setInstalledOnly(nextFilter.installedOnly);
    setSelectedOnly(nextFilter.selectedOnly);
    setUpdatableOnly(nextFilter.updatableOnly);
  }

  async function loadActivityLog() {
    if (!window.winKitBox) {
      return;
    }

    try {
      const entries = await window.winKitBox.getActivityLog();
      setActivityLog(normalizeActivityLog(entries));
    } catch {
      appendLog("warning", "读取操作历史失败，本次会保留实时日志。");
    }
  }

  function appendLog(level: LogEntry["level"], message: string) {
    if (!message) {
      return;
    }

    setLogs((current) => {
      const next = [
        {
        id: ++logCounter,
        level,
        message,
      },
      ...current,
      ].slice(0, 500);
      logsRef.current = next;
      return next;
    });
  }

  function reportSettingsFeedback(level: LogEntry["level"], message: string) {
    setSettingsFeedback({ level, message });
    appendLog(level, message);
  }

  async function recordActivity(input: ActivityLogInput) {
    if (!input.title) {
      return;
    }

    const entryInput =
      input.rawOutput || (input.status !== "error" && input.status !== "warning")
        ? input
        : {
            ...input,
            rawOutput: logsRef.current
              .slice(0, 80)
              .map((log) => `[${log.level}] ${log.message}`),
          };

    if (!window.winKitBox) {
      setActivityLog((current) => addActivityLogEntry(current, entryInput));
      return;
    }

    try {
      const entries = await window.winKitBox.addActivityLog(entryInput);
      setActivityLog(normalizeActivityLog(entries));
    } catch {
      setActivityLog((current) => addActivityLogEntry(current, entryInput));
    }
  }

  async function loadAiLog() {
    if (!window.winKitBox) {
      return;
    }

    try {
      const entries = await window.winKitBox.getAiLog();
      setAiLog(normalizeAiLog(entries));
    } catch {
      appendLog("warning", "读取 AI 日志失败，本次会保留实时日志。");
    }
  }

  async function recordAiLog(input: AiLogInput) {
    if (!input.title) {
      return;
    }

    if (!window.winKitBox) {
      setAiLog((current) => addAiLogEntry(current, input));
      return;
    }

    try {
      const entries = await window.winKitBox.addAiLog(input);
      setAiLog(normalizeAiLog(entries));
    } catch {
      setAiLog((current) => addAiLogEntry(current, input));
    }
  }

  async function clearActivityLog() {
    if (window.winKitBox) {
      try {
        const entries = await window.winKitBox.clearActivityLog();
        setActivityLog(normalizeActivityLog(entries));
        appendLog("success", "操作历史已清空。");
        return;
      } catch (error) {
        appendLog(
          "error",
          error instanceof Error ? error.message : "清空操作历史失败。",
        );
      }
    }

    setActivityLog([]);
  }

  async function clearAiLog() {
    if (window.winKitBox) {
      try {
        const entries = await window.winKitBox.clearAiLog();
        setAiLog(normalizeAiLog(entries));
        appendLog("success", "AI 日志已清空。");
        return;
      } catch (error) {
        appendLog(
          "error",
          error instanceof Error ? error.message : "清空 AI 日志失败。",
        );
      }
    }

    setAiLog([]);
  }

  async function refreshLogs() {
    await Promise.all([loadActivityLog(), loadAiLog()]);
  }

  function setTaskQueueState(
    updater: (current: readonly TaskQueueItem[]) => TaskQueueItem[],
  ) {
    setTaskQueue((current) => {
      const next = updater(current);
      taskQueueRef.current = next;
      return next;
    });
  }

  function createTask(
    input: {
      id: string;
      kind: TaskQueueKind;
      title: string;
      toolId?: string;
      toolName?: string;
      retryable?: boolean;
      retryKey?: string;
    },
  ) {
    setTaskQueueState((current) => addTaskQueueItem(current, input));
  }

  function startTask(taskId: string) {
    setTaskQueueState((current) => startTaskQueueItem(current, taskId));
  }

  function finishTask(
    taskId: string,
    status: Exclude<TaskQueueStatus, "queued" | "running" | "error">,
    message?: string,
    exitCode?: number | null,
  ) {
    setTaskQueueState((current) =>
      completeTaskQueueItem(current, taskId, { status, message, exitCode }),
    );
  }

  function failTask(taskId: string, message: string) {
    setTaskQueueState((current) => failTaskQueueItem(current, taskId, message));
  }

  function openLogsView(focus: Omit<LogsViewFocus, "nonce"> = {}) {
    setLogsViewFocus({
      ...focus,
      nonce: Date.now(),
    });
    setActiveView("logs");
  }

  function openAddToolView(focus: Omit<AddToolFocus, "nonce"> = {}) {
    setAddToolFocus({
      ...focus,
      nonce: Date.now(),
    });
    setActiveView("addTool");
  }

  async function exportActivityLogFile(
    content: string,
    format: "json" | "txt",
    visibleCount: number,
  ) {
    const fileName = `winkitbox-logs-${new Date()
      .toISOString()
      .slice(0, 10)}.${format}`;

    if (window.winKitBox?.saveLogFile) {
      const result = await window.winKitBox.saveLogFile({
        content,
        fileName,
        format,
      });
      if (!result.canceled) {
        appendLog("success", `日志已导出：${result.filePath}`);
      }
      return;
    }

    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    appendLog("success", `已导出 ${visibleCount} 条日志。`);
  }

  async function exportAiLogFile(
    content: string,
    format: "json" | "txt",
    visibleCount: number,
  ) {
    const fileName = `winkitbox-ai-logs-${new Date()
      .toISOString()
      .slice(0, 10)}.${format}`;

    if (window.winKitBox?.saveLogFile) {
      const result = await window.winKitBox.saveLogFile({
        content,
        fileName,
        format,
      });
      if (!result.canceled) {
        appendLog("success", `AI 日志已导出：${result.filePath}`);
      }
      return;
    }

    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    appendLog("success", `已导出 ${visibleCount} 条 AI 日志。`);
  }

  function showToolFromLog(toolId: string) {
    const tool = allTools.find((item) => item.id === toolId);
    setActiveView("catalog");
    setActiveCategory("all");
    setInstalledOnly(false);
    setSelectedOnly(false);
    setQuery(tool?.name ?? toolId);
  }

  function fixToolFromLog(toolId: string) {
    const tool = allTools.find((item) => item.id === toolId);
    if (!tool) {
      appendLog("warning", `没有找到工具：${toolId}。`);
      return;
    }

    void fixToolWithAi(tool);
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
    detectionOptions: DetectionMergeOptions = {},
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
        applyDetectionResults(current, results, toolIds, detectionOptions),
      );
    } catch (error) {
      setToolStates((current) => {
        const next = { ...current };
        for (const toolId of toolIds) {
          const status = next[toolId]?.status;
          const canMarkUnknown =
            status === "checking" ||
            (detectionOptions.preserveActive === false &&
              status !== undefined &&
              isActiveStatus(status));

          if (canMarkUnknown) {
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
      proxyMode: nextSettings.proxyMode,
      proxyManual: nextSettings.proxyManual,
      themeId: nextSettings.themeId,
      themeBackgrounds: nextSettings.themeBackgrounds,
      glassOpacity: nextSettings.glassOpacity,
      glassBlur: nextSettings.glassBlur,
      customTools: nextSettings.customTools,
      customCategories: nextSettings.customCategories,
      toolCategoryOverrides: nextSettings.toolCategoryOverrides,
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
      reportSettingsFeedback("warning", "工具目录不能为空。");
      return;
    }

    try {
      const savedSettings = await persistSettings({
        ...settings,
        toolRootPath: nextPath,
      });
      reportSettingsFeedback(
        "success",
        `工具目录已切换到 ${savedSettings.toolRootPath}。`,
      );
      await refreshToolStates(allTools, {
        managedRootPath: savedSettings.toolRootPath,
      });
    } catch (error) {
      reportSettingsFeedback(
        "error",
        error instanceof Error ? error.message : "保存工具目录失败。",
      );
    }
  }

  async function chooseToolRootPath() {
    if (!window.winKitBox) {
      reportSettingsFeedback("warning", "浏览器预览模式不能打开本机目录选择器。");
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
      reportSettingsFeedback(
        "success",
        updateOnStartup
          ? "已开启启动时自动检测更新。"
          : "已关闭启动时自动检测更新。",
      );
    } catch (error) {
      reportSettingsFeedback(
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
      reportSettingsFeedback("success", "AI 模型配置已保存。");
    } catch (error) {
      reportSettingsFeedback(
        "error",
        error instanceof Error ? error.message : "保存 AI 配置失败。",
      );
    }
  }

  async function saveProxySettings(proxy: {
    proxyMode: ProxyMode;
    proxyManual: string;
  }) {
    try {
      await persistSettings({ ...settings, ...proxy });
      reportSettingsFeedback("success", "代理设置已保存并生效。");
    } catch (error) {
      reportSettingsFeedback(
        "error",
        error instanceof Error ? error.message : "保存代理设置失败。",
      );
    }
  }

  async function saveCustomCategories(nextCategories: CategoryDefinition[]) {
    try {
      await persistSettings({
        ...settings,
        customCategories: normalizeCategoryDefinitions(nextCategories),
      });
      return true;
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "保存分类失败。",
      );
      return false;
    }
  }

  async function saveToolCategory(toolId: string, categoryId: string) {
    try {
      const catalogTool = catalogTools.find((tool) => tool.id === toolId);
      const customToolIndex = customTools.findIndex((tool) => tool.id === toolId);
      const originalTool = catalogTool ?? customTools[customToolIndex];

      if (customToolIndex >= 0) {
        // Custom tools are part of the customTools list; update them directly
        // rather than creating an override.
        const nextCustomTools = customTools.map((tool, index) =>
          index === customToolIndex ? { ...tool, category: categoryId } : tool,
        );
        const nextOverrides = { ...settings.toolCategoryOverrides };
        delete nextOverrides[toolId];
        await persistSettings({
          ...settings,
          customTools: nextCustomTools,
          toolCategoryOverrides: nextOverrides,
        });
      } else {
        const nextOverrides = { ...settings.toolCategoryOverrides };
        if (catalogTool && categoryId === catalogTool.category) {
          delete nextOverrides[toolId];
        } else {
          nextOverrides[toolId] = categoryId;
        }
        await persistSettings({
          ...settings,
          toolCategoryOverrides: nextOverrides,
        });
      }

      const toolName = originalTool?.name ?? toolId;
      const categoryName = getCategoryName(categoryId, settings.customCategories);
      appendLog("success", `已将 ${toolName} 移动到 ${categoryName}。`);
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "修改工具分类失败。",
      );
    }
  }

  async function moveSelectedToolsToCategory(categoryId: string) {
    if (selectedIds.size === 0) {
      appendLog("warning", "请先选择要移动分类的工具。");
      return;
    }

    try {
      const selectedIdList = Array.from(selectedIds);
      const selectedSet = new Set(selectedIdList);
      const nextCustomTools = customTools.map((tool) =>
        selectedSet.has(tool.id) ? { ...tool, category: categoryId } : tool,
      );
      const nextOverrides = { ...settings.toolCategoryOverrides };

      for (const toolId of selectedIdList) {
        const catalogTool = catalogTools.find((tool) => tool.id === toolId);
        const isCustom = customTools.some((tool) => tool.id === toolId);
        if (isCustom) {
          delete nextOverrides[toolId];
        } else if (catalogTool && categoryId === catalogTool.category) {
          delete nextOverrides[toolId];
        } else {
          nextOverrides[toolId] = categoryId;
        }
      }

      await persistSettings({
        ...settings,
        customTools: nextCustomTools,
        toolCategoryOverrides: nextOverrides,
      });
      appendLog(
        "success",
        `已将 ${selectedIds.size} 个已选工具移动到 ${getCategoryName(categoryId, settings.customCategories)}。`,
      );
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "批量移动分类失败。",
      );
    }
  }

  function startToolDrag(event: DragEvent<HTMLElement>, tool: Tool) {
    setDraggedToolId(tool.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(toolDragMimeType, createToolDragPayload(tool.id));
    event.dataTransfer.setData("text/plain", tool.id);
  }

  function endToolDrag() {
    setDraggedToolId(undefined);
    setDragOverCategoryId(undefined);
  }

  function getSortableCategoryId(categoryId: string) {
    const category = settings.customCategories.find((item) => item.id === categoryId);
    return category && !category.builtin && !category.protected && !category.hidden
      ? category.id
      : undefined;
  }

  function startCategoryDrag(event: DragEvent<HTMLElement>, categoryId: string) {
    const sortableCategoryId = getSortableCategoryId(categoryId);
    if (!sortableCategoryId) {
      return;
    }

    setDraggedCategoryId(sortableCategoryId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      categoryDragMimeType,
      createCategoryDragPayload(sortableCategoryId),
    );
  }

  function endCategoryDrag() {
    setDraggedCategoryId(undefined);
    setCategorySortOverId(undefined);
  }

  function dragOverCategory(event: DragEvent<HTMLElement>, categoryId: CategoryFilter) {
    if (draggedCategoryId) {
      const sortableCategoryId = getSortableCategoryId(categoryId);
      if (!sortableCategoryId || sortableCategoryId === draggedCategoryId) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setCategorySortOverId(sortableCategoryId);
      return;
    }

    const droppableCategoryId = getDroppableCategoryId(categoryId);
    if (!droppableCategoryId || !draggedToolId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverCategoryId(droppableCategoryId);
  }

  async function dropToolOnCategory(
    event: DragEvent<HTMLElement>,
    categoryId: CategoryFilter,
  ) {
    const draggedCategory =
      parseCategoryDragPayload(event.dataTransfer.getData(categoryDragMimeType)) ||
      draggedCategoryId;
    if (draggedCategory) {
      const sortableCategoryId = getSortableCategoryId(categoryId);
      setDraggedCategoryId(undefined);
      setCategorySortOverId(undefined);

      if (!sortableCategoryId || sortableCategoryId === draggedCategory) {
        return;
      }

      event.preventDefault();
      const nextCategories = reorderUserCategories(
        settings.customCategories,
        draggedCategory,
        sortableCategoryId,
      );
      if (nextCategories !== settings.customCategories) {
        const saved = await saveCustomCategories(nextCategories);
        if (saved) {
          appendLog("success", "已调整自定义分类顺序。");
        }
      }
      return;
    }

    const droppableCategoryId = getDroppableCategoryId(categoryId);
    if (!droppableCategoryId) {
      return;
    }

    event.preventDefault();
    const toolId =
      parseToolDragPayload(event.dataTransfer.getData(toolDragMimeType)) ||
      event.dataTransfer.getData("text/plain") ||
      draggedToolId;
    setDragOverCategoryId(undefined);
    setDraggedToolId(undefined);

    if (!toolId || !allTools.some((tool) => tool.id === toolId)) {
      appendLog("warning", "没有识别到被拖拽的工具。");
      return;
    }

    await saveToolCategory(toolId, droppableCategoryId);
    setActiveView("catalog");
    setActiveCategory(droppableCategoryId);
    setFailedOnly(false);
    setInstalledOnly(false);
    setSelectedOnly(false);
    setUpdatableOnly(false);
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
    };
    try {
      await persistSettings(nextSettings);
      reportSettingsFeedback(
        "success",
        `已切换到 ${themeDefinitions.find((theme) => theme.id === themeId)?.name ?? themeId} 主题。`,
      );
    } catch (error) {
      reportSettingsFeedback(
        "error",
        error instanceof Error ? error.message : "保存主题失败。",
      );
    }
  }

  async function selectCustomThemeBackground(themeId: ThemeId) {
    if (!window.winKitBox) {
      reportSettingsFeedback("warning", "浏览器预览模式不能上传自定义背景。");
      return;
    }

    try {
      const result = await window.winKitBox.selectThemeBackground({ themeId });

      if (result.canceled || !result.backgroundUrl || !result.themeId) {
        return;
      }

      const nextSettings = {
        ...settings,
        themeBackgrounds: {
          ...settings.themeBackgrounds,
          [result.themeId]: result.backgroundUrl,
        },
      };
      await persistSettings(nextSettings);
      reportSettingsFeedback("success", "已设置自定义主题背景。");
    } catch (error) {
      reportSettingsFeedback(
        "error",
        error instanceof Error ? error.message : "设置背景失败。",
      );
    }
  }

  async function clearCustomThemeBackground(themeId: ThemeId) {
    if (!window.winKitBox) {
      reportSettingsFeedback("warning", "浏览器预览模式不能恢复默认背景。");
      return;
    }

    try {
      await window.winKitBox.clearThemeBackground({ themeId });
      const nextBackgrounds = { ...settings.themeBackgrounds };
      delete nextBackgrounds[themeId];
      await persistSettings({ ...settings, themeBackgrounds: nextBackgrounds });
      reportSettingsFeedback("success", "已恢复默认主题背景。");
    } catch (error) {
      reportSettingsFeedback(
        "error",
        error instanceof Error ? error.message : "清除背景失败。",
      );
    }
  }

  async function checkForUpdates(silent = false) {
    if (!window.winKitBox) {
      if (!silent) {
        reportSettingsFeedback("warning", "浏览器预览模式不能检查桌面版更新。");
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
        if (!silent) {
          setSettingsFeedback({
            level: "success",
            message: `发现新版 v${info.latestVersion}，可以打开发行页下载。`,
          });
        }
        return;
      }

      if (info.error) {
        if (!silent) {
          reportSettingsFeedback("warning", info.error);
        }
        return;
      }

      if (!silent) {
        reportSettingsFeedback("success", `已是最新版本 v${info.currentVersion}。`);
      }
    } catch (error) {
      if (!silent) {
        reportSettingsFeedback(
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
          proxyMode: settings.proxyMode,
          proxyManual: settings.proxyManual,
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
          reportSettingsFeedback("success", `配置已导出：${result.filePath}`);
          await recordActivity({
            kind: "config",
            status: "success",
            title: "配置已导出",
            detail: result.filePath,
          });
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
      reportSettingsFeedback("success", "配置已导出。");
      await recordActivity({
        kind: "config",
        status: "success",
        title: "配置已导出",
      });
    } catch (error) {
      reportSettingsFeedback(
        "error",
        error instanceof Error ? error.message : "导出配置失败。",
      );
      await recordActivity({
        kind: "config",
        status: "error",
        title: "导出配置失败",
        detail: error instanceof Error ? error.message : "导出配置失败。",
      });
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
      const nextCustomTools = normalizeStoredCustomTools(imported.customTools);
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
        proxyMode: imported.settings.proxyMode ?? settings.proxyMode,
        proxyManual: imported.settings.proxyManual ?? settings.proxyManual,
        customTools: nextCustomTools,
        customCategories: nextCustomCategories,
      };

      setCustomTools(nextCustomTools);
      setSelectedIds(new Set(nextSelectedIds));
      await persistSettings(nextSettings);
      reportSettingsFeedback(
        "success",
        `配置已导入${opened.filePath ? `：${opened.filePath}` : ""}。`,
      );
      await recordActivity({
        kind: "config",
        status: "success",
        title: "配置已导入",
        detail: opened.filePath,
      });
      await refreshToolStates([...catalogTools, ...nextCustomTools], {
        managedRootPath: nextSettings.toolRootPath,
      });
    } catch (error) {
      reportSettingsFeedback(
        "error",
        error instanceof Error ? error.message : "导入配置失败。",
      );
      await recordActivity({
        kind: "config",
        status: "error",
        title: "导入配置失败",
        detail: error instanceof Error ? error.message : "导入配置失败。",
      });
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
          reportSettingsFeedback("error", "配置文件超过 1MB，已拒绝导入。");
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

  async function createSettingsBackup() {
    if (!window.winKitBox) {
      reportSettingsFeedback("warning", "浏览器预览模式不能创建本机配置备份。");
      return;
    }

    try {
      const backups = await window.winKitBox.createConfigBackup();
      setConfigBackups(normalizeConfigBackups(backups));
      reportSettingsFeedback("success", "已创建配置备份。");
      await recordActivity({
        kind: "config",
        status: "success",
        title: "已创建配置备份",
        source: "配置备份",
      });
    } catch (error) {
      reportSettingsFeedback(
        "error",
        error instanceof Error ? error.message : "创建配置备份失败。",
      );
    }
  }

  async function restoreSettingsBackup(fileName: string) {
    if (!window.winKitBox) {
      reportSettingsFeedback("warning", "浏览器预览模式不能恢复本机配置备份。");
      return;
    }

    if (!window.confirm("恢复配置备份会覆盖当前工具目录、分类、自定义工具和设置。是否继续？")) {
      return;
    }

    try {
      const result = await window.winKitBox.restoreConfigBackup(fileName);
      const nextSettings = result.settings;
      const nextCustomTools = normalizeStoredCustomTools(nextSettings.customTools);
      setSettings(nextSettings);
      setCustomTools(nextCustomTools);
      setToolRootDraft(nextSettings.toolRootPath);
      setConfigBackups(normalizeConfigBackups(result.backups));
      reportSettingsFeedback("success", "已恢复配置备份。");
      await recordActivity({
        kind: "config",
        status: "success",
        title: "已恢复配置备份",
        source: "配置备份",
      });
      await refreshToolStates([...catalogTools, ...nextCustomTools], {
        managedRootPath: nextSettings.toolRootPath,
      });
    } catch (error) {
      reportSettingsFeedback(
        "error",
        error instanceof Error ? error.message : "恢复配置备份失败。",
      );
    }
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
      await recordActivity({
        kind: "ai",
        status: "success",
        title: `AI 已添加工具：${customTool.name}`,
        toolId: customTool.id,
        toolName: customTool.name,
        source: getToolActivitySource(customTool),
      });
      await recordAiLog({
        kind: "tool-analysis",
        status: "success",
        title: `AI 添加工具：${customTool.name}`,
        prompt: context.htmlUrl,
        response: candidate.description || candidate.summary || "AI 已生成工具候选。",
        structured: { candidate, context, categoryId },
        model: settings.aiModel,
        source: "添加工具",
        toolId: customTool.id,
        toolName: customTool.name,
        repoUrl: context.htmlUrl,
      });
      setSelectedIds((current) => new Set([...current, customTool.id]));
      await refreshToolStates([customTool]);
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "AI 添加工具失败。",
      );
      await recordActivity({
        kind: "ai",
        status: "error",
        title: "AI 添加工具失败",
        detail: error instanceof Error ? error.message : "AI 添加工具失败。",
      });
      await recordAiLog({
        kind: "tool-analysis",
        status: "error",
        title: "AI 添加工具失败",
        prompt: context.htmlUrl,
        response: error instanceof Error ? error.message : "AI 添加工具失败。",
        structured: { candidate, context, categoryId },
        model: settings.aiModel,
        source: "添加工具",
        repoUrl: context.htmlUrl,
      });
      throw error;
    }
  }

  async function addManualCustomTool(input: CustomToolInput) {
    try {
      const customTool = createCustomTool(
        input,
        new Set(allTools.map((tool) => tool.id)),
      );
      const nextCustomTools = [...customTools, customTool];
      setCustomTools(nextCustomTools);
      await persistSettings({ ...settings, customTools: nextCustomTools });
      appendLog("success", `已添加自定义工具：${customTool.name}。`);
      await recordActivity({
        kind: "config",
        status: "success",
        title: `已添加自定义工具：${customTool.name}`,
        toolId: customTool.id,
        toolName: customTool.name,
        source: getToolActivitySource(customTool),
      });
      setSelectedIds((current) => new Set([...current, customTool.id]));
      await refreshToolStates([customTool]);
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "添加自定义工具失败。",
      );
      await recordActivity({
        kind: "config",
        status: "error",
        title: "添加自定义工具失败",
        detail: error instanceof Error ? error.message : "添加自定义工具失败。",
      });
      throw error;
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
    await recordActivity({
      kind: "config",
      status: "success",
      title: `已移除自定义工具：${tool?.name ?? toolId}`,
      toolId,
      toolName: tool?.name,
      source: tool ? getToolActivitySource(tool) : undefined,
    });
  }

  async function removeCustomToolFromCard(tool: Tool) {
    if (!window.winKitBox) {
      appendLog("warning", "浏览器预览模式不能移除自定义工具。");
      return;
    }

    const isInstalled = toolStates[tool.id]?.status === "installed";
    const confirmationMessage = isInstalled
      ? `${tool.name} 当前显示为已安装。移除将仅从 WinKitBox 列表中删除该工具，不会卸载已安装的软件。是否继续？`
      : `确定要从 WinKitBox 中移除 ${tool.name} 吗？`;

    if (!window.confirm(confirmationMessage)) {
      appendLog("info", `已取消移除 ${tool.name}。`);
      return;
    }

    await removeCustomTool(tool.id);
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
    const latestFailure = getLatestToolFailure(activityLog, tool.id);
    const errorMessage = [
      toolState.message,
      latestFailure?.title,
      latestFailure?.detail,
    ]
      .filter(Boolean)
      .join("；");
    const isBuiltinTool = !customTools.some((item) => item.id === tool.id);
    appendLog("info", `正在用 AI 分析 ${tool.name} 的安装失败原因...`);

    try {
      const result = await window.winKitBox.fixAiTool({
        baseUrl: settings.aiBaseUrl,
        apiKey: settings.aiApiKey,
        model: settings.aiModel,
        tool,
        errorMessage: errorMessage || "安装失败",
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
      await recordActivity({
        kind: "ai",
        status: "success",
        title: `AI 已修复工具：${tool.name}`,
        detail: errorMessage || undefined,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(fixedTool),
      });
      await recordAiLog({
        kind: "repair",
        status: "success",
        title: `AI 修复工具：${tool.name}`,
        prompt: errorMessage || "安装失败",
        response: getAiResponseText(result),
        structured: result.candidate,
        model: settings.aiModel,
        source: "AI 修复",
        toolId: tool.id,
        toolName: tool.name,
        repoUrl: tool.repoUrl ?? tool.homepage,
      });
      await refreshToolStates([fixedTool]);
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "AI 修复工具失败。",
      );
      await recordActivity({
        kind: "ai",
        status: "error",
        title: `AI 修复失败：${tool.name}`,
        detail: error instanceof Error ? error.message : "AI 修复工具失败。",
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
      await recordAiLog({
        kind: "repair",
        status: "error",
        title: `AI 修复失败：${tool.name}`,
        prompt: errorMessage || "安装失败",
        response: error instanceof Error ? error.message : "AI 修复工具失败。",
        model: settings.aiModel,
        source: "AI 修复",
        toolId: tool.id,
        toolName: tool.name,
        repoUrl: tool.repoUrl ?? tool.homepage,
      });
    }
  }

  async function addDiscoverRepoWithAi(repoUrl: string, categoryId: string) {
    if (!window.winKitBox) {
      appendLog("warning", "浏览器预览模式不能调用 AI 添加。");
      throw new Error("浏览器预览模式不能调用 AI 添加。");
    }

    if (!settings.aiBaseUrl || !settings.aiApiKey || !settings.aiModel) {
      appendLog("warning", "请先在设置里保存 AI 接口 URL、API Key 和模型名称。");
      setActiveView("settings");
      throw new Error("请先在设置里保存 AI 接口 URL、API Key 和模型名称。");
    }

    appendLog("info", `正在用 AI 添加 GitHub 项目：${repoUrl}`);
    const result = await window.winKitBox.generateAiTool({
      baseUrl: settings.aiBaseUrl,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      toolUrl: repoUrl,
      categoryId,
    });
    await addAiGeneratedTool(result.candidate, result.context, categoryId);
  }

  async function recommendDiscoverReposWithAi(prompt: string) {
    if (!window.winKitBox) {
      appendLog("warning", "浏览器预览模式不能调用 AI 推荐。");
      throw new Error("浏览器预览模式不能调用 AI 推荐。");
    }

    if (!settings.aiBaseUrl || !settings.aiApiKey || !settings.aiModel) {
      appendLog("warning", "请先在设置里保存 AI 接口 URL、API Key 和模型名称。");
      setActiveView("settings");
      throw new Error("请先在设置里保存 AI 接口 URL、API Key 和模型名称。");
    }

    appendLog("info", "正在用 AI 推荐 GitHub 开源项目...");
    const result = await window.winKitBox.recommendAiRepos({
      baseUrl: settings.aiBaseUrl,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      prompt,
    });
    appendLog("success", "AI 已返回 GitHub 项目推荐。");
    await recordAiLog({
      kind: "recommendation",
      status: "success",
      title: "AI 已返回 GitHub 项目推荐",
      prompt,
      response: getAiResponseText(result),
      structured: result,
      model: settings.aiModel,
      source: "GitHub AI 助手",
    });
    return result;
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
    const taskId = createTaskId("install-plan", "selected");
    createTask({
      id: taskId,
      kind: "install",
      title: `批量安装 ${installPlan.readyCount} 个工具`,
      retryable: true,
      retryKey: "install-plan:selected",
    });
    startTask(taskId);
    appendLog("info", "开始执行安装计划。");

    try {
      const result = await window.winKitBox.runPowerShell(script);
      if (result.code === 0) {
        appendLog("success", "安装计划执行完成。");
        finishTask(taskId, "success", "安装计划执行完成。", result.code);
      } else {
        appendLog("error", `安装计划结束，退出码 ${result.code ?? "未知"}。`);
        failTask(taskId, `安装计划结束，退出码 ${result.code ?? "未知"}。`);
      }
      await recordActivity({
        kind: "install",
        status: getActivityStatusFromExitCode(result.code),
        title: result.code === 0 ? "批量安装计划完成" : "批量安装计划失败",
        detail: `自动项 ${installPlan.readyCount} 个，${formatExitCode(result.code)}。`,
        exitCode: result.code,
        source: "install-plan",
      });
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "执行安装计划失败。",
      );
      await recordActivity({
        kind: "install",
        status: "error",
        title: "批量安装计划执行失败",
        detail: error instanceof Error ? error.message : "执行安装计划失败。",
        source: "install-plan",
      });
      failTask(
        taskId,
        error instanceof Error ? error.message : "执行安装计划失败。",
      );
    } finally {
      await refreshToolStates(selectedTools, plannerOptions, {
        preserveActive: false,
      });
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
    const taskId = createTaskId("uninstall-plan", "selected");
    createTask({
      id: taskId,
      kind: "uninstall",
      title: `批量卸载 ${uninstallPlan.readyCount} 个工具`,
      retryable: true,
      retryKey: "uninstall-plan:selected",
    });
    startTask(taskId);
    appendLog("info", "开始执行卸载计划。");

    try {
      const result = await window.winKitBox.runPowerShell(uninstallScript);
      if (result.code === 0) {
        appendLog("success", "卸载计划执行完成。");
        finishTask(taskId, "success", "卸载计划执行完成。", result.code);
      } else {
        appendLog("error", `卸载计划结束，退出码 ${result.code ?? "未知"}。`);
        failTask(taskId, `卸载计划结束，退出码 ${result.code ?? "未知"}。`);
      }
      await recordActivity({
        kind: "uninstall",
        status: getActivityStatusFromExitCode(result.code),
        title: result.code === 0 ? "批量卸载计划完成" : "批量卸载计划失败",
        detail: `卸载项 ${uninstallPlan.readyCount} 个，${formatExitCode(result.code)}。`,
        exitCode: result.code,
        source: "uninstall-plan",
      });
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "执行卸载计划失败。",
      );
      await recordActivity({
        kind: "uninstall",
        status: "error",
        title: "批量卸载计划执行失败",
        detail: error instanceof Error ? error.message : "执行卸载计划失败。",
        source: "uninstall-plan",
      });
      failTask(
        taskId,
        error instanceof Error ? error.message : "执行卸载计划失败。",
      );
    } finally {
      await refreshToolStates(selectedInstalledTools, plannerOptions, {
        preserveActive: false,
      });
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

  async function retryTask(task: TaskQueueItem) {
    if (!task.retryKey) {
      appendLog("warning", "这个任务没有可重试动作。");
      return;
    }

    if (task.retryKey === "install-plan:selected") {
      await runInstallPlan();
      return;
    }

    if (task.retryKey === "uninstall-plan:selected") {
      await runUninstallPlan();
      return;
    }

    if (task.retryKey === "update-check:all") {
      await checkInstalledToolUpdates();
      return;
    }

    const [action, toolId] = task.retryKey.split(":");
    const tool = allTools.find((item) => item.id === toolId);
    if (!tool) {
      appendLog("warning", `没有找到可重试的工具：${toolId}。`);
      return;
    }

    if (action === "install") {
      await installTool(tool);
    } else if (action === "uninstall") {
      await uninstallTool(tool);
    } else if (action === "update") {
      await updateTool(tool);
    } else {
      appendLog("warning", "未知的任务重试类型。");
    }
  }

  function clearFinishedTasks() {
    setTaskQueueState((current) =>
      current.filter((task) => task.status === "queued" || task.status === "running"),
    );
  }

  async function installTool(tool: Tool) {
    const installCommand = buildInstallCommand(tool, plannerOptions);
    const taskId = createTaskId("install", tool.id);
    createTask({
      id: taskId,
      kind: "install",
      title: `安装 ${tool.name}`,
      toolId: tool.id,
      toolName: tool.name,
      retryable: true,
      retryKey: `install:${tool.id}`,
    });

    if (installCommand.skipReason) {
      finishTask(taskId, "skipped", installCommand.skipReason);
      appendLog("info", `${tool.name} ${installCommand.skipReason}`);
      await recordActivity({
        kind: "install",
        status: "info",
        title: `${tool.name} 无需安装`,
        detail: installCommand.skipReason,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
      return;
    }

    if (!installCommand.command) {
      finishTask(taskId, "warning", "需要手动下载。");
      appendLog("warning", `${tool.name} 需要手动下载，已打开来源页面。`);
      await recordActivity({
        kind: "install",
        status: "warning",
        title: `${tool.name} 需要手动下载`,
        detail: installCommand.manualUrl ?? tool.homepage,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
      await openUrl(installCommand.manualUrl ?? tool.homepage);
      return;
    }

    if (!window.winKitBox) {
      finishTask(taskId, "skipped", "浏览器预览模式不能安装。");
      appendLog(
        "warning",
        `浏览器预览不能直接安装 ${tool.name}，请用桌面版运行 WinKitBox。`,
      );
      return;
    }

    appendLog("info", `开始安装 ${tool.name}。`);
    startTask(taskId);
    const singlePlan = createInstallPlan(
      [tool],
      new Set([tool.id]),
      plannerOptions,
    );

    try {
      const result = await window.winKitBox.runPowerShell(
        buildPowerShellScript(singlePlan),
      );
      await refreshToolStates([tool], plannerOptions, {
        preserveActive: false,
      });

      if (result.code === 0) {
        appendLog("success", `${tool.name} 安装命令已完成，可以点击打开试试。`);
        finishTask(taskId, "success", "安装命令已完成。", result.code);
      } else {
        appendLog(
          "error",
          `${tool.name} 安装命令结束，退出码 ${result.code ?? "未知"}。`,
        );
        failTask(taskId, `安装命令结束，退出码 ${result.code ?? "未知"}。`);
      }
      await recordActivity({
        kind: "install",
        status: getActivityStatusFromExitCode(result.code),
        title: result.code === 0 ? `${tool.name} 安装完成` : `${tool.name} 安装失败`,
        detail: formatExitCode(result.code),
        toolId: tool.id,
        toolName: tool.name,
        exitCode: result.code,
        source: getToolActivitySource(tool),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `${tool.name} 安装失败。`;
      appendLog(
        "error",
        message,
      );
      failTask(taskId, message);
      await recordActivity({
        kind: "install",
        status: "error",
        title: `${tool.name} 安装失败`,
        detail: message,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
    }
  }

  async function uninstallTool(tool: Tool) {
    const uninstallCommand = buildUninstallCommand(tool, plannerOptions);
    const taskId = createTaskId("uninstall", tool.id);
    createTask({
      id: taskId,
      kind: "uninstall",
      title: `卸载 ${tool.name}`,
      toolId: tool.id,
      toolName: tool.name,
      retryable: true,
      retryKey: `uninstall:${tool.id}`,
    });

    if (uninstallCommand.skipReason) {
      finishTask(taskId, "skipped", uninstallCommand.skipReason);
      appendLog("info", `${tool.name} ${uninstallCommand.skipReason}`);
      await recordActivity({
        kind: "uninstall",
        status: "info",
        title: `${tool.name} 不由 WinKitBox 卸载`,
        detail: uninstallCommand.skipReason,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
      return;
    }

    if (!uninstallCommand.command) {
      finishTask(taskId, "warning", "需要手动卸载。");
      appendLog("warning", `${tool.name} 没有可执行卸载命令，已打开来源页面。`);
      await recordActivity({
        kind: "uninstall",
        status: "warning",
        title: `${tool.name} 需要手动卸载`,
        detail: uninstallCommand.manualUrl ?? tool.homepage,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
      await openUrl(uninstallCommand.manualUrl ?? tool.homepage);
      return;
    }

    if (!window.winKitBox) {
      finishTask(taskId, "skipped", "浏览器预览模式不能卸载。");
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
      finishTask(taskId, "skipped", "用户取消卸载。");
      appendLog("info", `已取消卸载 ${tool.name}。`);
      return;
    }

    appendLog("info", `开始卸载 ${tool.name}。`);
    startTask(taskId);
    const singlePlan = createUninstallPlan(
      [tool],
      new Set([tool.id]),
      plannerOptions,
    );
    try {
      const result = await window.winKitBox.runPowerShell(
        buildUninstallPowerShellScript(singlePlan),
      );
      await refreshToolStates([tool], plannerOptions, {
        preserveActive: false,
      });

      if (result.code === 0) {
        appendLog("success", `${tool.name} 卸载命令已完成。`);
        finishTask(taskId, "success", "卸载命令已完成。", result.code);
      } else {
        appendLog(
          "error",
          `${tool.name} 卸载命令结束，退出码 ${result.code ?? "未知"}。`,
        );
        failTask(taskId, `卸载命令结束，退出码 ${result.code ?? "未知"}。`);
      }
      await recordActivity({
        kind: "uninstall",
        status: getActivityStatusFromExitCode(result.code),
        title: result.code === 0 ? `${tool.name} 卸载完成` : `${tool.name} 卸载失败`,
        detail: formatExitCode(result.code),
        toolId: tool.id,
        toolName: tool.name,
        exitCode: result.code,
        source: getToolActivitySource(tool),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `${tool.name} 卸载失败。`;
      appendLog(
        "error",
        message,
      );
      failTask(taskId, message);
      await recordActivity({
        kind: "uninstall",
        status: "error",
        title: `${tool.name} 卸载失败`,
        detail: message,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
    }
  }

  async function checkInstalledToolUpdates() {
    if (!window.winKitBox) {
      appendLog("warning", "浏览器预览模式不能检测工具更新。");
      return;
    }

    const targets = installedTools.length > 0 ? installedTools : allTools;
    const taskId = createTaskId("update-check", "all");
    createTask({
      id: taskId,
      kind: "update-check",
      title: `检测 ${targets.length} 个工具更新`,
      retryable: true,
      retryKey: "update-check:all",
    });
    startTask(taskId);
    setIsCheckingToolUpdates(true);
    appendLog("info", `开始检测 ${targets.length} 个工具的更新状态。`);

    try {
      const results = await window.winKitBox.checkToolUpdates(
        createToolUpdateDescriptors(targets),
      );
      setToolUpdateResults(
        Object.fromEntries(results.map((result) => [result.toolId, result])),
      );
      const availableCount = results.filter(
        (result) => result.status === "available" || result.status === "reinstall",
      ).length;
      appendLog("success", `工具更新检测完成，${availableCount} 个工具可更新或可刷新。`);
      const failedCount = results.filter((result) => result.status === "unknown").length;
      finishTask(
        taskId,
        failedCount > 0 ? "warning" : "success",
        `${availableCount} 个可更新或可刷新，${failedCount} 个无法判断。`,
      );
      await recordActivity({
        kind: "update-check",
        status: failedCount > 0 ? "warning" : "success",
        title: "工具更新检测完成",
        detail: `检测 ${results.length} 个工具，${availableCount} 个可更新或可刷新，${failedCount} 个无法判断。`,
        source: "tool-update-center",
      });
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "工具更新检测失败。",
      );
      await recordActivity({
        kind: "update-check",
        status: "error",
        title: "工具更新检测失败",
        detail: error instanceof Error ? error.message : "工具更新检测失败。",
        source: "tool-update-center",
      });
      failTask(
        taskId,
        error instanceof Error ? error.message : "工具更新检测失败。",
      );
    } finally {
      setIsCheckingToolUpdates(false);
    }
  }

  async function checkToolSources() {
    if (!window.winKitBox) {
      appendLog("warning", "浏览器预览模式不能检查工具源健康。");
      return;
    }

    setIsCheckingToolSources(true);
    try {
      const results = await window.winKitBox.checkToolSources(
        createToolSourceHealthDescriptors(allTools),
      );
      setToolSourceHealthResults(
        Object.fromEntries(results.map((result) => [result.toolId, result])),
      );
      const summary = summarizeToolSourceHealth(results);
      const level = summary.broken > 0 ? "warning" : "success";
      appendLog(
        level,
        `工具源体检完成：正常 ${summary.healthy}，异常 ${summary.broken}，需关注 ${summary.warning}。`,
      );
      await recordActivity({
        kind: "update-check",
        status: level,
        title: "工具源体检完成",
        detail: `正常 ${summary.healthy}，异常 ${summary.broken}，需关注 ${summary.warning}，跳过 ${summary.skipped}。`,
        source: "工具源健康",
      });
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : "工具源体检失败。",
      );
      await recordActivity({
        kind: "update-check",
        status: "error",
        title: "工具源体检失败",
        detail: error instanceof Error ? error.message : "工具源体检失败。",
        source: "工具源健康",
      });
    } finally {
      setIsCheckingToolSources(false);
    }
  }

  function ignoreToolUpdate(toolId: string, version: string) {
    setIgnoredToolUpdateVersions((current) => ({
      ...current,
      [toolId]: version,
    }));
    const tool = allTools.find((item) => item.id === toolId);
    appendLog("info", `已忽略 ${tool?.name ?? toolId} 的 ${version} 版本。`);
  }

  function clearIgnoredToolUpdate(toolId: string) {
    setIgnoredToolUpdateVersions((current) => {
      const next = { ...current };
      delete next[toolId];
      return next;
    });
    const tool = allTools.find((item) => item.id === toolId);
    appendLog("info", `已取消忽略 ${tool?.name ?? toolId} 的更新。`);
  }

  async function updateTool(tool: Tool) {
    const updateCommand = buildToolUpdateCommand(tool, plannerOptions);
    const taskId = createTaskId("update", tool.id);
    createTask({
      id: taskId,
      kind: "update",
      title: `更新 ${tool.name}`,
      toolId: tool.id,
      toolName: tool.name,
      retryable: true,
      retryKey: `update:${tool.id}`,
    });

    if (updateCommand.skipReason) {
      finishTask(taskId, "skipped", updateCommand.skipReason);
      appendLog("info", `${tool.name} ${updateCommand.skipReason}`);
      await recordActivity({
        kind: "update",
        status: "info",
        title: `${tool.name} 跳过更新`,
        detail: updateCommand.skipReason,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
      return;
    }

    if (!updateCommand.command) {
      finishTask(taskId, "warning", "需要手动更新。");
      appendLog("warning", `${tool.name} 需要手动更新，已打开来源页面。`);
      await recordActivity({
        kind: "update",
        status: "warning",
        title: `${tool.name} 需要手动更新`,
        detail: updateCommand.manualUrl ?? tool.repoUrl ?? tool.homepage,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
      await openUrl(updateCommand.manualUrl ?? tool.repoUrl ?? tool.homepage);
      return;
    }

    if (!window.winKitBox) {
      finishTask(taskId, "skipped", "浏览器预览模式不能更新。");
      appendLog("warning", `浏览器预览不能更新 ${tool.name}，请用桌面版运行 WinKitBox。`);
      return;
    }

    const confirmed = window.confirm(`将更新 ${tool.name}。是否继续？`);

    if (!confirmed) {
      finishTask(taskId, "skipped", "用户取消更新。");
      appendLog("info", `已取消更新 ${tool.name}。`);
      return;
    }

    const plan = {
      commands: [updateCommand],
      readyCount: 1,
      manualCount: 0,
      skippedCount: 0,
      adminCount: updateCommand.requiresAdmin ? 1 : 0,
      highRiskCount: updateCommand.risk === "high" ? 1 : 0,
    };

    setIsRunning(true);
    appendLog("info", `开始更新 ${tool.name}。`);
    startTask(taskId);

    try {
      const result = await window.winKitBox.runPowerShell(buildPowerShellScript(plan));
      await refreshToolStates([tool], plannerOptions, {
        preserveActive: false,
      });

      if (result.code === 0) {
        appendLog("success", `${tool.name} 更新命令已完成。`);
        finishTask(taskId, "success", "更新命令已完成。", result.code);
        await recordActivity({
          kind: "update",
          status: "success",
          title: `${tool.name} 更新完成`,
          detail: formatExitCode(result.code),
          toolId: tool.id,
          toolName: tool.name,
          exitCode: result.code,
          source: getToolActivitySource(tool),
        });
        void checkInstalledToolUpdates();
      } else {
        appendLog("error", `${tool.name} 更新命令结束，退出码 ${result.code ?? "未知"}。`);
        failTask(taskId, `更新命令结束，退出码 ${result.code ?? "未知"}。`);
        await recordActivity({
          kind: "update",
          status: "error",
          title: `${tool.name} 更新失败`,
          detail: formatExitCode(result.code),
          toolId: tool.id,
          toolName: tool.name,
          exitCode: result.code,
          source: getToolActivitySource(tool),
        });
      }
    } catch (error) {
      appendLog(
        "error",
        error instanceof Error ? error.message : `${tool.name} 更新失败。`,
      );
      await recordActivity({
        kind: "update",
        status: "error",
        title: `${tool.name} 更新失败`,
        detail: error instanceof Error ? error.message : `${tool.name} 更新失败。`,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
      failTask(
        taskId,
        error instanceof Error ? error.message : `${tool.name} 更新失败。`,
      );
    } finally {
      setIsRunning(false);
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
      await recordActivity({
        kind: "launch",
        status: "success",
        title: `${tool.name} 已打开`,
        toolId: tool.id,
        toolName: tool.name,
        source: getToolActivitySource(tool),
      });
    } else {
      await refreshToolStates([tool], plannerOptions, {
        preserveActive: false,
      });
      appendLog(
        "warning",
        `没有找到 ${tool.name} 的已安装入口。可以先安装，或打开来源页面确认安装方式。`,
      );
      await recordActivity({
        kind: "launch",
        status: "warning",
        title: `${tool.name} 打开入口未找到`,
        detail: "没有找到已安装入口。",
        toolId: tool.id,
        toolName: tool.name,
        exitCode: result.code,
        source: getToolActivitySource(tool),
      });
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
              <p>v{__APP_VERSION__}</p>
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
                const droppableCategoryId = getDroppableCategoryId(category);
                const sortableCategoryId = getSortableCategoryId(category);

                return (
                  <div
                    className={`category-row ${
                      activeView === "catalog" && activeCategory === category
                        ? "active"
                        : ""
                    } ${droppableCategoryId ? "drop-target" : ""} ${
                      dragOverCategoryId === droppableCategoryId ? "drop-over" : ""
                    } ${sortableCategoryId ? "sort-target" : ""} ${
                      draggedCategoryId === sortableCategoryId ? "sort-source" : ""
                    } ${
                      categorySortOverId === sortableCategoryId ? "sort-over" : ""
                    }`}
                    key={category}
                    onDragOver={(event) => dragOverCategory(event, category)}
                    onDragLeave={(event) => {
                      const nextTarget = event.relatedTarget;
                      if (
                        nextTarget instanceof Node &&
                        event.currentTarget.contains(nextTarget)
                      ) {
                        return;
                      }
                      if (dragOverCategoryId === droppableCategoryId) {
                        setDragOverCategoryId(undefined);
                      }
                      if (categorySortOverId === sortableCategoryId) {
                        setCategorySortOverId(undefined);
                      }
                    }}
                    onDrop={(event) => void dropToolOnCategory(event, category)}
                  >
                    <button
                      className="category-button"
                      type="button"
                      draggable={Boolean(sortableCategoryId && !isEditing)}
                      onDragStart={(event) => startCategoryDrag(event, category)}
                      onDragEnd={endCategoryDrag}
                      onClick={() => {
                        setActiveView("catalog");
                        setActiveCategory(category);
                        setFailedOnly(false);
                        setInstalledOnly(false);
                        setSelectedOnly(false);
                        setUpdatableOnly(false);
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
              <Plus size={15} />
              工具
            </div>
            <button
              className={`category-button ${activeView === "addTool" ? "active" : ""}`}
              type="button"
              onClick={() => openAddToolView()}
            >
              <span>
                <Plus size={16} />
                添加工具
              </span>
              <strong>{customTools.length}</strong>
            </button>
            <button
              className={`category-button ${activeView === "updates" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveView("updates")}
            >
              <span>
                <RotateCcw size={16} />
                工具更新
              </span>
              <strong>{installedTools.length}</strong>
            </button>
            <button
              className={`category-button ${activeView === "logs" ? "active" : ""}`}
              type="button"
              onClick={() => openLogsView()}
            >
              <span>
                <Terminal size={16} />
                日志中心
              </span>
              {(activityStats.failed > 0 || activityStats.warnings > 0) && (
                <strong>
                  {activityStats.failed > 0
                    ? activityStats.failed
                    : activityStats.warnings}
                </strong>
              )}
            </button>
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
            className="developer-credit"
            type="button"
            onClick={() => void openUrl(developerGitHubUrl)}
            aria-label="打开开发者 GitHub 主页"
          >
            <span className="developer-github-mark">
              <Github size={14} />
            </span>
            <span>Dev by</span>
            <img src={developerAvatarUrl} alt="" />
          </button>
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
            proxyMode={settings.proxyMode}
            proxyManual={settings.proxyManual}
            onAddRepoWithAi={addDiscoverRepoWithAi}
            onRecommendReposWithAi={recommendDiscoverReposWithAi}
            onOpenUrl={openUrl}
          />
        </section>
      )}

      {activeView === "system" && (
        <section className="workspace">
          <SystemView
            onLog={appendLog}
            onRecordActivity={recordActivity}
            onOpenLogs={() =>
              openLogsView({ kind: "system", quick: "system" })
            }
            onCreateTask={createTask}
            onStartTask={startTask}
            onFinishTask={finishTask}
            onFailTask={failTask}
          />
        </section>
      )}

      {activeView === "updates" && (
        <section className="workspace">
          <ToolUpdatesView
            tools={installedTools.length > 0 ? installedTools : allTools}
            results={toolUpdateResults}
            sourceResults={toolSourceHealthResults}
            ignoredVersions={ignoredToolUpdateVersions}
            isChecking={isCheckingToolUpdates}
            isCheckingSources={isCheckingToolSources}
            isRunning={isRunning}
            onCheck={checkInstalledToolUpdates}
            onCheckSources={checkToolSources}
            onUpdate={updateTool}
            onIgnore={ignoreToolUpdate}
            onClearIgnore={clearIgnoredToolUpdate}
            onOpen={openUrl}
            onViewLogs={(toolId) =>
              openLogsView({ toolId, kind: "update", quick: "failed" })
            }
          />
        </section>
      )}

      {activeView === "addTool" && (
        <section className="workspace">
          <AddToolView
            settings={settings}
            categories={activeCategoryDefinitions}
            allCategories={settings.customCategories}
            customTools={customTools}
            focus={addToolFocus}
            onAddManualTool={addManualCustomTool}
            onAddAiTool={addAiGeneratedTool}
            onRemoveCustomTool={removeCustomTool}
            onUninstallCustomTool={uninstallTool}
            onOpenSettings={() => setActiveView("settings")}
            onOpenUrl={openUrl}
            onLog={appendLog}
            onRecordAiLog={recordAiLog}
          />
        </section>
      )}

      {activeView === "logs" && (
        <section className="workspace">
          <LogsView
            logs={logs}
            activityLog={activityLog}
            aiLog={aiLog}
            focus={logsViewFocus}
            onRefresh={refreshLogs}
            onClearActivityLog={clearActivityLog}
            onClearAiLog={clearAiLog}
            onExportActivityLog={exportActivityLogFile}
            onExportAiLog={exportAiLogFile}
            onLog={appendLog}
            onShowTool={showToolFromLog}
            onFixTool={fixToolFromLog}
          />
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
            saveProxySettings={saveProxySettings}
            saveTheme={saveTheme}
            feedback={settingsFeedback}
            onSelectCustomThemeBackground={selectCustomThemeBackground}
            onClearCustomThemeBackground={clearCustomThemeBackground}
            onLog={appendLog}
            onExportConfig={exportConfig}
            onImportConfig={importConfig}
            configBackups={configBackups}
            onCreateBackup={createSettingsBackup}
            onRestoreBackup={restoreSettingsBackup}
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
              active={selectedOnly}
              onClick={() => toggleQuickFilter("selected")}
            />
            <Metric
              label="已安装"
              value={dashboardStats.installedCount}
              tone="green"
              icon={Check}
              active={installedOnly}
              onClick={() => toggleQuickFilter("installed")}
            />
          </div>

          {(selectedOnly || installedOnly || failedOnly || updatableOnly) && (
            <div className="active-filter-bar">
              {selectedOnly && (
                <span className="active-filter-chip">
                  仅显示已选择工具
                  <button
                    className="icon-button tiny"
                    type="button"
                    onClick={() => setSelectedOnly(false)}
                    aria-label="清除已选择筛选"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {installedOnly && (
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
              )}
              {updatableOnly && (
                <span className="active-filter-chip">
                  仅显示可更新工具
                  <button
                    className="icon-button tiny"
                    type="button"
                    onClick={() => setUpdatableOnly(false)}
                    aria-label="清除可更新筛选"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {failedOnly && (
                <span className="active-filter-chip">
                  仅显示安装失败工具
                  <button
                    className="icon-button tiny"
                    type="button"
                    onClick={() => setFailedOnly(false)}
                    aria-label="清除安装失败筛选"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
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

          {selectedIds.size > 0 && (
            <div className="catalog-batch-bar">
              <div>
                <strong>已选择 {selectedIds.size} 个工具</strong>
                <span>可批量移动分类，或切到仅看已选工具后继续整理。</span>
              </div>
              <label>
                <span>目标分类</span>
                <select
                  value={batchCategoryId}
                  onChange={(event) => setBatchCategoryId(event.target.value)}
                >
                  {activeCategoryDefinitions
                    .filter((category) => category.id !== "all")
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void moveSelectedToolsToCategory(batchCategoryId)}
              >
                <FolderKanban size={15} />
                移动分类
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => setSelectedOnly((value) => !value)}
              >
                <ListChecks size={15} />
                {selectedOnly ? "显示全部" : "仅看已选"}
              </button>
            </div>
          )}

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
                  isCustom={customTools.some((item) => item.id === tool.id)}
                  dragging={draggedToolId === tool.id}
                  onToggle={() => toggleTool(tool.id)}
                  onInstall={() => installTool(tool)}
                  onUninstall={() => uninstallTool(tool)}
                  onLaunch={() => launchTool(tool)}
                  onShowDetails={() => setDetailToolId(tool.id)}
                  onSetCategory={(categoryId) =>
                    saveToolCategory(tool.id, categoryId)
                  }
                  onRemove={() => removeCustomToolFromCard(tool)}
                  onDragStart={(event) => startToolDrag(event, tool)}
                  onDragEnd={endToolDrag}
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

              {installPlan.skippedCount > 0 && (
                <div className="manual-list">
                  <div className="section-title">
                    <Inbox size={15} />
                    已跳过
                  </div>
                  {installPlan.commands
                    .filter((item) => item.skipReason)
                    .map((item) => (
                      <span className="manual-link passive" key={item.toolId}>
                        {item.label}
                        <small>{item.skipReason}</small>
                      </span>
                    ))}
                </div>
              )}
            </>
          )}
        </aside>
      )}

      {taskQueue.length > 0 && (
        <TaskQueuePanel
          tasks={taskQueue}
          stats={taskQueueStats}
          onRetry={retryTask}
          onOpenLogs={() => openLogsView({ quick: "failed" })}
          onClearFinished={clearFinishedTasks}
        />
      )}

      {detailTool && (
        <ToolDetailDrawer
          tool={detailTool}
          toolState={toolStates[detailTool.id] ?? { status: "unknown" }}
          selected={selectedIds.has(detailTool.id)}
          isCustom={customTools.some((item) => item.id === detailTool.id)}
          updateResult={toolUpdateResults[detailTool.id]}
          recentActivities={activityLog
            .filter((entry) => entry.toolId === detailTool.id)
            .slice(0, 5)}
          recentAiLogs={aiLog
            .filter((entry) => entry.toolId === detailTool.id)
            .slice(0, 3)}
          categoryName={getCategoryName(detailTool.category, settings.customCategories)}
          onClose={() => setDetailToolId(undefined)}
          onToggle={() => toggleTool(detailTool.id)}
          onInstall={() => installTool(detailTool)}
          onUninstall={() => uninstallTool(detailTool)}
          onLaunch={() => launchTool(detailTool)}
          onOpen={() => openUrl(detailTool.repoUrl ?? detailTool.homepage)}
          onAiFix={() => fixToolWithAi(detailTool)}
          onViewLogs={() =>
            openLogsView({ toolId: detailTool.id, quick: "failed" })
          }
          onRemove={() => removeCustomToolFromCard(detailTool)}
        />
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

function TaskQueuePanel({
  tasks,
  stats,
  onRetry,
  onOpenLogs,
  onClearFinished,
}: {
  tasks: TaskQueueItem[];
  stats: TaskQueueStats;
  onRetry: (task: TaskQueueItem) => Promise<void>;
  onOpenLogs: () => void;
  onClearFinished: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleTasks = expanded ? tasks.slice(0, 10) : tasks.slice(0, 4);
  const activeCount = stats.running + stats.queued;

  return (
    <aside className={`task-queue-panel ${expanded ? "expanded" : ""}`}>
      <div className="task-queue-head">
        <div>
          <p className="eyebrow">任务中心</p>
          <h3>
            {activeCount > 0
              ? `${activeCount} 个任务进行中`
              : `${stats.total} 个最近任务`}
          </h3>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={expanded ? "收起任务中心" : "展开任务中心"}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>
      <div className="task-queue-stats">
        <span>完成 {stats.success}</span>
        <span>失败 {stats.error}</span>
        <span>等待 {stats.queued}</span>
        {stats.retryableFailures > 0 && <span>可重试 {stats.retryableFailures}</span>}
      </div>
      <div className="task-queue-list">
        {visibleTasks.map((task) => (
          <div className={`task-queue-row ${task.status}`} key={task.id}>
            <span className={`logs-entry-status ${task.status === "error" ? "error" : task.status === "warning" ? "warning" : task.status === "success" ? "success" : "info"}`} />
            <div>
              <strong>{task.title}</strong>
              <small>
                {getTaskStatusLabel(task.status)}
                {task.durationMs !== undefined ? ` · ${formatTaskDuration(task.durationMs)}` : ""}
                {task.exitCode !== undefined && task.exitCode !== null ? ` · 退出码 ${task.exitCode}` : ""}
                {task.message ? ` · ${task.message}` : ""}
              </small>
            </div>
            <div className="task-queue-row-actions">
              {task.status === "error" && task.retryable && (
                <button
                  className="mini-action"
                  type="button"
                  onClick={() => void onRetry(task)}
                >
                  <RotateCcw size={13} />
                  重试
                </button>
              )}
              {task.status === "error" && (
                <button
                  className="mini-action"
                  type="button"
                  onClick={onOpenLogs}
                >
                  <Terminal size={13} />
                  日志
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="task-queue-actions">
        <button className="text-button" type="button" onClick={onOpenLogs}>
          <Terminal size={14} />
          日志
        </button>
        <button className="text-button" type="button" onClick={onClearFinished}>
          <Trash2 size={14} />
          清理完成项
        </button>
      </div>
    </aside>
  );
}

function Metric({
  label,
  value,
  tone,
  icon: Icon,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "teal" | "amber" | "red";
  icon?: typeof Download;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`metric ${tone} ${active ? "active" : ""} ${
        onClick ? "clickable" : ""
      }`}
      role={onClick ? "button" : undefined}
      aria-pressed={onClick ? active : undefined}
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

function ToolUpdatesView({
  tools,
  results,
  sourceResults,
  ignoredVersions,
  isChecking,
  isCheckingSources,
  isRunning,
  onCheck,
  onCheckSources,
  onUpdate,
  onIgnore,
  onClearIgnore,
  onOpen,
  onViewLogs,
}: {
  tools: Tool[];
  results: Record<string, ToolUpdateCheckResult>;
  sourceResults: Record<string, ToolSourceHealthResult>;
  ignoredVersions: Record<string, string>;
  isChecking: boolean;
  isCheckingSources: boolean;
  isRunning: boolean;
  onCheck: () => Promise<void>;
  onCheckSources: () => Promise<void>;
  onUpdate: (tool: Tool) => Promise<void>;
  onIgnore: (toolId: string, version: string) => void;
  onClearIgnore: (toolId: string) => void;
  onOpen: (url: string) => Promise<void>;
  onViewLogs: (toolId: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "available" | "current" | "unknown" | "ignored">("all");
  const resultList = tools.map((tool) => results[tool.id]).filter(Boolean);
  const sourceResultList = tools.map((tool) => sourceResults[tool.id]).filter(Boolean);
  const sourceSummary = summarizeToolSourceHealth(sourceResultList);
  const sourceIssueResults = sourceResultList
    .filter((result) => result.status === "broken" || result.status === "warning")
    .slice(0, 6);
  const availableCount = resultList.filter(
    (result) =>
      (result.status === "available" || result.status === "reinstall") &&
      ignoredVersions[result.toolId] !== result.latestVersion,
  ).length;
  const currentCount = resultList.filter((result) => result.status === "current").length;
  const unknownCount = tools.filter((tool) => {
    const status = results[tool.id]?.status ?? "unknown";
    return status === "unknown";
  }).length;
  const ignoredCount = resultList.filter(
    (result) =>
      result.latestVersion && ignoredVersions[result.toolId] === result.latestVersion,
  ).length;
  const skippedCount = resultList.filter(
    (result) => result.status === "skipped" || result.status === "not-installed",
  ).length;
  const visibleTools = tools.filter((tool) => {
    const result = results[tool.id];
    const status = result?.status ?? "unknown";
    const ignored = Boolean(
      result?.latestVersion && ignoredVersions[tool.id] === result.latestVersion,
    );

    if (filter === "available") {
      return !ignored && (status === "available" || status === "reinstall");
    }

    if (filter === "current") {
      return status === "current";
    }

    if (filter === "unknown") {
      return status === "unknown";
    }

    if (filter === "ignored") {
      return ignored;
    }

    return true;
  });
  const batchTargets = visibleTools.filter((tool) => {
    const result = results[tool.id];
    const ignored = Boolean(
      result?.latestVersion && ignoredVersions[tool.id] === result.latestVersion,
    );
    return !ignored && (result?.status === "available" || result?.status === "reinstall");
  });

  async function updateVisibleTools() {
    for (const tool of batchTargets) {
      await onUpdate(tool);
    }
  }

  return (
    <div className="updates-page">
      <header className="command-bar page-topbar">
        <div className="command-bar-title">
          <div className="command-bar-icon update-icon">
            <RotateCcw size={22} />
          </div>
          <div>
            <p className="eyebrow">维护中心</p>
            <h2>工具更新中心</h2>
          </div>
        </div>
        <div className="top-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={isChecking || isRunning || batchTargets.length === 0}
            onClick={() => void updateVisibleTools()}
          >
            <Download size={16} />
            批量更新 {batchTargets.length}
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={isCheckingSources}
            onClick={() => void onCheckSources()}
          >
            <ShieldAlert size={16} className={isCheckingSources ? "spin" : ""} />
            {isCheckingSources ? "检查来源中" : "检查工具源"}
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={isChecking || isRunning}
            onClick={() => void onCheck()}
          >
            <RotateCcw size={16} className={isChecking ? "spin" : ""} />
            {isChecking ? "检测中" : "只检测更新"}
          </button>
        </div>
      </header>

      <div className="stats-row compact-stats">
        <Metric label="待检测工具" value={tools.length} tone="blue" icon={ListChecks} />
        <Metric label="可更新/刷新" value={availableCount} tone="amber" icon={Download} />
        <Metric label="已是最新" value={currentCount} tone="green" icon={Check} />
        <Metric label="未知" value={unknownCount} tone="blue" icon={Info} />
        <Metric label="跳过" value={skippedCount} tone="teal" icon={Inbox} />
      </div>

      <section className="source-health-panel">
        <div className="source-health-copy">
          <div className="section-title">
            <ShieldAlert size={15} />
            工具源健康
          </div>
          <h3>把“还能不能下载”和“有没有新版本”分开看</h3>
          <p>
            来源检查只探测 winget 包、GitHub Release 和直接下载链接，不会执行安装或更新。
          </p>
          <div className="source-health-stats">
            <span className="ok">正常 {sourceSummary.healthy}</span>
            <span className="warning">关注 {sourceSummary.warning}</span>
            <span className="danger">异常 {sourceSummary.broken}</span>
            <span>跳过 {sourceSummary.skipped}</span>
            <span>未测 {Math.max(0, tools.length - sourceResultList.length)}</span>
          </div>
        </div>
        <img src={assistantWorkbenchUrl} alt="" />
      </section>

      {sourceIssueResults.length > 0 && (
        <div className="source-issue-list">
          {sourceIssueResults.map((result) => (
            <button
              className={`source-issue-item ${result.status}`}
              key={result.toolId}
              type="button"
              onClick={() => result.checkedUrl && void onOpen(result.checkedUrl)}
            >
              <span>
                <strong>{result.name}</strong>
                <small>{getToolSourceKindLabel(result.kind)} · {result.message}</small>
              </span>
              <ExternalLink size={14} />
            </button>
          ))}
        </div>
      )}

      <div className="update-filter-row">
        {[
          ["all", `全部 ${tools.length}`],
          ["available", `可更新 ${availableCount}`],
          ["current", `已最新 ${currentCount}`],
          ["unknown", `未知 ${unknownCount}`],
          ["ignored", `已忽略 ${ignoredCount}`],
        ].map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? "active" : ""}
            type="button"
            onClick={() => setFilter(id as typeof filter)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="update-tool-list">
        {tools.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="还没有可检测的工具"
            description="先在工具列表里安装或添加一些工具，再回来检测更新。"
            compact
          />
        ) : visibleTools.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="当前筛选下没有工具"
            description="切换筛选或重新检测更新后再查看。"
            compact
          />
        ) : (
          visibleTools.map((tool) => {
            const result = results[tool.id];
            const sourceResult = sourceResults[tool.id];
            const status = result?.status ?? "unknown";
            const ignored = Boolean(
              result?.latestVersion && ignoredVersions[tool.id] === result.latestVersion,
            );
            const canUpdate = !ignored && (status === "available" || status === "reinstall");
            const strategy = result?.strategy ?? getToolUpdateStrategy(tool);

            return (
              <article className={`update-tool-row status-${ignored ? "ignored" : status}`} key={tool.id}>
                <div className="update-tool-main">
                  <div className="update-tool-title-line">
                    <strong>{tool.name}</strong>
                    <span className="strategy-badge" title={getToolUpdateStrategyDescription(strategy)}>
                      {getToolUpdateStrategyLabel(strategy)}
                    </span>
                    {sourceResult && (
                      <span className={`source-status-badge ${sourceResult.status}`}>
                        {getToolSourceHealthStatusLabel(sourceResult.status)}
                      </span>
                    )}
                  </div>
                  <span>{result?.message ?? describeUpdateStrategy(tool)}</span>
                  <small>{getToolUpdateStrategyDescription(strategy)}</small>
                  {(result?.currentVersion || result?.latestVersion) && (
                    <em>
                      {result.currentVersion ? `当前 ${result.currentVersion}` : "当前未知"}
                      {result.latestVersion ? ` · 最新 ${result.latestVersion}` : ""}
                    </em>
                  )}
                  {sourceResult && (
                    <small>
                      来源：{getToolSourceKindLabel(sourceResult.kind)} · {sourceResult.message}
                    </small>
                  )}
                  {result?.releaseUrl && (
                    <small>Release：{result.releaseUrl}</small>
                  )}
                </div>
                <div className="update-tool-actions">
                  <span className={`tool-status-pill ${mapUpdateStatusTone(status)}`}>
                    {ignored ? "已忽略" : getUpdateStatusLabel(status)}
                  </span>
                  {canUpdate && (
                    <button
                      className="mini-action install"
                      type="button"
                      disabled={isRunning}
                      onClick={() => void onUpdate(tool)}
                    >
                      <Download size={14} />
                      {status === "available" ? "更新" : "重装刷新"}
                    </button>
                  )}
                  {result?.latestVersion && (status === "available" || status === "reinstall") && (
                    ignored ? (
                      <button
                        className="mini-action"
                        type="button"
                        onClick={() => onClearIgnore(tool.id)}
                      >
                        <RotateCcw size={14} />
                        取消忽略
                      </button>
                    ) : (
                      <button
                        className="mini-action"
                        type="button"
                        onClick={() => onIgnore(tool.id, result.latestVersion!)}
                      >
                        <X size={14} />
                        忽略本版
                      </button>
                    )
                  )}
                  {status === "unknown" && (
                    <button
                      className="mini-action"
                      type="button"
                      onClick={() => onViewLogs(tool.id)}
                    >
                      <Terminal size={14} />
                      日志
                    </button>
                  )}
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`打开 ${tool.name} 来源`}
                    onClick={() => void onOpen(result?.releaseUrl ?? tool.repoUrl ?? tool.homepage)}
                  >
                    <ExternalLink size={15} />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

function describeUpdateStrategy(tool: Tool) {
  if (tool.collectionOnly) {
    return "只收纳到工具箱，不由 WinKitBox 更新。";
  }

  if (tool.wingetId) {
    return `检测只读取版本；更新时才执行 winget upgrade：${tool.wingetId}`;
  }

  if (tool.portable?.releaseApiUrl || tool.installer?.releaseApiUrl) {
    return "可读取最新 Release，但当前版本通常需要重装刷新。";
  }

  if (tool.customInstallCommand || tool.portable || tool.installer) {
    return "可执行重装刷新，无法自动判断当前版本。";
  }

  return "没有可用的自动更新检测来源。";
}

function getUpdateStatusLabel(status: ToolUpdateCheckResult["status"] | "unknown") {
  const labels: Record<ToolUpdateCheckResult["status"] | "unknown", string> = {
    unknown: "未检测",
    available: "可更新",
    current: "已最新",
    reinstall: "可刷新",
    skipped: "跳过",
    "not-installed": "未安装",
  };

  return labels[status];
}

function mapUpdateStatusTone(status: ToolUpdateCheckResult["status"] | "unknown") {
  if (status === "available" || status === "reinstall") {
    return "installing";
  }

  if (status === "current") {
    return "installed";
  }

  if (status === "skipped" || status === "not-installed") {
    return "not-installed";
  }

  return "unknown";
}

function getToolSourceHealthStatusLabel(status: ToolSourceHealthResult["status"]) {
  const labels: Record<ToolSourceHealthResult["status"], string> = {
    healthy: "来源正常",
    warning: "需关注",
    broken: "来源异常",
    skipped: "已跳过",
    unknown: "未检测",
  };

  return labels[status];
}

function getEnvironmentStatusLabel(status: "ok" | "warning" | "danger") {
  const labels = {
    ok: "正常",
    warning: "建议处理",
    danger: "需要修复",
  };

  return labels[status];
}

function getEnvironmentScoreTone(score: number) {
  if (score >= 85) {
    return "ok";
  }

  if (score >= 60) {
    return "warning";
  }

  return "danger";
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
  onRecordActivity,
  onOpenLogs,
  onCreateTask,
  onStartTask,
  onFinishTask,
  onFailTask,
}: {
  onLog: (level: LogEntry["level"], message: string) => void;
  onRecordActivity: (input: ActivityLogInput) => Promise<void>;
  onOpenLogs: () => void;
  onCreateTask: (input: {
    id: string;
    kind: TaskQueueKind;
    title: string;
    toolId?: string;
    toolName?: string;
    retryable?: boolean;
    retryKey?: string;
  }) => void;
  onStartTask: (taskId: string) => void;
  onFinishTask: (
    taskId: string,
    status: Exclude<TaskQueueStatus, "queued" | "running" | "error">,
    message?: string,
    exitCode?: number | null,
  ) => void;
  onFailTask: (taskId: string, message: string) => void;
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
  const [repairingEnvironmentActionId, setRepairingEnvironmentActionId] =
    useState("");
  const [isRepairingRecommendedEnvironment, setIsRepairingRecommendedEnvironment] =
    useState(false);
  const [dnsTestDomain, setDnsTestDomain] = useState(dnsTestDomains[0].domain);
  const [customDnsDomain, setCustomDnsDomain] = useState("");
  const effectiveDnsDomain = useMemo(() => {
    if (dnsTestDomain === customDnsDomainId) {
      const value = customDnsDomain.trim();
      return isValidDomain(value) ? value : dnsTestDomains[0].domain;
    }
    return dnsTestDomain;
  }, [dnsTestDomain, customDnsDomain]);
  const dnsCandidates = useMemo(
    () => flattenDnsServers(publicDnsProviders),
    [],
  );
  const selectedAdapter = info?.adapters.find(
    (adapter) => adapter.id === selectedAdapterId,
  );
  const environmentChecks = useMemo(
    () =>
      info?.environment
        ? createEnvironmentChecks(info.environment)
        : [],
    [info?.environment],
  );
  const environmentSummary = useMemo(
    () => createEnvironmentHealthSummary(environmentChecks),
    [environmentChecks],
  );
  const recommendedEnvironmentRepairs = useMemo(
    () => getRecommendedEnvironmentRepairs(environmentChecks),
    [environmentChecks],
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
      const message =
        error instanceof Error ? error.message : "读取本机配置失败。";
      onLog(
        "error",
        message,
      );
      await onRecordActivity({
        kind: "system",
        status: "error",
        title: "读取本机配置失败",
        detail: message,
        source: "本机配置",
      });
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

    if (dnsTestDomain === customDnsDomainId && !isValidDomain(customDnsDomain)) {
      onLog("warning", "请输入有效的自定义域名。");
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
        effectiveDnsDomain,
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
          `DNS 延迟检测完成，目标域名 ${effectiveDnsDomain}，最快的是 ${fastest.server}（${fastest.latencyMs}ms）。`,
        );
      } else {
        const message = `DNS 延迟检测完成，目标域名 ${effectiveDnsDomain}，没有可用结果。`;
        onLog(
          "warning",
          message,
        );
        await onRecordActivity({
          kind: "system",
          status: "warning",
          title: "DNS 延迟检测没有可用结果",
          detail: message,
          source: "本机配置",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "DNS 延迟检测失败。";
      onLog(
        "error",
        message,
      );
      await onRecordActivity({
        kind: "system",
        status: "error",
        title: "DNS 延迟检测失败",
        detail: message,
        source: "本机配置",
      });
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
        await onRecordActivity({
          kind: "system",
          status: "success",
          title: "网络配置已应用",
          detail: message,
          exitCode: result.code,
          source: "本机配置",
        });
      } else {
        onLog("warning", `网络配置命令结束，退出码 ${result.code ?? "未知"}。`);
        await onRecordActivity({
          kind: "system",
          status: "warning",
          title: "网络配置命令异常结束",
          detail: message,
          exitCode: result.code,
          source: "本机配置",
        });
      }
      await refreshSystemInfo();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "应用网络配置失败。";
      onLog(
        "error",
        errorMessage,
      );
      await onRecordActivity({
        kind: "system",
        status: "error",
        title: "应用网络配置失败",
        detail: errorMessage,
        source: "本机配置",
      });
    } finally {
      setIsApplying(false);
    }
  }

  async function setUtf8Beta(
    enabled: boolean,
    options: { skipConfirm?: boolean; refreshAfter?: boolean } = {},
  ): Promise<boolean> {
    if (!window.winKitBox) {
      onLog("warning", "浏览器预览模式不能修改系统区域设置。");
      return false;
    }

    const confirmed =
      options.skipConfirm ||
      window.confirm(
        enabled
          ? "将开启 Windows 的“使用 Unicode UTF-8 提供全球语言支持”，需要管理员确认并重启系统后生效。是否继续？"
          : "将关闭 Windows UTF-8 beta 开关并尽量恢复之前的代码页，需要管理员确认并重启系统后生效。是否继续？",
      );

    if (!confirmed) {
      return false;
    }

    const taskId = createTaskId("environment-utf8", enabled ? "enable" : "disable");
    onCreateTask({
      id: taskId,
      kind: "environment",
      title: enabled ? "开启 UTF-8 beta" : "关闭 UTF-8 beta",
      retryable: false,
    });
    onStartTask(taskId);
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
        await onRecordActivity({
          kind: "system",
          status: "success",
          title: enabled ? "开启 UTF-8 beta" : "关闭 UTF-8 beta",
          detail: "系统区域设置已写入，重启 Windows 后生效。",
          exitCode: result.code,
          source: "Windows 环境体检",
        });
        onFinishTask(
          taskId,
          "success",
          enabled ? "UTF-8 beta 开关已开启。" : "UTF-8 beta 开关已关闭。",
          result.code,
        );
      } else {
        onLog("warning", `UTF-8 设置命令结束，退出码 ${result.code ?? "未知"}。`);
        await onRecordActivity({
          kind: "system",
          status: "warning",
          title: enabled ? "开启 UTF-8 beta" : "关闭 UTF-8 beta",
          detail: "命令已结束，但退出码不是 0。",
          exitCode: result.code,
          source: "Windows 环境体检",
        });
        onFinishTask(
          taskId,
          "warning",
          `退出码 ${result.code ?? "未知"}。`,
          result.code,
        );
      }
      if (options.refreshAfter !== false) {
        await refreshSystemInfo();
      }
      return result.code === 0;
    } catch (error) {
      onLog(
        "error",
        error instanceof Error ? error.message : "修改 UTF-8 设置失败。",
      );
      await onRecordActivity({
        kind: "system",
        status: "error",
        title: enabled ? "开启 UTF-8 beta" : "关闭 UTF-8 beta",
        detail: error instanceof Error ? error.message : "修改 UTF-8 设置失败。",
        source: "Windows 环境体检",
      });
      onFailTask(
        taskId,
        error instanceof Error ? error.message : "修改 UTF-8 设置失败。",
      );
      return false;
    } finally {
      setIsSettingUtf8(false);
    }
  }

  async function repairEnvironmentAction(
    action: EnvironmentRepairAction,
    options: { skipConfirm?: boolean; refreshAfter?: boolean } = {},
  ): Promise<boolean> {
    if (!window.winKitBox) {
      onLog("warning", "浏览器预览模式不能修复 Windows 环境。");
      return false;
    }

    if (action.disabledReason) {
      onLog("warning", action.disabledReason);
      return false;
    }

    if (action.kind === "utf8") {
      return setUtf8Beta(true, options);
    }

    const confirmed =
      options.skipConfirm ||
      window.confirm(
        action.requiresAdmin
          ? `将执行“${action.label}”，可能弹出管理员确认窗口。是否继续？`
          : `将执行“${action.label}”。是否继续？`,
      );

    if (!confirmed) {
      return false;
    }

    const taskId = createTaskId("environment", action.id);
    onCreateTask({
      id: taskId,
      kind: "environment",
      title: action.label,
      retryable: false,
    });
    onStartTask(taskId);
    setRepairingEnvironmentActionId(action.id);
    try {
      onLog("info", `开始处理：${action.label}。`);

      if (action.kind === "url") {
        if (!action.url) {
          throw new Error("缺少可打开的修复链接。");
        }
        await window.winKitBox.openUrl(action.url);
        await onRecordActivity({
          kind: "system",
          status: "info",
          title: action.label,
          detail: action.description,
          source: "Windows 环境体检",
        });
        onLog("info", `已打开：${action.label}。`);
        onFinishTask(taskId, "success", "已打开修复入口。");
        return true;
      }

      if (!action.command) {
        throw new Error("缺少修复命令。");
      }

      const result = await window.winKitBox.runPowerShell(action.command);
      const ok = result.code === 0;
      onLog(
        ok ? "success" : "warning",
        ok
          ? `${action.label} 已执行完成。`
          : `${action.label} 执行结束，退出码 ${result.code ?? "未知"}。`,
      );
      await onRecordActivity({
        kind: "system",
        status: ok ? "success" : "warning",
        title: action.label,
        detail: action.description,
        exitCode: result.code,
        source: "Windows 环境体检",
      });
      onFinishTask(
        taskId,
        ok ? "success" : "warning",
        ok ? `${action.label} 已执行完成。` : `退出码 ${result.code ?? "未知"}。`,
        result.code,
      );
      if (options.refreshAfter !== false) {
        await refreshSystemInfo();
      }
      return ok;
    } catch (error) {
      const message = error instanceof Error ? error.message : `${action.label} 失败。`;
      onLog("error", message);
      await onRecordActivity({
        kind: "system",
        status: "error",
        title: action.label,
        detail: message,
        source: "Windows 环境体检",
      });
      onFailTask(taskId, message);
      return false;
    } finally {
      setRepairingEnvironmentActionId("");
    }
  }

  async function repairRecommendedEnvironmentActions() {
    if (recommendedEnvironmentRepairs.length === 0) {
      onLog("info", "当前没有推荐的一键修复项。");
      return;
    }

    const confirmed = window.confirm(
      `将依次执行 ${recommendedEnvironmentRepairs.length} 个推荐修复项，部分步骤可能弹出管理员确认或安装窗口。是否继续？`,
    );

    if (!confirmed) {
      return;
    }

    setIsRepairingRecommendedEnvironment(true);
    try {
      let successCount = 0;
      for (const action of recommendedEnvironmentRepairs) {
        const ok = await repairEnvironmentAction(action, {
          skipConfirm: true,
          refreshAfter: false,
        });
        if (ok) {
          successCount += 1;
        }
      }
      await refreshSystemInfo();
      onLog(
        successCount === recommendedEnvironmentRepairs.length ? "success" : "warning",
        `推荐修复已执行 ${successCount}/${recommendedEnvironmentRepairs.length} 项。`,
      );
    } finally {
      setIsRepairingRecommendedEnvironment(false);
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
        <div className="top-actions">
          <button className="ghost-button" type="button" onClick={onOpenLogs}>
            <Terminal size={16} />
            系统日志
          </button>
          <button
            className="ghost-button"
            type="button"
            disabled={isLoading}
            onClick={refreshSystemInfo}
          >
            <RotateCcw size={16} className={isLoading ? "spin" : ""} />
            {isLoading ? "刷新中" : "刷新配置"}
          </button>
        </div>
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

      <section className="settings-card environment-card">
        <div className="environment-head">
          <div>
            <div className="section-title">
              <Gauge size={15} />
              Windows 环境体检
            </div>
            <p>检查装机和运行常用工具所需的基础环境，并在可处理时直接修复。</p>
          </div>
          <button
            className={
              recommendedEnvironmentRepairs.length > 0
                ? "primary-button"
                : "secondary-button"
            }
            type="button"
            disabled={
              isRepairingRecommendedEnvironment ||
              recommendedEnvironmentRepairs.length === 0
            }
            onClick={() => void repairRecommendedEnvironmentActions()}
          >
            <Wrench size={15} />
            {isRepairingRecommendedEnvironment
              ? "修复中"
              : recommendedEnvironmentRepairs.length > 0
                ? `一键修复 ${recommendedEnvironmentRepairs.length} 项`
                : "暂无修复项"}
          </button>
        </div>
        {environmentChecks.length === 0 ? (
          <p className="empty-text">刷新本机配置后显示体检结果。</p>
        ) : (
          <>
            <div className="environment-overview">
              <div
                className={`environment-score ${getEnvironmentScoreTone(
                  environmentSummary.score,
                )}`}
              >
                <span>健康分</span>
                <strong>{environmentSummary.score}</strong>
              </div>
              <div className="environment-metrics">
                <span>
                  <Check size={14} />
                  正常 {environmentSummary.ok}
                </span>
                <span>
                  <Info size={14} />
                  建议 {environmentSummary.warning}
                </span>
                <span>
                  <ShieldAlert size={14} />
                  修复 {environmentSummary.danger}
                </span>
                <span>
                  <Wrench size={14} />
                  可一键 {environmentSummary.recommendedRepairCount}
                </span>
              </div>
            </div>

            <div className="environment-repair-note">
              <Wrench size={15} />
              <span>
                可一键处理的项目会直接显示修复按钮；需要人工确认、重启或外部安装器的项目会保留说明，不会静默修改系统。
              </span>
            </div>

            <div className="environment-check-grid">
              {environmentChecks.map((check) => (
                <div
                  className={`environment-check ${check.status}`}
                  key={check.id}
                >
                  <div className="environment-check-head">
                    <strong>{check.label}</strong>
                    <span className={`status-pill ${check.status}`}>
                      {getEnvironmentStatusLabel(check.status)}
                    </span>
                  </div>
                  <span>{check.detail}</span>
                  <div className="environment-impact-row">
                    {check.impact.map((impact) => (
                      <small key={impact}>{impact}</small>
                    ))}
                  </div>
                  {check.action && <em>{check.action}</em>}
                  {check.repair ? (
                    <button
                      className="environment-repair-button"
                      type="button"
                      disabled={
                        Boolean(check.repair.disabledReason) ||
                        repairingEnvironmentActionId === check.repair.id ||
                        isRepairingRecommendedEnvironment
                      }
                      title={check.repair.disabledReason}
                      onClick={() => void repairEnvironmentAction(check.repair!)}
                    >
                      <Wrench size={14} />
                      {repairingEnvironmentActionId === check.repair.id
                        ? "处理中"
                        : check.repair.label}
                    </button>
                  ) : (
                    <small className="environment-ok">
                      <Check size={14} />
                      当前无需处理
                    </small>
                  )}
                  {check.repair?.disabledReason && (
                    <small className="environment-disabled">
                      {check.repair.disabledReason}
                    </small>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

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
              onClick={() => void setUtf8Beta(!info?.utf8BetaEnabled)}
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
          <div className="dns-head-main">
            <div className="section-title">
              <HardDriveDownload size={15} />
              公共 DNS 推荐
            </div>
            <p>
              先测延迟，再点“使用”填入上方 DNS。实际快慢也会受运营商和地区影响。
            </p>
            <div className="dns-domain-controls">
              <label className="field-label">
                测试域名
                <select
                  className="dns-domain-select"
                  value={dnsTestDomain}
                  onChange={(event) => setDnsTestDomain(event.target.value)}
                >
                  {dnsTestDomains.map((item) => (
                    <option key={item.id} value={item.domain}>
                      {item.label}
                    </option>
                  ))}
                  <option value={customDnsDomainId}>自定义...</option>
                </select>
              </label>
              {dnsTestDomain === customDnsDomainId && (
                <label className="field-label">
                  自定义域名
                  <input
                    value={customDnsDomain}
                    onChange={(event) => setCustomDnsDomain(event.target.value)}
                    placeholder="例如 mysite.example.com"
                  />
                </label>
              )}
            </div>
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
          <div className="dns-results">
            <div className="dns-results-header">
              <span>{getDnsTestDomainLabel(effectiveDnsDomain)} 的解析延迟</span>
            </div>
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
        </div>
        )}
      </section>
    </div>
  );
}

export function SettingsView({
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
  saveProxySettings,
  saveTheme,
  feedback,
  onSelectCustomThemeBackground,
  onClearCustomThemeBackground,
  onLog,
  onExportConfig,
  onImportConfig,
  configBackups,
  onCreateBackup,
  onRestoreBackup,
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
  saveProxySettings: (proxy: {
    proxyMode: ProxyMode;
    proxyManual: string;
  }) => Promise<void>;
  saveTheme: (themeId: ThemeId) => Promise<void>;
  feedback?: PageFeedback;
  onSelectCustomThemeBackground: (themeId: ThemeId) => Promise<void>;
  onClearCustomThemeBackground: (themeId: ThemeId) => Promise<void>;
  onLog: (level: LogEntry["level"], message: string) => void;
  onExportConfig: () => Promise<void>;
  onImportConfig: () => Promise<void>;
  configBackups: ConfigBackupEntry[];
  onCreateBackup: () => Promise<void>;
  onRestoreBackup: (fileName: string) => Promise<void>;
}) {
  const [aiDraft, setAiDraft] = useState({
    aiBaseUrl: settings.aiBaseUrl,
    aiApiKey: settings.aiApiKey,
    aiModel: settings.aiModel,
  });
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [showModelList, setShowModelList] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [aiBusy, setAiBusy] = useState<
    "models" | "test" | "generate" | undefined
  >();
  const [aiConnectionStatus, setAiConnectionStatus] = useState<
    { level: "success" | "error"; message: string } | undefined
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
    setAiConnectionStatus(undefined);
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
      const message = `已检测到 ${result.models.length} 个可用模型。`;
      setAiConnectionStatus({
        level: "success",
        message,
      });
      onLog("success", message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "模型检测失败。";
      setAiConnectionStatus({
        level: "error",
        message,
      });
      onLog("error", message);
    } finally {
      setAiBusy(undefined);
    }
  }

  function updateAiDraft(patch: Partial<typeof aiDraft>) {
    setAiDraft((current) => ({
      ...current,
      ...patch,
    }));
    setAiConnectionStatus(undefined);
  }

  async function testAiConnection() {
    if (!window.winKitBox) {
      return;
    }

    setAiBusy("test");
    setAiConnectionStatus(undefined);
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
      setAiConnectionStatus({
        level: "success",
        message: "AI 接口连通性测试通过。",
      });
      onLog("success", "AI 接口连通性测试通过。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI 连通性测试失败。";
      setAiConnectionStatus({
        level: "error",
        message,
      });
      onLog(
        "error",
        message,
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

      {feedback && (
        <p className={`settings-status page-feedback ${feedback.level}`}>
          {feedback.message}
        </p>
      )}

      <div className="settings-layout">
        <section className="settings-card full-span">
          <div className="section-title">
            <Sparkles size={15} />
            主题与背景
          </div>

          <div className="section-title compact-title">选择背景主题</div>
          <div className="background-grid">
            {themeDefinitions.map((theme) => {
              const active = settings.themeId === theme.id;
              const customBackground = settings.themeBackgrounds[theme.id];

              return (
                <div
                  key={theme.id}
                  className={`background-card ${active ? "active" : ""}`}
                >
                  <button
                    aria-pressed={active}
                    className="background-preview"
                    type="button"
                    title={theme.description}
                    onClick={() => saveTheme(theme.id)}
                  >
                    <span
                      className="background-thumb"
                      style={{
                        backgroundImage: toCssUrl(
                          customBackground ?? theme.imageBackground ?? "",
                        ),
                        backgroundPosition:
                          theme.id === "azure" ? "center" : "right center",
                        borderColor: theme.accent,
                      }}
                    />
                    <span className="background-check">
                      <Check size={16} />
                    </span>
                    <strong>{theme.name}</strong>
                    <small>{theme.description}</small>
                  </button>
                  <div className="background-actions">
                    <button
                      className="icon-button"
                      type="button"
                      title="上传自定义背景"
                      onClick={() => onSelectCustomThemeBackground(theme.id)}
                    >
                      <Upload size={14} />
                    </button>
                    {customBackground && (
                      <button
                        className="icon-button"
                        type="button"
                        title="恢复默认背景"
                        onClick={() => onClearCustomThemeBackground(theme.id)}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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

        <section className="settings-card">
          <div className="section-title">
            <Network size={15} />
            网络代理
          </div>
          <div className="proxy-options settings-proxy-options">
            {(["system", "direct", "manual"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`proxy-mode-button ${settings.proxyMode === mode ? "active" : ""}`}
                onClick={() =>
                  void saveProxySettings({
                    proxyMode: mode,
                    proxyManual: settings.proxyManual,
                  })
                }
              >
                {mode === "system" ? "系统代理" : mode === "direct" ? "直连" : "手动代理"}
              </button>
            ))}
          </div>
          <label className="field-label">
            手动代理地址
            <input
              value={settings.proxyManual}
              onChange={(event) =>
                void saveProxySettings({
                  proxyMode: settings.proxyMode,
                  proxyManual: event.target.value,
                })
              }
              placeholder="http://127.0.0.1:7890 或 socks5://127.0.0.1:7890"
              disabled={settings.proxyMode !== "manual"}
            />
          </label>
          <p className="settings-note">
            影响 GitHub 更新检查、榜单、翻译及安装包下载。系统代理会读取操作系统代理设置。
          </p>
        </section>

        <section className="settings-card full-span ai-settings-card">
          <div className="section-title">
            <Sparkles size={15} />
            AI 模型
          </div>
          <div className="custom-tool-form ai-tool-form">
            <label className="field-label">
              API URL
              <input
                value={aiDraft.aiBaseUrl}
                onChange={(event) =>
                  updateAiDraft({ aiBaseUrl: event.target.value })
                }
                placeholder="https://api.openai.com/v1"
              />
            </label>
            <label className="field-label">
              API Key
              <input
                value={aiDraft.aiApiKey}
                onChange={(event) =>
                  updateAiDraft({ aiApiKey: event.target.value })
                }
                placeholder="sk-..."
                type="password"
              />
            </label>
            <label className="field-label">
              模型名称
              <input
                value={aiDraft.aiModel}
                onChange={(event) =>
                  updateAiDraft({ aiModel: event.target.value })
                }
                placeholder="可手填，例如 gpt-4.1-mini"
              />
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
              disabled={detectedModels.length === 0}
              onClick={() => setShowModelList(true)}
            >
              <ChevronDown size={15} />
              选择模型
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
              onClick={() =>
                void saveAiSettings({
                  aiBaseUrl: aiDraft.aiBaseUrl,
                  aiApiKey: aiDraft.aiApiKey,
                  aiModel: aiDraft.aiModel,
                })
              }
            >
              <Save size={15} />
              保存 AI 设置
            </button>
          </div>
          {aiConnectionStatus && (
            <p className={`settings-status ${aiConnectionStatus.level}`}>
              {aiConnectionStatus.message}
            </p>
          )}
          <p className="settings-note">
            添加工具、GitHub AI 助手和 AI 修复会复用这里保存的模型配置。
          </p>
        </section>

        {showModelList && (
          <div className="model-picker-backdrop" role="presentation">
            <div className="model-picker-dialog" role="dialog" aria-modal="true">
              <div className="model-picker-head">
                <div>
                  <div className="section-title">
                    <Sparkles size={15} />
                    选择 AI 模型
                  </div>
                  <p>点击模型即可填入；也可以关闭窗口后继续手动输入。</p>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="关闭模型选择"
                  onClick={() => setShowModelList(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="search-row model-picker-search">
                <Search size={16} />
                <input
                  value={modelSearch}
                  onChange={(event) => setModelSearch(event.target.value)}
                  placeholder="搜索模型名称"
                />
              </div>
              <div className="model-picker-list">
                {detectedModels
                  .filter((model) =>
                    model.toLowerCase().includes(modelSearch.trim().toLowerCase()),
                  )
                  .map((model) => (
                    <button
                      className={`model-picker-item ${aiDraft.aiModel === model ? "active" : ""}`}
                      key={model}
                      type="button"
                      onClick={() => {
                        setAiDraft((current) => ({ ...current, aiModel: model }));
                        setAiConnectionStatus(undefined);
                        setShowModelList(false);
                      }}
                    >
                      <span>{model}</span>
                      {aiDraft.aiModel === model && <Check size={16} />}
                    </button>
                  ))}
              </div>
              {detectedModels.length === 0 && (
                <p className="settings-note">还没有检测结果，请先点击“检测可用模型”。</p>
              )}
            </div>
          </div>
        )}


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
          <div className="config-backup-panel">
            <div className="config-backup-head">
              <div>
                <strong>本机备份与回滚</strong>
                <span>保留最近 5 份设置快照。</span>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={onCreateBackup}
              >
                <Save size={14} />
                创建备份
              </button>
            </div>
            {configBackups.length === 0 ? (
              <p className="settings-note">还没有本机配置备份。</p>
            ) : (
              <div className="config-backup-list">
                {configBackups.map((backup) => (
                  <div className="config-backup-item" key={backup.fileName}>
                    <span>
                      {getConfigBackupLabel(backup)}
                      <small>{formatBytes(backup.sizeBytes)}</small>
                    </span>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => onRestoreBackup(backup.fileName)}
                    >
                      恢复
                    </button>
                  </div>
                ))}
              </div>
            )}
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


function getToolActivitySource(tool: Tool) {
  if (tool.wingetId) {
    return `winget:${tool.wingetId}`;
  }

  if (tool.portable?.releaseApiUrl || tool.installer?.releaseApiUrl) {
    return "github-release";
  }

  if (tool.localSource?.kind) {
    return `local-${tool.localSource.kind}`;
  }

  if (tool.customInstallCommand) {
    return "custom-command";
  }

  return tool.source;
}

function getActivityStatusFromExitCode(code: number | null) {
  return code === 0 ? "success" : "error";
}

function formatExitCode(code: number | null) {
  return `退出码 ${code ?? "未知"}`;
}

function formatActivityTime(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivityKindLabel(kind: ActivityLogEntry["kind"]) {
  const labels: Record<ActivityLogEntry["kind"], string> = {
    install: "安装",
    uninstall: "卸载",
    update: "更新",
    "update-check": "检测",
    launch: "打开",
    ai: "AI",
    config: "配置",
    system: "系统",
    category: "分类",
    theme: "主题",
  };

  return labels[kind];
}

function ToolDetailDrawer({
  tool,
  toolState,
  selected,
  isCustom,
  updateResult,
  recentActivities,
  recentAiLogs,
  categoryName,
  onClose,
  onToggle,
  onInstall,
  onUninstall,
  onLaunch,
  onOpen,
  onAiFix,
  onViewLogs,
  onRemove,
}: {
  tool: Tool;
  toolState: ToolRuntimeState;
  selected: boolean;
  isCustom: boolean;
  updateResult?: ToolUpdateCheckResult;
  recentActivities: ActivityLogEntry[];
  recentAiLogs: AiLogEntry[];
  categoryName: string;
  onClose: () => void;
  onToggle: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onLaunch: () => void;
  onOpen: () => void;
  onAiFix: () => void;
  onViewLogs: () => void;
  onRemove: () => void;
}) {
  const canOpen =
    toolState.status !== "installing" &&
    toolState.status !== "uninstalling" &&
    toolState.status !== "opening" &&
    toolState.status !== "checking" &&
    toolState.status !== "not-installed" &&
    toolState.launcherFound !== false;
  const canUninstall = !tool.collectionOnly && toolState.status === "installed";
  const canInstall =
    !tool.collectionOnly &&
    toolState.status !== "installing" &&
    toolState.status !== "uninstalling" &&
    toolState.status !== "checking";

  return (
    <div className="tool-detail-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="tool-detail-drawer"
        aria-label={`${tool.name} 详情`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tool-detail-head">
          <div>
            <p className="eyebrow">工具详情</p>
            <h2>{tool.name}</h2>
            <span>{tool.summary}</span>
          </div>
          <button className="icon-button" type="button" aria-label="关闭详情" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <p className="tool-detail-description">{tool.description}</p>

        <div className="tool-detail-actions">
          <button className={selected ? "secondary-button" : "primary-button"} type="button" onClick={onToggle}>
            <Check size={15} />
            {selected ? "取消选择" : "加入选择"}
          </button>
          <button className="secondary-button" type="button" disabled={!canInstall} onClick={onInstall}>
            <Download size={15} />
            安装
          </button>
          <button className="secondary-button" type="button" disabled={!canOpen} onClick={onLaunch}>
            <Play size={15} />
            打开
          </button>
          <button className="secondary-button danger" type="button" disabled={!canUninstall} onClick={onUninstall}>
            <Trash2 size={15} />
            卸载
          </button>
        </div>

        <dl className="tool-detail-grid">
          <dt>状态</dt>
          <dd>{getStatusLabel(toolState.status)}{toolState.message ? ` · ${toolState.message}` : ""}</dd>
          <dt>分类</dt>
          <dd>{categoryName}</dd>
          <dt>来源</dt>
          <dd>{sourceLabels[tool.source]}</dd>
          <dt>许可证</dt>
          <dd>{tool.license}</dd>
          <dt>风险</dt>
          <dd>{riskLabels[tool.risk]}{tool.requiresAdmin ? " · 需要管理员" : ""}</dd>
          <dt>主页</dt>
          <dd>{tool.repoUrl ?? tool.homepage}</dd>
          <dt>安装方式</dt>
          <dd>{describeUpdateStrategy(tool)}</dd>
          {updateResult && (
            <>
              <dt>更新</dt>
              <dd>
                {getUpdateStatusLabel(updateResult.status)}
                {updateResult.latestVersion ? ` · 最新 ${updateResult.latestVersion}` : ""}
              </dd>
            </>
          )}
        </dl>

        <div className="tool-detail-button-row">
          <button className="secondary-button" type="button" onClick={onOpen}>
            <ExternalLink size={14} />
            打开来源
          </button>
          <button className="secondary-button" type="button" onClick={onViewLogs}>
            <Terminal size={14} />
            相关日志
          </button>
          {toolState.status === "failed" && (
            <button className="primary-button" type="button" onClick={onAiFix}>
              <Sparkles size={14} />
              AI 修复
            </button>
          )}
          {isCustom && (
            <button className="secondary-button danger" type="button" onClick={onRemove}>
              <X size={14} />
              移除
            </button>
          )}
        </div>

        <section className="tool-detail-section">
          <div className="section-title">
            <Terminal size={15} />
            最近操作
          </div>
          {recentActivities.length === 0 ? (
            <p className="empty-text">暂无该工具的操作历史。</p>
          ) : (
            recentActivities.map((entry) => (
              <div className={`tool-detail-log ${entry.status}`} key={entry.id}>
                <strong>{entry.title}</strong>
                <span>
                  {new Date(entry.createdAt).toLocaleString()} · {getActivityKindLabel(entry.kind)}
                </span>
              </div>
            ))
          )}
        </section>

        <section className="tool-detail-section">
          <div className="section-title">
            <Sparkles size={15} />
            AI 记录
          </div>
          {recentAiLogs.length === 0 ? (
            <p className="empty-text">暂无该工具的 AI 记录。</p>
          ) : (
            recentAiLogs.map((entry) => (
              <div className={`tool-detail-log ${entry.status}`} key={entry.id}>
                <strong>{entry.title}</strong>
                <span>{entry.response || entry.prompt || "无详情"}</span>
              </div>
            ))
          )}
        </section>
      </aside>
    </div>
  );
}


function ToolCard({
  tool,
  toolState,
  selected,
  categories,
  isCustom,
  dragging,
  onToggle,
  onInstall,
  onUninstall,
  onLaunch,
  onShowDetails,
  onSetCategory,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  tool: Tool;
  toolState: ToolRuntimeState;
  selected: boolean;
  categories: CategoryDefinition[];
  isCustom: boolean;
  dragging: boolean;
  onToggle: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onLaunch: () => void;
  onShowDetails: () => void;
  onSetCategory: (categoryId: string) => void;
  onRemove: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [showLifecycleMenu, setShowLifecycleMenu] = useState(false);
  const logoUrl = getToolLogoUrl(tool);
  const isInstalled = toolState.status === "installed";
  const lifecycleDisabled =
    tool.collectionOnly ||
    toolState.status === "installing" ||
    toolState.status === "uninstalling" ||
    toolState.status === "checking";
  const openDisabled =
    toolState.status === "installing" ||
    toolState.status === "uninstalling" ||
    toolState.status === "opening" ||
    toolState.status === "checking" ||
    toolState.status === "not-installed" ||
    toolState.launcherFound === false;
  const lifecycleLabel = tool.collectionOnly
    ? "无需安装"
    : isInstalled
      ? "管理"
      : getInstallButtonLabel(toolState.status);
  const LifecycleIcon = isInstalled ? Wrench : Download;

  function handleLifecycleAction() {
    if (isInstalled) {
      setShowLifecycleMenu((value) => !value);
      return;
    }

    onInstall();
  }

  return (
    <article
      className={`tool-card ${selected ? "selected" : ""} ${dragging ? "dragging" : ""} status-${toolState.status}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
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
        <div className="tool-category-row">
          <select
            className="tool-category-select"
            value={tool.category}
            onChange={(event) => onSetCategory(event.target.value)}
            title="修改分类"
          >
            <option value={uncategorizedCategoryId}>未分类</option>
            {tool.category !== uncategorizedCategoryId &&
              !categories.some((category) => category.id === tool.category) && (
                <option value={tool.category} disabled>
                  {categoryLabels[tool.category] ?? tool.category}
                </option>
              )}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {isCustom && (
            <button
              className="mini-action remove"
              type="button"
              onClick={onRemove}
            >
              <X size={14} />
              移除
            </button>
          )}
        </div>
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
            className="mini-action install lifecycle-action"
            type="button"
            disabled={lifecycleDisabled}
            onClick={handleLifecycleAction}
          >
            <LifecycleIcon size={14} />
            {lifecycleLabel}
            {isInstalled && <ChevronDown size={13} />}
          </button>
          {showLifecycleMenu && isInstalled && (
            <div className="tool-action-menu">
              <button
                type="button"
                onClick={() => {
                  setShowLifecycleMenu(false);
                  onInstall();
                }}
              >
                <Download size={14} />
                重装
              </button>
              <button
                className="danger"
                type="button"
                onClick={() => {
                  setShowLifecycleMenu(false);
                  onUninstall();
                }}
              >
                <Trash2 size={14} />
                卸载
              </button>
            </div>
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
            className="mini-action"
            type="button"
            onClick={() => {
              setShowLifecycleMenu(false);
              onShowDetails();
            }}
          >
            <Info size={14} />
            详情
          </button>
        </div>
      </div>
    </article>
  );
}
