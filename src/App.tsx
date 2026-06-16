import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  ExternalLink,
  Filter,
  FolderKanban,
  Github,
  HardDriveDownload,
  Info,
  ListChecks,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Trash2
} from "lucide-react";
import { DiscoverView } from "./DiscoverView";
import winkitboxIconUrl from "../assets/icon/winkitbox-icon.png";
import { categoryLabels, presets, tools, type Tool, type ToolCategory } from "./core/catalog";
import { createDashboardStats } from "./core/dashboardStats";
import { createLaunchDescriptor, getToolLogoUrl } from "./core/launcher";
import {
  buildInstallCommand,
  buildPowerShellScript,
  buildUninstallPowerShellScript,
  createInstallPlan,
  createUninstallPlan,
  getDefaultSelection,
  searchTools
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
  type ToolRuntimeStates
} from "./core/toolStatus";
import type { UpdateInfo } from "./core/update";

type CategoryFilter = "all" | ToolCategory;
type ActiveView = "catalog" | "discover";

type LogEntry = {
  id: number;
  level: "info" | "success" | "warning" | "error";
  message: string;
};

type ToolPathSettings = {
  toolRootPath: string;
  defaultToolRootPath: string;
};

const categoryOrder: CategoryFilter[] = [
  "all",
  "starter",
  "system",
  "files",
  "capture",
  "cleanup",
  "desktop",
  "network",
  "rescue"
];

const sourceLabels: Record<Tool["source"], string> = {
  winget: "winget",
  scoop: "scoop",
  github: "GitHub",
  store: "Store",
  website: "官网",
  builtin: "内置"
};

const riskLabels: Record<Tool["risk"], string> = {
  low: "低风险",
  medium: "需确认",
  high: "谨慎"
};

const categoryIcons: Record<ToolCategory, typeof Download> = {
  starter: Sparkles,
  system: Terminal,
  files: FolderKanban,
  capture: Clipboard,
  cleanup: Trash2,
  desktop: ListChecks,
  network: HardDriveDownload,
  rescue: ShieldAlert
};

let logCounter = 0;
const selectionStorageKey = "winkitbox:selected-tools:v1";
const fallbackSettings: ToolPathSettings = {
  toolRootPath: "%LOCALAPPDATA%\\WinKitBox",
  defaultToolRootPath: "%LOCALAPPDATA%\\WinKitBox"
};
const releasePageUrl = "https://github.com/575674384-stack/winkitbox/releases";

