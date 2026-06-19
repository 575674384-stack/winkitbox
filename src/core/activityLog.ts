export type ActivityKind =
  | "install"
  | "uninstall"
  | "update"
  | "update-check"
  | "launch"
  | "ai"
  | "config"
  | "system"
  | "category"
  | "theme";

export type ActivityStatus = "success" | "warning" | "error" | "info";

export type ActivityLogEntry = {
  id: string;
  createdAt: string;
  kind: ActivityKind;
  status: ActivityStatus;
  title: string;
  detail?: string;
  toolId?: string;
  toolName?: string;
  exitCode?: number | null;
  source?: string;
};

export type ActivityLogInput = Omit<ActivityLogEntry, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

export type ActivityLogStats = {
  total: number;
  failed: number;
  warnings: number;
  lastFailure?: ActivityLogEntry;
};

export const maxActivityLogEntries = 200;

const activityKinds = new Set<ActivityKind>([
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
]);

const activityStatuses = new Set<ActivityStatus>([
  "success",
  "warning",
  "error",
  "info",
]);

export function createActivityLogEntry(
  input: ActivityLogInput,
  now = new Date(),
): ActivityLogEntry {
  return {
    id: input.id || `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt:
      input.createdAt && isIsoDate(input.createdAt)
        ? input.createdAt
        : now.toISOString(),
    kind: activityKinds.has(input.kind) ? input.kind : "system",
    status: activityStatuses.has(input.status) ? input.status : "info",
    title: compactText(input.title, 90) || "未命名操作",
    detail: compactOptionalText(input.detail, 280),
    toolId: compactOptionalText(input.toolId, 80),
    toolName: compactOptionalText(input.toolName, 80),
    exitCode:
      typeof input.exitCode === "number" || input.exitCode === null
        ? input.exitCode
        : undefined,
    source: compactOptionalText(input.source, 80),
  };
}

export function normalizeActivityLog(value: unknown): ActivityLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      item && typeof item === "object"
        ? createActivityLogEntry(item as ActivityLogInput)
        : undefined,
    )
    .filter((item): item is ActivityLogEntry => Boolean(item))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, maxActivityLogEntries);
}

export function addActivityLogEntry(
  current: readonly ActivityLogEntry[],
  input: ActivityLogInput,
  now = new Date(),
): ActivityLogEntry[] {
  return normalizeActivityLog([
    createActivityLogEntry(input, now),
    ...current,
  ]).slice(0, maxActivityLogEntries);
}

export function getActivityLogStats(entries: readonly ActivityLogEntry[]): ActivityLogStats {
  const normalized = normalizeActivityLog(entries);

  return {
    total: normalized.length,
    failed: normalized.filter((entry) => entry.status === "error").length,
    warnings: normalized.filter((entry) => entry.status === "warning").length,
    lastFailure: normalized.find((entry) => entry.status === "error"),
  };
}

export function getLatestToolFailure(
  entries: readonly ActivityLogEntry[],
  toolId: string,
): ActivityLogEntry | undefined {
  return normalizeActivityLog(entries).find(
    (entry) => entry.toolId === toolId && entry.status === "error",
  );
}

function compactOptionalText(value: unknown, maxLength: number) {
  const text = compactText(value, maxLength);
  return text || undefined;
}

function compactText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isIsoDate(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
