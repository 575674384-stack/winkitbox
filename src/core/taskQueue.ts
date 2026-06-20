export type TaskQueueKind =
  | "install"
  | "uninstall"
  | "update"
  | "update-check"
  | "environment"
  | "ai"
  | "system";

export type TaskQueueStatus =
  | "queued"
  | "running"
  | "success"
  | "error"
  | "warning"
  | "skipped";

export type TaskQueueItem = {
  id: string;
  kind: TaskQueueKind;
  title: string;
  status: TaskQueueStatus;
  progressLabel: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  message?: string;
  toolId?: string;
  toolName?: string;
  exitCode?: number | null;
  retryable?: boolean;
  retryKey?: string;
};

export type TaskQueueInput = Omit<
  TaskQueueItem,
  "createdAt" | "progressLabel" | "status"
> & {
  status?: TaskQueueStatus;
  progressLabel?: string;
  createdAt?: string;
};

export type TaskQueueStats = {
  total: number;
  queued: number;
  running: number;
  success: number;
  warning: number;
  error: number;
  skipped: number;
  retryableFailures: number;
};

export const maxTaskQueueItems = 120;

export function addTaskQueueItem(
  current: readonly TaskQueueItem[],
  input: TaskQueueInput,
  now = new Date(),
): TaskQueueItem[] {
  const item = normalizeTaskQueueItem(
    {
      ...input,
      status: input.status ?? "queued",
      progressLabel: input.progressLabel ?? getDefaultProgressLabel(input.status ?? "queued"),
      createdAt: input.createdAt ?? now.toISOString(),
    },
    now,
  );

  return [item, ...current.filter((existing) => existing.id !== item.id)].slice(
    0,
    maxTaskQueueItems,
  );
}

export function startTaskQueueItem(
  current: readonly TaskQueueItem[],
  taskId: string,
  now = new Date(),
): TaskQueueItem[] {
  return updateTaskQueueItem(current, taskId, {
    status: "running",
    startedAt: now.toISOString(),
    progressLabel: "执行中",
  });
}

export function completeTaskQueueItem(
  current: readonly TaskQueueItem[],
  taskId: string,
  patch: {
    status?: Extract<TaskQueueStatus, "success" | "warning" | "skipped">;
    message?: string;
    exitCode?: number | null;
  } = {},
  now = new Date(),
): TaskQueueItem[] {
  const finishedAt = now.toISOString();

  return updateTaskQueueItem(current, taskId, (item) => ({
    status: patch.status ?? "success",
    progressLabel: getDefaultProgressLabel(patch.status ?? "success"),
    message: patch.message,
    exitCode: patch.exitCode,
    finishedAt,
    durationMs: calculateDurationMs(item.startedAt, finishedAt),
  }));
}

export function failTaskQueueItem(
  current: readonly TaskQueueItem[],
  taskId: string,
  message: string,
  now = new Date(),
): TaskQueueItem[] {
  const finishedAt = now.toISOString();

  return updateTaskQueueItem(current, taskId, (item) => ({
    status: "error",
    progressLabel: "失败",
    message,
    finishedAt,
    durationMs: calculateDurationMs(item.startedAt, finishedAt),
  }));
}

export function updateTaskQueueItem(
  current: readonly TaskQueueItem[],
  taskId: string,
  patch:
    | Partial<TaskQueueItem>
    | ((item: TaskQueueItem) => Partial<TaskQueueItem>),
): TaskQueueItem[] {
  return current.map((item) => {
    if (item.id !== taskId) {
      return item;
    }

    const nextPatch = typeof patch === "function" ? patch(item) : patch;
    return normalizeTaskQueueItem({ ...item, ...nextPatch });
  });
}

export function getTaskQueueStats(
  items: readonly TaskQueueItem[],
): TaskQueueStats {
  const counts = {
    total: items.length,
    queued: 0,
    running: 0,
    success: 0,
    warning: 0,
    error: 0,
    skipped: 0,
    retryableFailures: 0,
  };

  for (const item of items) {
    counts[item.status] += 1;
    if (item.status === "error" && item.retryable) {
      counts.retryableFailures += 1;
    }
  }

  return counts;
}

export function getTaskStatusLabel(status: TaskQueueStatus) {
  const labels: Record<TaskQueueStatus, string> = {
    queued: "等待中",
    running: "执行中",
    success: "已完成",
    warning: "有警告",
    error: "失败",
    skipped: "已跳过",
  };

  return labels[status];
}

function normalizeTaskQueueItem(
  value: TaskQueueInput & {
    status: TaskQueueStatus;
    progressLabel: string;
    createdAt: string;
  },
  now = new Date(),
): TaskQueueItem {
  const createdAt = isIsoDate(value.createdAt) ? value.createdAt : now.toISOString();

  return {
    id: compact(value.id, 120) || `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: normalizeKind(value.kind),
    title: compact(value.title, 120) || "未命名任务",
    status: normalizeStatus(value.status),
    progressLabel:
      compact(value.progressLabel, 40) ||
      getDefaultProgressLabel(normalizeStatus(value.status)),
    createdAt,
    startedAt: isIsoDate(value.startedAt) ? value.startedAt : undefined,
    finishedAt: isIsoDate(value.finishedAt) ? value.finishedAt : undefined,
    durationMs:
      typeof value.durationMs === "number" && Number.isFinite(value.durationMs)
        ? Math.max(0, Math.round(value.durationMs))
        : undefined,
    message: compact(value.message, 260),
    toolId: compact(value.toolId, 100),
    toolName: compact(value.toolName, 120),
    exitCode:
      typeof value.exitCode === "number" || value.exitCode === null
        ? value.exitCode
        : undefined,
    retryable: Boolean(value.retryable) || undefined,
    retryKey: compact(value.retryKey, 120),
  };
}

function getDefaultProgressLabel(status: TaskQueueStatus) {
  return getTaskStatusLabel(status);
}

function normalizeKind(value: unknown): TaskQueueKind {
  const known = new Set<TaskQueueKind>([
    "install",
    "uninstall",
    "update",
    "update-check",
    "environment",
    "ai",
    "system",
  ]);
  return known.has(value as TaskQueueKind) ? (value as TaskQueueKind) : "system";
}

function normalizeStatus(value: unknown): TaskQueueStatus {
  const known = new Set<TaskQueueStatus>([
    "queued",
    "running",
    "success",
    "error",
    "warning",
    "skipped",
  ]);
  return known.has(value as TaskQueueStatus)
    ? (value as TaskQueueStatus)
    : "queued";
}

function compact(value: unknown, maxLength: number) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return text ? text.slice(0, maxLength) : undefined;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function calculateDurationMs(startedAt: string | undefined, finishedAt: string) {
  if (!startedAt) {
    return undefined;
  }

  const start = Date.parse(startedAt);
  const end = Date.parse(finishedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return undefined;
  }

  return end - start;
}
