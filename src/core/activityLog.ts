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
  rawOutput?: string[];
  durationMs?: number;
  commandSummary?: string;
  metadata?: ActivityLogMetadata;
  toolId?: string;
  toolName?: string;
  exitCode?: number | null;
  source?: string;
};

export type ActivityLogMetadata = Partial<
  Record<"categoryId" | "version" | "target", string>
>;

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

export const maxActivityLogEntries = 1000;
export const maxActivityDetailLength = 2000;
export const maxActivityRawOutputLines = 200;
export const maxActivityRawOutputLineLength = 1000;

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
    detail: compactOptionalText(redactSensitiveText(input.detail), maxActivityDetailLength),
    rawOutput: compactRawOutput(input.rawOutput),
    durationMs: normalizeDurationMs(input.durationMs),
    commandSummary: compactOptionalText(redactSensitiveText(input.commandSummary), 420),
    metadata: normalizeMetadata(input.metadata),
    toolId: compactOptionalText(input.toolId, 80),
    toolName: compactOptionalText(input.toolName, 80),
    exitCode:
      typeof input.exitCode === "number" || input.exitCode === null
        ? input.exitCode
        : undefined,
    source: compactOptionalText(input.source, 80),
  };
}

export function redactSensitiveText(value: unknown): string {
  const text = String(value ?? "");

  return text
    .replace(/\bghp_[A-Za-z0-9_]{10,}\b/g, "[已脱敏]")
    .replace(/\bgithub_pat_[A-Za-z0-9_]{10,}\b/g, "[已脱敏]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[已脱敏]")
    .replace(/(Authorization\s*:\s*Bearer\s+)[^\s;,)]+/gi, "$1[已脱敏]")
    .replace(/((?:api[_-]?key|token|password|secret)\s*[:=]\s*)[^\s;,)]+/gi, "$1[已脱敏]");
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

function compactRawOutput(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const output = value
    .map((line) => compactText(redactSensitiveText(line), maxActivityRawOutputLineLength))
    .filter(Boolean)
    .slice(-maxActivityRawOutputLines);

  return output.length > 0 ? output : undefined;
}

function normalizeDurationMs(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.round(value);
}

function normalizeMetadata(value: unknown): ActivityLogMetadata | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const metadata: ActivityLogMetadata = {};

  for (const key of ["categoryId", "version", "target"] as const) {
    const normalized = compactOptionalText(redactSensitiveText(source[key]), 180);
    if (normalized) {
      metadata[key] = normalized;
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}
