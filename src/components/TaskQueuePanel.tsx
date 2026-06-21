import { ChevronDown, ChevronUp, Terminal, Trash2, X, RotateCcw } from "lucide-react";
import { useState } from "react";
import { getTaskStatusLabel, type TaskQueueItem, type TaskQueueStats } from "../core/taskQueue";

export function TaskQueuePanel({
  tasks,
  stats,
  onRetry,
  onOpenLogs,
  onClearFinished,
  onClose,
}: {
  tasks: TaskQueueItem[];
  stats: TaskQueueStats;
  onRetry: (task: TaskQueueItem) => Promise<void>;
  onOpenLogs: () => void;
  onClearFinished: () => void;
  onClose: () => void;
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
        <div className="task-queue-head-actions">
          <button
            className="icon-button"
            type="button"
            aria-label={expanded ? "收起任务中心" : "展开任务中心"}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="关闭任务中心"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </div>
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
            <span
              className={`logs-entry-status ${
                task.status === "error"
                  ? "error"
                  : task.status === "warning"
                    ? "warning"
                    : task.status === "success"
                      ? "success"
                      : "info"
              }`}
            />
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
                <button className="mini-action" type="button" onClick={onOpenLogs}>
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

function formatTaskDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
