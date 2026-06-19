import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  Filter,
  Info,
  ListChecks,
  Search,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import {
  getActivityLogStats,
  type ActivityKind,
  type ActivityLogEntry,
  type ActivityStatus,
} from "./core/activityLog";
import {
  exportActivityLogAsJson,
  exportActivityLogAsText,
  formatActivityLogDateTime,
  formatActivityLogDuration,
  getActivityLogKindLabel,
  getActivityLogStatusLabel,
} from "./core/activityLogExport";
import {
  createActivityLogFilterOptions,
  filterActivityLogEntries,
  getActivityLogVisibleCountLabel,
  type ActivityLogFilters,
  type ActivityLogQuickFilter,
  type ActivityLogTimeRange,
} from "./core/activityLogFilters";

export type RuntimeLogEntry = {
  id: number;
  level: "info" | "success" | "warning" | "error";
  message: string;
};

export type LogsViewFocus = {
  nonce: number;
  tab?: "history" | "realtime";
  toolId?: string;
  kind?: ActivityKind | "all";
  status?: ActivityStatus | "all";
  quick?: ActivityLogQuickFilter;
};

export function LogsView({
  logs,
  activityLog,
  focus,
  onRefresh,
  onClearActivityLog,
  onExportActivityLog,
  onLog,
  onShowTool,
  onFixTool,
}: {
  logs: RuntimeLogEntry[];
  activityLog: ActivityLogEntry[];
  focus: LogsViewFocus;
  onRefresh: () => Promise<void>;
  onClearActivityLog: () => Promise<void>;
  onExportActivityLog: (
    content: string,
    format: "json" | "txt",
    visibleCount: number,
  ) => Promise<void>;
  onLog: (level: RuntimeLogEntry["level"], message: string) => void;
  onShowTool: (toolId: string) => void;
  onFixTool: (toolId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"history" | "realtime">("history");
  const [filters, setFilters] = useState<ActivityLogFilters>({
    status: "all",
    kind: "all",
    timeRange: "all",
    quick: "all",
    query: "",
  });
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const stats = useMemo(() => getActivityLogStats(activityLog), [activityLog]);
  const filterOptions = useMemo(
    () => createActivityLogFilterOptions(activityLog),
    [activityLog],
  );
  const visibleEntries = useMemo(
    () => filterActivityLogEntries(activityLog, filters),
    [activityLog, filters],
  );
  const selectedEntry =
    visibleEntries.find((entry) => entry.id === selectedEntryId) ??
    visibleEntries[0];

  useEffect(() => {
    if (!focus.nonce) {
      return;
    }

    setActiveTab(focus.tab ?? "history");
    setFilters((current) => ({
      ...current,
      status: focus.status ?? "all",
      kind: focus.kind ?? "all",
      quick: focus.quick ?? "all",
      toolId: focus.toolId,
      query: "",
    }));
    setSelectedEntryId("");
  }, [focus]);

  useEffect(() => {
    if (visibleEntries.length === 0) {
      setSelectedEntryId("");
      return;
    }

    if (!visibleEntries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(visibleEntries[0].id);
    }
  }, [selectedEntryId, visibleEntries]);

  async function clearHistory() {
    if (!window.confirm("将清空所有操作历史，实时输出不受影响。是否继续？")) {
      return;
    }

    await onClearActivityLog();
  }

  async function exportVisible(format: "json" | "txt") {
    const content =
      format === "json"
        ? exportActivityLogAsJson(visibleEntries)
        : exportActivityLogAsText(visibleEntries);

    await onExportActivityLog(content, format, visibleEntries.length);
  }

  async function copyEntry(entry: ActivityLogEntry) {
    const text = exportActivityLogAsText([entry]);
    await navigator.clipboard.writeText(text);
    onLog("success", "日志详情已复制。");
  }

  async function copyError(entry: ActivityLogEntry) {
    const text = [
      entry.title,
      entry.detail,
      ...(entry.rawOutput ?? []),
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(text || entry.title);
    onLog("success", "错误信息已复制。");
  }

  function setQuick(quick: ActivityLogQuickFilter) {
    setFilters((current) => ({ ...current, quick }));
  }

  function resetFilters() {
    setFilters({
      status: "all",
      kind: "all",
      timeRange: "all",
      quick: "all",
      query: "",
    });
    setSelectedEntryId("");
  }

  return (
    <div className="logs-page">
      <header className="command-bar page-topbar">
        <div className="command-bar-title">
          <div className="command-bar-icon logs-icon">
            <Terminal size={22} />
          </div>
          <div>
            <p className="eyebrow">日志中心</p>
            <h2>查看操作历史、实时输出和失败详情</h2>
          </div>
        </div>
        <div className="top-actions">
          <button className="ghost-button" type="button" onClick={() => void onRefresh()}>
            <ListChecks size={16} />
            刷新
          </button>
          <button
            className={`ghost-button ${filters.quick === "failed" ? "active" : ""}`}
            type="button"
            onClick={() => setQuick(filters.quick === "failed" ? "all" : "failed")}
          >
            <Info size={16} />
            只看失败
          </button>
          <button
            className="ghost-button"
            type="button"
            disabled={visibleEntries.length === 0}
            onClick={() => void exportVisible("json")}
          >
            <Download size={16} />
            JSON
          </button>
          <button
            className="ghost-button"
            type="button"
            disabled={visibleEntries.length === 0}
            onClick={() => void exportVisible("txt")}
          >
            <Download size={16} />
            TXT
          </button>
          <button
            className="ghost-button danger"
            type="button"
            disabled={activityLog.length === 0}
            onClick={() => void clearHistory()}
          >
            <Trash2 size={16} />
            清空日志
          </button>
        </div>
      </header>

      <div className="logs-stats-grid">
        <LogStat label="总记录" value={stats.total} />
        <LogStat label="失败" value={stats.failed} tone="error" />
        <LogStat label="警告" value={stats.warnings} tone="warning" />
        <LogStat
          label="今日操作"
          value={
            filterActivityLogEntries(activityLog, { timeRange: "today" }).length
          }
        />
        <div className="logs-stat wide">
          <span>最近失败</span>
          <strong>
            {stats.lastFailure?.toolName ?? stats.lastFailure?.title ?? "无"}
          </strong>
        </div>
      </div>

      <div className="logs-tab-row">
        <button
          className={activeTab === "history" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("history")}
        >
          操作历史
        </button>
        <button
          className={activeTab === "realtime" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("realtime")}
        >
          实时输出
        </button>
      </div>

      {activeTab === "history" ? (
        <div className="logs-layout">
          <aside className="logs-filter-panel">
            <div className="section-title">
              <Filter size={15} />
              筛选
            </div>
            <label className="field-label">
              搜索
              <div className="logs-search-box">
                <Search size={14} />
                <input
                  value={filters.query ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  placeholder="标题、详情、工具、来源"
                />
              </div>
            </label>
            <label className="field-label">
              状态
              <select
                value={filters.status ?? "all"}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as ActivityStatus | "all",
                  }))
                }
              >
                <option value="all">全部状态</option>
                <option value="success">成功 ({filterOptions.statusCounts.success})</option>
                <option value="warning">警告 ({filterOptions.statusCounts.warning})</option>
                <option value="error">失败 ({filterOptions.statusCounts.error})</option>
                <option value="info">信息 ({filterOptions.statusCounts.info})</option>
              </select>
            </label>
            <label className="field-label">
              类型
              <select
                value={filters.kind ?? "all"}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    kind: event.target.value as ActivityKind | "all",
                  }))
                }
              >
                <option value="all">全部类型</option>
                {activityKindOptions.map((kind) => (
                  <option key={kind} value={kind}>
                    {getActivityLogKindLabel(kind)} ({filterOptions.kindCounts[kind]})
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              时间
              <select
                value={filters.timeRange ?? "all"}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    timeRange: event.target.value as ActivityLogTimeRange,
                  }))
                }
              >
                <option value="all">全部</option>
                <option value="today">今天</option>
                <option value="7d">最近 7 天</option>
                <option value="30d">最近 30 天</option>
              </select>
            </label>
            <div className="logs-quick-grid">
              {quickFilters.map((item) => (
                <button
                  key={item.id}
                  className={filters.quick === item.id ? "active" : ""}
                  type="button"
                  onClick={() => setQuick(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {filters.toolId && (
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setFilters((current) => ({ ...current, toolId: undefined }))
                }
              >
                <X size={14} />
                取消工具限定
              </button>
            )}
            <button className="text-button" type="button" onClick={resetFilters}>
              清除筛选
            </button>
          </aside>

          <section className="logs-list-panel">
            <div className="logs-list-head">
              <strong>
                {getActivityLogVisibleCountLabel(
                  visibleEntries.length,
                  activityLog.length,
                )}
              </strong>
              {filters.toolId && <span>工具：{filters.toolId}</span>}
            </div>
            {visibleEntries.length === 0 ? (
              <div className="activity-empty logs-empty">没有匹配的日志。</div>
            ) : (
              <div className="logs-entry-list">
                {visibleEntries.map((entry) => (
                  <button
                    className={`logs-entry-row ${entry.status} ${
                      selectedEntry?.id === entry.id ? "active" : ""
                    }`}
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedEntryId(entry.id)}
                  >
                    <span className={`logs-entry-status ${entry.status}`} />
                    <div>
                      <strong>{entry.title}</strong>
                      <span>
                        {formatActivityLogDateTime(entry.createdAt)}
                        {" · "}
                        {getActivityLogKindLabel(entry.kind)}
                        {entry.toolName ? ` · ${entry.toolName}` : ""}
                      </span>
                      {entry.detail && <p>{entry.detail}</p>}
                    </div>
                    <em>{getActivityLogStatusLabel(entry.status)}</em>
                  </button>
                ))}
              </div>
            )}
          </section>

          <ActivityLogDetail
            entry={selectedEntry}
            onCopy={copyEntry}
            onCopyError={copyError}
            onFilterTool={(toolId) =>
              setFilters((current) => ({ ...current, toolId }))
            }
            onShowTool={onShowTool}
            onFixTool={onFixTool}
          />
        </div>
      ) : (
        <section className="settings-card realtime-log-panel">
          <div className="section-title">
            <Terminal size={15} />
            实时输出
          </div>
          <div className="log-list">
            {logs.map((log) => (
              <div className={`log-entry ${log.level}`} key={log.id}>
                {log.message}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LogStat({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: number;
  tone?: "normal" | "warning" | "error";
}) {
  return (
    <div className={`logs-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActivityLogDetail({
  entry,
  onCopy,
  onCopyError,
  onFilterTool,
  onShowTool,
  onFixTool,
}: {
  entry?: ActivityLogEntry;
  onCopy: (entry: ActivityLogEntry) => Promise<void>;
  onCopyError: (entry: ActivityLogEntry) => Promise<void>;
  onFilterTool: (toolId: string) => void;
  onShowTool: (toolId: string) => void;
  onFixTool: (toolId: string) => void;
}) {
  if (!entry) {
    return (
      <aside className="logs-detail-panel">
        <div className="activity-empty">选择一条日志查看详情。</div>
      </aside>
    );
  }

  return (
    <aside className={`logs-detail-panel ${entry.status}`}>
      <div className="logs-detail-head">
        <span className={`status-pill ${mapStatusToPill(entry.status)}`}>
          {getActivityLogStatusLabel(entry.status)}
        </span>
        <strong>{entry.title}</strong>
      </div>
      <dl className="logs-detail-grid">
        <dt>时间</dt>
        <dd>{formatActivityLogDateTime(entry.createdAt)}</dd>
        <dt>类型</dt>
        <dd>{getActivityLogKindLabel(entry.kind)}</dd>
        <dt>状态</dt>
        <dd>{getActivityLogStatusLabel(entry.status)}</dd>
        {entry.toolName && (
          <>
            <dt>工具</dt>
            <dd>{entry.toolName}</dd>
          </>
        )}
        {entry.toolId && (
          <>
            <dt>工具 ID</dt>
            <dd>{entry.toolId}</dd>
          </>
        )}
        {entry.source && (
          <>
            <dt>来源</dt>
            <dd>{entry.source}</dd>
          </>
        )}
        {entry.exitCode !== undefined && (
          <>
            <dt>退出码</dt>
            <dd>{entry.exitCode ?? "未知"}</dd>
          </>
        )}
        {entry.durationMs !== undefined && (
          <>
            <dt>耗时</dt>
            <dd>{formatActivityLogDuration(entry.durationMs)}</dd>
          </>
        )}
        {entry.commandSummary && (
          <>
            <dt>命令</dt>
            <dd>{entry.commandSummary}</dd>
          </>
        )}
        {entry.metadata?.version && (
          <>
            <dt>版本</dt>
            <dd>{entry.metadata.version}</dd>
          </>
        )}
        {entry.metadata?.target && (
          <>
            <dt>目标</dt>
            <dd>{entry.metadata.target}</dd>
          </>
        )}
      </dl>
      <div className="logs-detail-block">
        <strong>详情</strong>
        <p>{entry.detail || "没有详情文本。"}</p>
      </div>
      <div className="logs-detail-block">
        <strong>相关实时输出</strong>
        {entry.rawOutput?.length ? (
          <pre>{entry.rawOutput.join("\n")}</pre>
        ) : (
          <p>暂无关联实时输出。</p>
        )}
      </div>
      <div className="logs-detail-actions">
        <button className="secondary-button" type="button" onClick={() => void onCopy(entry)}>
          <Clipboard size={14} />
          复制详情
        </button>
        <button className="secondary-button" type="button" onClick={() => void onCopyError(entry)}>
          <Clipboard size={14} />
          复制错误
        </button>
        {entry.toolId && (
          <>
            <button className="secondary-button" type="button" onClick={() => onFilterTool(entry.toolId!)}>
              <Filter size={14} />
              只看该工具
            </button>
            <button className="secondary-button" type="button" onClick={() => onShowTool(entry.toolId!)}>
              <Search size={14} />
              跳到工具
            </button>
          </>
        )}
        {entry.status === "error" && entry.toolId && (
          <button className="primary-button" type="button" onClick={() => onFixTool(entry.toolId!)}>
            <Check size={14} />
            AI 修复
          </button>
        )}
      </div>
    </aside>
  );
}

const activityKindOptions: ActivityKind[] = [
  "install",
  "uninstall",
  "update",
  "update-check",
  "launch",
  "ai",
  "config",
  "system",
  "category",
  "theme",
];

const quickFilters: { id: ActivityLogQuickFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "failed", label: "失败" },
  { id: "warnings", label: "警告" },
  { id: "install-uninstall", label: "安装/卸载" },
  { id: "ai", label: "AI" },
  { id: "system", label: "系统" },
];

function mapStatusToPill(status: ActivityStatus) {
  if (status === "error") {
    return "danger";
  }

  return status === "success" ? "ok" : "warning";
}
