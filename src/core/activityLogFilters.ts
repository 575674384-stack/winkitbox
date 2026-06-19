import {
  normalizeActivityLog,
  type ActivityKind,
  type ActivityLogEntry,
  type ActivityStatus,
} from "./activityLog";

export type ActivityLogTimeRange = "all" | "today" | "7d" | "30d";
export type ActivityLogQuickFilter =
  | "all"
  | "failed"
  | "warnings"
  | "install-uninstall"
  | "ai"
  | "system";

export type ActivityLogFilters = {
  status?: ActivityStatus | "all";
  kind?: ActivityKind | "all";
  timeRange?: ActivityLogTimeRange;
  query?: string;
  quick?: ActivityLogQuickFilter;
  toolId?: string;
};

export type ActivityLogFilterOptions = {
  statusCounts: Record<ActivityStatus, number>;
  kindCounts: Record<ActivityKind, number>;
};

const activityKinds: ActivityKind[] = [
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

const activityStatuses: ActivityStatus[] = [
  "success",
  "warning",
  "error",
  "info",
];

export function filterActivityLogEntries(
  entries: readonly ActivityLogEntry[],
  filters: ActivityLogFilters = {},
  now = new Date(),
): ActivityLogEntry[] {
  const normalized = normalizeActivityLog(entries);
  const queryTerms = normalizeQuery(filters.query);
  const since = getSinceDate(filters.timeRange ?? "all", now);

  return normalized.filter((entry) => {
    if (filters.toolId && entry.toolId !== filters.toolId) {
      return false;
    }

    if (!matchesQuickFilter(entry, filters.quick ?? "all")) {
      return false;
    }

    if (filters.status && filters.status !== "all" && entry.status !== filters.status) {
      return false;
    }

    if (filters.kind && filters.kind !== "all" && entry.kind !== filters.kind) {
      return false;
    }

    if (since && new Date(entry.createdAt).getTime() < since.getTime()) {
      return false;
    }

    if (queryTerms.length > 0) {
      const haystack = buildSearchText(entry);
      return queryTerms.every((term) => haystack.includes(term));
    }

    return true;
  });
}

export function createActivityLogFilterOptions(
  entries: readonly ActivityLogEntry[],
): ActivityLogFilterOptions {
  const normalized = normalizeActivityLog(entries);
  const statusCounts = Object.fromEntries(
    activityStatuses.map((status) => [status, 0]),
  ) as Record<ActivityStatus, number>;
  const kindCounts = Object.fromEntries(
    activityKinds.map((kind) => [kind, 0]),
  ) as Record<ActivityKind, number>;

  for (const entry of normalized) {
    statusCounts[entry.status] += 1;
    kindCounts[entry.kind] += 1;
  }

  return {
    statusCounts,
    kindCounts,
  };
}

export function getActivityLogVisibleCountLabel(visible: number, total: number) {
  return `当前显示 ${visible} / ${total} 条`;
}

function matchesQuickFilter(
  entry: ActivityLogEntry,
  quick: ActivityLogQuickFilter,
) {
  if (quick === "failed") {
    return entry.status === "error";
  }

  if (quick === "warnings") {
    return entry.status === "warning";
  }

  if (quick === "install-uninstall") {
    return entry.kind === "install" || entry.kind === "uninstall";
  }

  if (quick === "ai") {
    return entry.kind === "ai";
  }

  if (quick === "system") {
    return entry.kind === "system";
  }

  return true;
}

function normalizeQuery(query: string | undefined) {
  return String(query ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function buildSearchText(entry: ActivityLogEntry) {
  return [
    entry.title,
    entry.detail,
    entry.toolName,
    entry.toolId,
    entry.source,
    entry.commandSummary,
    entry.exitCode === undefined ? "" : String(entry.exitCode),
    ...(entry.rawOutput ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function getSinceDate(timeRange: ActivityLogTimeRange, now: Date) {
  if (timeRange === "all") {
    return undefined;
  }

  if (timeRange === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const days = timeRange === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
