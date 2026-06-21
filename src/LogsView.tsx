import { useEffect, useMemo, useState } from "react";
import {
  Bot,
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
import {
  exportAiLogAsText,
  filterAiLogEntries,
  getAiLogKindLabel,
  getAiLogStatusLabel,
  type AiLogEntry,
  type AiLogFilters,
  type AiLogKind,
  type AiLogStatus,
} from "./core/aiLog";
import type { ConfirmDialogOptions } from "./components/ConfirmDialog";
import { PageHeaderIcon } from "./components/PageHeaderIcon";

export type RuntimeLogEntry = {
  id: number;
  level: "info" | "success" | "warning" | "error";
  message: string;
};

export type LogsViewFocus = {
  nonce: number;
  tab?: "history" | "realtime" | "ai";
  toolId?: string;
  kind?: ActivityKind | "all";
  status?: ActivityStatus | "all";
  quick?: ActivityLogQuickFilter;
};

export function LogsView({
  logs,
  activityLog,
  aiLog,
  focus,
  onRefresh,
  onClearActivityLog,
  onClearAiLog,
  onExportActivityLog,
  onExportAiLog,
  onLog,
  onShowTool,
  onFixTool,
  onConfirm,
}: {
  logs: RuntimeLogEntry[];
  activityLog: ActivityLogEntry[];
  aiLog: AiLogEntry[];
  focus: LogsViewFocus;
  onRefresh: () => Promise<void>;
  onClearActivityLog: () => Promise<void>;
  onClearAiLog: () => Promise<void>;
  onExportActivityLog: (
    content: string,
    format: "json" | "txt",
    visibleCount: number,
  ) => Promise<void>;
  onExportAiLog: (
    content: string,
    format: "json" | "txt",
    visibleCount: number,
  ) => Promise<void>;
  onLog: (level: RuntimeLogEntry["level"], message: string) => void;
  onShowTool: (toolId: string) => void;
  onFixTool: (toolId: string) => void;
  onConfirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState<"history" | "realtime" | "ai">("history");
  const [filters, setFilters] = useState<ActivityLogFilters>({
    status: "all",
    kind: "all",
    timeRange: "all",
    quick: "all",
    query: "",
  });
  const [aiFilters, setAiFilters] = useState<AiLogFilters>({
    kind: "all",
    status: "all",
    query: "",
  });
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [selectedAiEntryId, setSelectedAiEntryId] = useState("");
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
  const visibleAiEntries = useMemo(
    () => filterAiLogEntries(aiLog, aiFilters),
    [aiLog, aiFilters],
  );
  const selectedAiEntry =
    visibleAiEntries.find((entry) => entry.id === selectedAiEntryId) ??
    visibleAiEntries[0];

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
    setAiFilters((current) => ({
      ...current,
      toolId: focus.toolId,
      status:
        focus.status === "success" ||
        focus.status === "warning" ||
        focus.status === "error" ||
        focus.status === "info"
          ? focus.status
          : "all",
      query: "",
    }));
    setSelectedEntryId("");
    setSelectedAiEntryId("");
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

  useEffect(() => {
    if (visibleAiEntries.length === 0) {
      setSelectedAiEntryId("");
      return;
    }

    if (!visibleAiEntries.some((entry) => entry.id === selectedAiEntryId)) {
      setSelectedAiEntryId(visibleAiEntries[0].id);
    }
  }, [selectedAiEntryId, visibleAiEntries]);

  async function clearHistory() {
    const isAiTab = activeTab === "ai";
    if (
      !(await onConfirm({
        title: isAiTab ? "清空 AI 日志" : "清空操作历史",
        message: isAiTab
          ? "将清空所有 AI 日志，操作历史和实时输出不受影响。是否继续？"
          : "将清空所有操作历史，实时输出不受影响。是否继续？",
        confirmLabel: "清空",
        tone: "danger",
      }))
    ) {
      return;
    }

    if (isAiTab) {
      await onClearAiLog();
    } else {
      await onClearActivityLog();
    }
  }

  async function exportVisible(format: "json" | "txt") {
    if (activeTab === "ai") {
      const content =
        format === "json"
          ? JSON.stringify(visibleAiEntries, null, 2)
          : exportAiLogAsText(visibleAiEntries);

      await onExportAiLog(content, format, visibleAiEntries.length);
      return;
    }

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

  async function copyAiEntry(entry: AiLogEntry) {
    await navigator.clipboard.writeText(exportAiLogAsText([entry]));
    onLog("success", "AI 日志详情已复制。");
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

  function resetAiFilters() {
    setAiFilters({
      kind: "all",
      status: "all",
      query: "",
    });
    setSelectedAiEntryId("");
  }

  const visibleExportCount =
    activeTab === "ai" ? visibleAiEntries.length : visibleEntries.length;
  const clearDisabled =
    activeTab === "ai" ? aiLog.length === 0 : activityLog.length === 0;

  return (
    <div className="logs-page">
      <header className="command-bar page-topbar">
        <div className="command-bar-title">
          <PageHeaderIcon page="logs" className="logs-icon" alt="日志中心">
            <Terminal size={22} />
          </PageHeaderIcon>
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
            disabled={visibleExportCount === 0}
            onClick={() => void exportVisible("json")}
          >
            <Download size={16} />
            JSON
          </button>
          <button
            className="ghost-button"
            type="button"
            disabled={visibleExportCount === 0}
            onClick={() => void exportVisible("txt")}
          >
            <Download size={16} />
            TXT
          </button>
          <button
            className="ghost-button danger"
            type="button"
            disabled={clearDisabled}
            onClick={() => void clearHistory()}
          >
            <Trash2 size={16} />
            {activeTab === "ai" ? "清空 AI" : "清空日志"}
          </button>
        </div>
      </header>

      <div className="logs-stats-grid">
        <LogStat label="总记录" value={stats.total} />
        <LogStat label="AI 日志" value={aiLog.length} />
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
        <button
          className={activeTab === "ai" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("ai")}
        >
          AI 日志
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
      ) : activeTab === "ai" ? (
        <div className="logs-layout ai-logs-layout">
          <aside className="logs-filter-panel">
            <div className="section-title">
              <Bot size={15} />
              AI 筛选
            </div>
            <label className="field-label">
              搜索
              <div className="logs-search-box">
                <Search size={14} />
                <input
                  value={aiFilters.query ?? ""}
                  onChange={(event) =>
                    setAiFilters((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  placeholder="回复、项目、工具、链接"
                />
              </div>
            </label>
            <label className="field-label">
              类型
              <select
                value={aiFilters.kind ?? "all"}
                onChange={(event) =>
                  setAiFilters((current) => ({
                    ...current,
                    kind: event.target.value as AiLogKind | "all",
                  }))
                }
              >
                <option value="all">全部类型</option>
                {aiKindOptions.map((kind) => (
                  <option key={kind} value={kind}>
                    {getAiLogKindLabel(kind)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              状态
              <select
                value={aiFilters.status ?? "all"}
                onChange={(event) =>
                  setAiFilters((current) => ({
                    ...current,
                    status: event.target.value as AiLogStatus | "all",
                  }))
                }
              >
                <option value="all">全部状态</option>
                <option value="success">成功</option>
                <option value="warning">警告</option>
                <option value="error">失败</option>
                <option value="info">信息</option>
              </select>
            </label>
            {aiFilters.toolId && (
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setAiFilters((current) => ({ ...current, toolId: undefined }))
                }
              >
                <X size={14} />
                取消工具限定
              </button>
            )}
            <button className="text-button" type="button" onClick={resetAiFilters}>
              清除筛选
            </button>
          </aside>

          <section className="logs-list-panel">
            <div className="logs-list-head">
              <strong>
                {visibleAiEntries.length} / {aiLog.length} 条 AI 日志
              </strong>
              {aiFilters.toolId && <span>工具：{aiFilters.toolId}</span>}
            </div>
            {visibleAiEntries.length === 0 ? (
              <div className="activity-empty logs-empty">
                还没有匹配的 AI 日志。AI 推荐、链接分析、本地分析和修复结果会显示在这里。
              </div>
            ) : (
              <div className="logs-entry-list">
                {visibleAiEntries.map((entry) => (
                  <button
                    className={`logs-entry-row ${entry.status} ${
                      selectedAiEntry?.id === entry.id ? "active" : ""
                    }`}
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedAiEntryId(entry.id)}
                  >
                    <span className={`logs-entry-status ${entry.status}`} />
                    <div>
                      <strong>{entry.title}</strong>
                      <span>
                        {formatActivityLogDateTime(entry.createdAt)}
                        {" · "}
                        {getAiLogKindLabel(entry.kind)}
                        {entry.toolName ? ` · ${entry.toolName}` : ""}
                      </span>
                      {entry.response && <p>{entry.response}</p>}
                    </div>
                    <em>{getAiLogStatusLabel(entry.status)}</em>
                  </button>
                ))}
              </div>
            )}
          </section>

          <AiLogDetail
            entry={selectedAiEntry}
            onCopy={copyAiEntry}
            onFilterTool={(toolId) =>
              setAiFilters((current) => ({ ...current, toolId }))
            }
            onShowTool={onShowTool}
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

function AiLogDetail({
  entry,
  onCopy,
  onFilterTool,
  onShowTool,
}: {
  entry?: AiLogEntry;
  onCopy: (entry: AiLogEntry) => Promise<void>;
  onFilterTool: (toolId: string) => void;
  onShowTool: (toolId: string) => void;
}) {
  if (!entry) {
    return (
      <aside className="logs-detail-panel">
        <div className="activity-empty">选择一条 AI 日志查看详情。</div>
      </aside>
    );
  }

  return (
    <aside className={`logs-detail-panel ${entry.status}`}>
      <div className="logs-detail-head">
        <span className={`status-pill ${mapStatusToPill(entry.status)}`}>
          {getAiLogStatusLabel(entry.status)}
        </span>
        <strong>{entry.title}</strong>
      </div>
      <dl className="logs-detail-grid">
        <dt>时间</dt>
        <dd>{formatActivityLogDateTime(entry.createdAt)}</dd>
        <dt>类型</dt>
        <dd>{getAiLogKindLabel(entry.kind)}</dd>
        <dt>状态</dt>
        <dd>{getAiLogStatusLabel(entry.status)}</dd>
        {entry.model && (
          <>
            <dt>模型</dt>
            <dd>{entry.model}</dd>
          </>
        )}
        {entry.source && (
          <>
            <dt>来源</dt>
            <dd>{entry.source}</dd>
          </>
        )}
        {entry.toolName && (
          <>
            <dt>工具</dt>
            <dd>{entry.toolName}</dd>
          </>
        )}
        {entry.repoUrl && (
          <>
            <dt>链接</dt>
            <dd>{entry.repoUrl}</dd>
          </>
        )}
      </dl>
      <div className="logs-detail-block">
        <strong>用户输入</strong>
        <p>{entry.prompt || "没有记录用户输入。"}</p>
      </div>
      <div className="logs-detail-block">
        <strong>AI 回复</strong>
        {entry.response ? <pre>{entry.response}</pre> : <p>没有记录回复正文。</p>}
      </div>
      <div className="logs-detail-block">
        <strong>结构化结果</strong>
        {entry.structured !== undefined ? (
          <pre>{JSON.stringify(entry.structured, null, 2)}</pre>
        ) : (
          <p>没有结构化结果。</p>
        )}
      </div>
      <div className="logs-detail-actions">
        <button className="secondary-button" type="button" onClick={() => void onCopy(entry)}>
          <Clipboard size={14} />
          复制详情
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
      </div>
    </aside>
  );
}

const aiKindOptions: AiLogKind[] = [
  "recommendation",
  "tool-analysis",
  "local-analysis",
  "repair",
  "model",
  "other",
];

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