function getCategoryLabel(category: CategoryFilter) {
  return category === "all" ? "全部工具" : categoryLabels[category];
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

export function App() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const fallback = getDefaultSelection(tools);
    const knownIds = new Set(tools.map((tool) => tool.id));
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
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: ++logCounter,
      level: "info",
      message: "WinKitBox 已就绪。先预览安装计划，再决定是否执行。"
    }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [toolStates, setToolStates] = useState<ToolRuntimeStates>({});
  const [installProgress, setInstallProgress] = useState<InstallProgress>(() => createEmptyInstallProgress());
  const [settings, setSettings] = useState<ToolPathSettings>(fallbackSettings);
  const [toolRootDraft, setToolRootDraft] = useState(fallbackSettings.toolRootPath);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const plannerOptions = useMemo(
    () => ({ managedRootPath: settings.toolRootPath }),
    [settings.toolRootPath]
  );
  const installPlan = useMemo(
    () => createInstallPlan(tools, selectedIds, plannerOptions),
    [selectedIds, plannerOptions]
  );
  const selectedInstalledIds = useMemo(
    () =>
      new Set(
        tools
          .filter((tool) => selectedIds.has(tool.id) && toolStates[tool.id]?.status === "installed")
          .map((tool) => tool.id)
      ),
    [selectedIds, toolStates]
  );
  const uninstallPlan = useMemo(
    () => createUninstallPlan(tools, selectedInstalledIds, plannerOptions),
    [selectedInstalledIds, plannerOptions]
  );
  const script = useMemo(() => buildPowerShellScript(installPlan), [installPlan]);
  const uninstallScript = useMemo(() => buildUninstallPowerShellScript(uninstallPlan), [uninstallPlan]);
  const selectedTools = useMemo(() => tools.filter((tool) => selectedIds.has(tool.id)), [selectedIds]);
  const selectedInstalledTools = useMemo(
    () => tools.filter((tool) => selectedInstalledIds.has(tool.id)),
    [selectedInstalledIds]
  );
  const dashboardStats = useMemo(
    () => createDashboardStats({ tools, selectedIds, toolStates, installPlan }),
    [selectedIds, toolStates, installPlan]
  );

  const visibleTools = useMemo(() => {
    const categoryFiltered =
      activeCategory === "all" ? tools : tools.filter((tool) => tool.category === activeCategory);
    return searchTools(categoryFiltered, query);
  }, [activeCategory, query]);

  useEffect(() => {
    void (async () => {
      if (!window.winKitBox) {
        await refreshToolStates(tools);
        return;
      }

      try {
        const nextSettings = await window.winKitBox.getSettings();
        setSettings(nextSettings);
        setToolRootDraft(nextSettings.toolRootPath);
        await refreshToolStates(tools, { managedRootPath: nextSettings.toolRootPath });
      } catch (error) {
        appendLog("warning", error instanceof Error ? error.message : "读取工具目录设置失败。");
        await refreshToolStates(tools);
      }

      await checkForUpdates(true);
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
    localStorage.setItem(selectionStorageKey, JSON.stringify(Array.from(selectedIds)));
  }, [selectedIds]);

  function appendLog(level: LogEntry["level"], message: string) {
    if (!message) {
      return;
    }

    setLogs((current) => [
      {
        id: ++logCounter,
        level,
        message
      },
      ...current
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
    setToolStates((current) => applyRunEventSnapshot(event, current, createEmptyInstallProgress()).states);
    setInstallProgress((current) => applyRunEventSnapshot(event, {}, current).progress);

    if (event.type === "plan-start") {
      appendLog(
        "info",
        event.action === "uninstall"
          ? `开始执行卸载计划，共 ${event.total} 个卸载项。`
          : `开始执行安装计划，共 ${event.total} 个自动安装项。`
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

  async function refreshToolStates(targetTools: Tool[], options = plannerOptions) {
    if (!window.winKitBox || targetTools.length === 0) {
      return;
    }

    const descriptors = targetTools.map((tool) => createLaunchDescriptor(tool, options));
    const toolIds = descriptors.map((descriptor) => descriptor.toolId);

    setToolStates((current) => markToolsChecking(current, toolIds));

    try {
      const results = await window.winKitBox.detectTools(descriptors);
      setToolStates((current) => applyDetectionResults(current, results, toolIds));
    } catch (error) {
      setToolStates((current) => {
        const next = { ...current };
        for (const toolId of toolIds) {
          if (next[toolId]?.status === "checking") {
            next[toolId] = {
              status: "unknown",
              message: "检测失败，可以稍后重试。"
            };
          }
        }
        return next;
      });
      appendLog("warning", error instanceof Error ? error.message : "安装状态检测失败。");
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

  function applyPreset(toolIds: string[]) {
    setSelectedIds(new Set(toolIds));
    appendLog("success", `已应用方案，共选择 ${toolIds.length} 个工具。`);
  }

  async function copyScript() {
    await navigator.clipboard.writeText(script);
    appendLog("success", "安装脚本已复制。");
  }

  async function copyUninstallScript() {
    await navigator.clipboard.writeText(uninstallScript);
    appendLog("success", "卸载脚本已复制。");
  }

  function simulateRun() {
    appendLog("info", "开始模拟安装计划。");
    for (const item of installPlan.commands) {
      if (item.command) {
        appendLog("success", `[模拟] ${item.label}: ${item.command}`);
      } else {
        appendLog("warning", `[手动] ${item.label}: ${item.manualUrl}`);
      }
    }
    appendLog("success", "模拟完成。");
  }

  async function saveToolRootPath(path = toolRootDraft) {
    const nextPath = path.trim();

    if (!nextPath) {
      appendLog("warning", "工具目录不能为空。");
      return;
    }

    if (!window.winKitBox) {
      setSettings({ ...settings, toolRootPath: nextPath });
      setToolRootDraft(nextPath);
      appendLog("warning", "浏览器预览模式只会临时显示这个目录，桌面版才能真正保存。");
      return;
    }

    try {
      const savedSettings = await window.winKitBox.setSettings({ toolRootPath: nextPath });
      setSettings(savedSettings);
      setToolRootDraft(savedSettings.toolRootPath);
      appendLog("success", `工具目录已切换到 ${savedSettings.toolRootPath}。`);
      await refreshToolStates(tools, { managedRootPath: savedSettings.toolRootPath });
    } catch (error) {
      appendLog("error", error instanceof Error ? error.message : "保存工具目录失败。");
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
        appendLog("success", `发现新版 v${info.latestVersion}，可以打开发行页下载。`);
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
        appendLog("error", error instanceof Error ? error.message : "检查更新失败。");
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  async function openUpdateRelease() {
    await openUrl(updateInfo?.releaseUrl || releasePageUrl);
  }

  async function runInstallPlan() {
    if (!window.winKitBox) {
      appendLog("warning", "当前在浏览器预览模式，不能直接执行 PowerShell。");
      return;
    }

    const confirmed = window.confirm(
      `将执行 ${installPlan.readyCount} 条安装命令。建议先确认右侧脚本内容，是否继续？`
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
      appendLog("error", error instanceof Error ? error.message : "执行安装计划失败。");
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
      `将卸载已选择且已安装的 ${uninstallPlan.readyCount} 个工具。卸载可能会弹出软件自己的确认窗口，是否继续？`
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
      appendLog("error", error instanceof Error ? error.message : "执行卸载计划失败。");
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
      appendLog("warning", `浏览器预览不能直接安装 ${tool.name}，请用桌面版或复制右侧脚本。`);
      return;
    }

    appendLog("info", `开始安装 ${tool.name}。`);
    const singlePlan = createInstallPlan([tool], new Set([tool.id]), plannerOptions);
    const result = await window.winKitBox.runPowerShell(buildPowerShellScript(singlePlan));
    await refreshToolStates([tool]);

    if (result.code === 0) {
      appendLog("success", `${tool.name} 安装命令已完成，可以点击打开试试。`);
    } else {
      appendLog("error", `${tool.name} 安装命令结束，退出码 ${result.code ?? "未知"}。`);
    }
  }

  async function uninstallTool(tool: Tool) {
    if (!window.winKitBox) {
      appendLog("warning", `浏览器预览不能直接卸载 ${tool.name}，请用桌面版运行 WinKitBox。`);
      return;
    }

    const confirmed = window.confirm(`将卸载 ${tool.name}。卸载可能会弹出软件自己的确认窗口，是否继续？`);

    if (!confirmed) {
      appendLog("info", `已取消卸载 ${tool.name}。`);
      return;
    }

    appendLog("info", `开始卸载 ${tool.name}。`);
    const singlePlan = createUninstallPlan([tool], new Set([tool.id]), plannerOptions);
    const result = await window.winKitBox.runPowerShell(buildUninstallPowerShellScript(singlePlan));
    await refreshToolStates([tool]);

    if (result.code === 0) {
      appendLog("success", `${tool.name} 卸载命令已完成。`);
    } else {
      appendLog("error", `${tool.name} 卸载命令结束，退出码 ${result.code ?? "未知"}。`);
    }
  }

  async function launchTool(tool: Tool) {
    if (!window.winKitBox) {
      appendLog("warning", `浏览器预览不能打开本地软件。请用桌面版运行 WinKitBox 后打开 ${tool.name}。`);
      return;
    }

    appendLog("info", `正在打开 ${tool.name}。`);
    setToolStates((current) => ({
      ...current,
      [tool.id]: {
        ...current[tool.id],
        status: "opening",
        message: `正在打开 ${tool.name}...`
      }
    }));

    const result = await window.winKitBox.launchTool(createLaunchDescriptor(tool, plannerOptions));

    if (result.code === 0) {
      setToolStates((current) => ({
        ...current,
        [tool.id]: {
          ...current[tool.id],
          status: "installed",
          message: `${tool.name} 已打开。`,
          launcherFound: true
        }
      }));
      appendLog("success", `${tool.name} 已发送启动请求。`);
    } else {
      await refreshToolStates([tool]);
      appendLog("warning", `没有找到 ${tool.name} 的已安装入口。可以先安装，或打开来源页面确认安装方式。`);
    }
  }

  return (
    <main className={`app-shell ${activeView === "discover" ? "discover-mode" : ""}`}>
      <aside className="sidebar" aria-label="WinKitBox navigation">
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
            <Filter size={15} />
            分类
          </div>
          <div className="category-list">
            {categoryOrder.map((category) => {
              const count =
                category === "all"
                  ? tools.length
                  : tools.filter((tool) => tool.category === category).length;
              const Icon = category === "all" ? ListChecks : categoryIcons[category];

              return (
                <button
                  className={`category-button ${activeCategory === category ? "active" : ""}`}
                  key={category}
                  type="button"
                  onClick={() => {
                    setActiveView("catalog");
                    setActiveCategory(category);
                  }}
                >
                  <span>
                    <Icon size={16} />
                    {getCategoryLabel(category)}
                  </span>
                  <strong>{count}</strong>
                </button>
              );
            })}
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
            <strong>实时</strong>
          </button>
        </div>

        <div className="nav-section presets">
          <div className="section-title">
            <Sparkles size={15} />
            方案
          </div>
          {presets.map((preset) => (
            <button
              className="preset-button"
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.toolIds)}
            >
              <span>{preset.name}</span>
              <small>{preset.toolIds.length} 个工具</small>
            </button>
          ))}
        </div>
      </aside>

      {activeView === "discover" ? (
        <section className="workspace">
          <DiscoverView onOpenUrl={openUrl} />
        </section>
      ) : (
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">一键恢复熟悉环境</p>
            <h2>选择工具，生成装机计划</h2>
          </div>
          <div className="top-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => setSelectedIds(getDefaultSelection(tools))}
            >
              <RotateCcw size={16} />
              默认
            </button>
            <button className="ghost-button danger" type="button" onClick={() => setSelectedIds(new Set())}>
              清空
            </button>
          </div>
        </header>

        <div className="stats-row">
          <Metric label="已选择" value={dashboardStats.selectedCount} tone="blue" />
          <Metric label="已安装" value={dashboardStats.installedCount} tone="green" />
          <Metric label="可自动安装" value={dashboardStats.readyCount} tone="green" />
          <Metric label="手动来源" value={dashboardStats.manualCount} tone="amber" />
          <Metric label="需管理员" value={dashboardStats.adminCount} tone="red" />
        </div>

        <div className="search-row">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索工具、标签、来源"
          />
        </div>

        <div className="tool-grid" aria-label="Tool catalog">
          {visibleTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              toolState={toolStates[tool.id] ?? { status: "unknown" }}
              selected={selectedIds.has(tool.id)}
              onToggle={() => toggleTool(tool.id)}
              onInstall={() => installTool(tool)}
              onUninstall={() => uninstallTool(tool)}
              onLaunch={() => launchTool(tool)}
              onOpen={() => openUrl(tool.repoUrl ?? tool.homepage)}
            />
          ))}
        </div>
      </section>
      )}

      {activeView === "catalog" && (
      <aside className="plan-panel" aria-label="Install plan">
        <div className="panel-header">
          <div>
            <p className="eyebrow">安装计划</p>
            <h2>{dashboardStats.selectedCount} 个工具</h2>
          </div>
          {installPlan.highRiskCount > 0 && (
            <span className="risk-warning">
              <ShieldAlert size={15} />
              {installPlan.highRiskCount} 项谨慎
            </span>
          )}
        </div>

        <InstallProgressCard progress={installProgress} readyCount={installPlan.readyCount} />

        <div className="settings-stack">
          <div className="settings-card">
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
              <button className="secondary-button" type="button" onClick={chooseToolRootPath}>
                选择
              </button>
              <button className="secondary-button" type="button" onClick={() => saveToolRootPath()}>
                保存
              </button>
            </div>
            <div className="settings-actions">
              <button className="text-button" type="button" onClick={resetToolRootPath}>
                恢复默认
              </button>
              <span>便携工具、安装器缓存和解压依赖都会放在这里。</span>
            </div>
          </div>

          <div className={`settings-card update-card ${updateInfo?.hasUpdate ? "has-update" : ""}`}>
            <div className="update-head">
              <div>
                <div className="section-title">
                  <RotateCcw size={15} />
                  更新
                </div>
                <p>
                  当前 v{__APP_VERSION__}
                  {updateInfo?.latestVersion ? ` · 最新 v${updateInfo.latestVersion}` : ""}
                </p>
              </div>
              {updateInfo?.hasUpdate && <strong>有新版</strong>}
            </div>
            <div className="settings-actions">
              <button className="secondary-button" type="button" disabled={isCheckingUpdate} onClick={() => checkForUpdates(false)}>
                <RotateCcw size={15} />
                {isCheckingUpdate ? "检查中" : "检查更新"}
              </button>
              <button className="secondary-button" type="button" onClick={openUpdateRelease}>
                <ExternalLink size={15} />
                发行页
              </button>
            </div>
            {updateInfo?.error && <p className="settings-error">{updateInfo.error}</p>}
          </div>
        </div>

        <div className="command-preview">
          <pre>{script}</pre>
        </div>

        <div className="plan-actions">
          <button className="primary-button" type="button" disabled={isRunning || installPlan.readyCount === 0} onClick={runInstallPlan}>
            <Play size={16} />
            执行安装
          </button>
          <button className="secondary-button danger" type="button" disabled={isRunning || uninstallPlan.readyCount === 0} onClick={runUninstallPlan}>
            <Trash2 size={16} />
            卸载已选
          </button>
          <button className="secondary-button" type="button" onClick={copyScript}>
            <Clipboard size={16} />
            复制脚本
          </button>
          <button className="secondary-button" type="button" onClick={copyUninstallScript}>
            <Clipboard size={16} />
            复制卸载
          </button>
          <button className="secondary-button" type="button" onClick={simulateRun}>
            <Terminal size={16} />
            模拟运行
          </button>
        </div>

        <div className="manual-list">
          <div className="section-title">
            <ExternalLink size={15} />
            手动来源
          </div>
          {installPlan.commands.filter((item) => item.manualUrl).length === 0 ? (
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

        <div className="log-panel">
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
        </div>
      </aside>
      )}
    </main>
  );
}

function InstallProgressCard({
  progress,
  readyCount
}: {
  progress: InstallProgress;
  readyCount: number;
}) {
  const total = progress.total || readyCount;
  const percent = total > 0 ? Math.min(100, Math.round((progress.completed / total) * 100)) : 0;
  const finished = progress.total > 0 && progress.completed >= progress.total && !progress.active;
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

  return (
    <div className={`install-progress-card ${progress.active ? "active" : ""}`}>
      <div className="progress-head">
        <span>{title}</span>
        <strong>{percent}%</strong>
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
  tone
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "amber" | "red";
}) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ToolCard({
  tool,
  toolState,
  selected,
  onToggle,
  onInstall,
  onUninstall,
  onLaunch,
  onOpen
}: {
  tool: Tool;
  toolState: ToolRuntimeState;
  selected: boolean;
  onToggle: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onLaunch: () => void;
  onOpen: () => void;
}) {
  const Icon = categoryIcons[tool.category];
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = getToolLogoUrl(tool);
  const installDisabled =
    toolState.status === "installing" || toolState.status === "uninstalling" || toolState.status === "checking";
  const uninstallDisabled = toolState.status !== "installed";
  const openDisabled =
    toolState.status === "installing" ||
    toolState.status === "uninstalling" ||
    toolState.status === "opening" ||
    toolState.status === "checking" ||
    toolState.status === "not-installed" ||
    toolState.launcherFound === false;

  return (
    <article className={`tool-card ${selected ? "selected" : ""} status-${toolState.status}`}>
      <button className="select-check" type="button" aria-label={`选择 ${tool.name}`} onClick={onToggle}>
        {selected && <Check size={15} />}
      </button>

      <div className="tool-card-header">
        <div className="tool-icon">
          {logoUrl && !logoFailed ? (
            <img className="tool-logo" src={logoUrl} alt="" onError={() => setLogoFailed(true)} />
          ) : (
            <Icon size={18} />
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
        <span className={`tool-status-pill ${toolState.status}`} title={toolState.message}>
          {getStatusLabel(toolState.status)}
        </span>
        <span className={`risk-pill ${tool.risk}`}>{riskLabels[tool.risk]}</span>
        {tool.requiresAdmin && <span className="admin-pill">管理员</span>}
        <button className="mini-action install" type="button" disabled={installDisabled} onClick={onInstall}>
          <Download size={14} />
          {getInstallButtonLabel(toolState.status)}
        </button>
        <button className="mini-action open" type="button" disabled={openDisabled} onClick={onLaunch}>
          <Play size={14} />
          {toolState.status === "opening" ? "打开中" : "打开"}
        </button>
        <button className="mini-action uninstall" type="button" disabled={uninstallDisabled} onClick={onUninstall}>
          <Trash2 size={14} />
          {toolState.status === "uninstalling" ? "卸载中" : "卸载"}
        </button>
        <button className="icon-button" type="button" aria-label={`打开 ${tool.name} 来源`} onClick={onOpen}>
          <ExternalLink size={15} />
        </button>
      </div>
    </article>
  );
}
