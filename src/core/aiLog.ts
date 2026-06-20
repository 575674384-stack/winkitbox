import { redactSensitiveText } from "./activityLog";

export type AiLogKind =
  | "recommendation"
  | "tool-analysis"
  | "local-analysis"
  | "repair"
  | "model"
  | "other";

export type AiLogStatus = "success" | "error" | "warning" | "info";

export type AiLogEntry = {
  id: string;
  createdAt: string;
  kind: AiLogKind;
  status: AiLogStatus;
  title: string;
  prompt?: string;
  response?: string;
  structured?: unknown;
  model?: string;
  source?: string;
  toolId?: string;
  toolName?: string;
  repoUrl?: string;
};

export type AiLogInput = Omit<AiLogEntry, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

export type AiLogFilters = {
  kind?: AiLogKind | "all";
  status?: AiLogStatus | "all";
  toolId?: string;
  query?: string;
};

export const maxAiLogEntries = 500;
export const maxAiLogPromptLength = 5000;
export const maxAiLogResponseLength = 20000;

const aiLogKinds = new Set<AiLogKind>([
  "recommendation",
  "tool-analysis",
  "local-analysis",
  "repair",
  "model",
  "other",
]);

const aiLogStatuses = new Set<AiLogStatus>([
  "success",
  "error",
  "warning",
  "info",
]);

export function createAiLogEntry(input: AiLogInput, now = new Date()): AiLogEntry {
  return {
    id: compactLine(input.id, 120) || `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt:
      input.createdAt && !Number.isNaN(Date.parse(input.createdAt))
        ? input.createdAt
        : now.toISOString(),
    kind: aiLogKinds.has(input.kind) ? input.kind : "other",
    status: aiLogStatuses.has(input.status) ? input.status : "info",
    title: compactLine(input.title, 120) || "未命名 AI 记录",
    prompt: compactMultiline(input.prompt, maxAiLogPromptLength),
    response: compactMultiline(input.response, maxAiLogResponseLength),
    structured: normalizeStructured(input.structured),
    model: compactLine(input.model, 120),
    source: compactLine(input.source, 120),
    toolId: compactLine(input.toolId, 100),
    toolName: compactLine(input.toolName, 120),
    repoUrl: compactLine(input.repoUrl, 400),
  };
}

export function normalizeAiLog(value: unknown): AiLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      item && typeof item === "object"
        ? createAiLogEntry(item as AiLogInput)
        : undefined,
    )
    .filter((entry): entry is AiLogEntry => Boolean(entry))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, maxAiLogEntries);
}

export function addAiLogEntry(
  current: readonly AiLogEntry[],
  input: AiLogInput,
  now = new Date(),
): AiLogEntry[] {
  return normalizeAiLog([createAiLogEntry(input, now), ...current]);
}

export function filterAiLogEntries(
  entries: readonly AiLogEntry[],
  filters: AiLogFilters,
): AiLogEntry[] {
  const query = String(filters.query ?? "").trim().toLowerCase();

  return normalizeAiLog(entries).filter((entry) => {
    if (filters.kind && filters.kind !== "all" && entry.kind !== filters.kind) {
      return false;
    }

    if (filters.status && filters.status !== "all" && entry.status !== filters.status) {
      return false;
    }

    if (filters.toolId && entry.toolId !== filters.toolId) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      entry.title,
      entry.prompt,
      entry.response,
      entry.model,
      entry.source,
      entry.toolId,
      entry.toolName,
      entry.repoUrl,
      stringifyStructured(entry.structured),
    ]
      .filter(Boolean)
      .join("\n")
      .toLowerCase()
      .includes(query);
  });
}

export function exportAiLogAsText(entries: readonly AiLogEntry[]): string {
  return normalizeAiLog(entries)
    .map((entry) =>
      [
        `标题：${entry.title}`,
        `时间：${entry.createdAt}`,
        `类型：${getAiLogKindLabel(entry.kind)}`,
        `状态：${getAiLogStatusLabel(entry.status)}`,
        entry.model ? `模型：${entry.model}` : "",
        entry.source ? `来源：${entry.source}` : "",
        entry.toolName ? `工具：${entry.toolName}` : "",
        entry.repoUrl ? `链接：${entry.repoUrl}` : "",
        entry.prompt ? `\n用户输入：\n${entry.prompt}` : "",
        entry.response ? `\nAI 回复：\n${entry.response}` : "",
        entry.structured
          ? `\n结构化结果：\n${stringifyStructured(entry.structured)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n---\n\n");
}

export function getAiLogKindLabel(kind: AiLogKind) {
  const labels: Record<AiLogKind, string> = {
    recommendation: "GitHub 推荐",
    "tool-analysis": "链接分析",
    "local-analysis": "本地分析",
    repair: "AI 修复",
    model: "模型",
    other: "其他",
  };

  return labels[kind];
}

export function getAiLogStatusLabel(status: AiLogStatus) {
  const labels: Record<AiLogStatus, string> = {
    success: "成功",
    error: "失败",
    warning: "警告",
    info: "信息",
  };

  return labels[status];
}

function compactLine(value: unknown, maxLength: number) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return text ? redactSensitiveText(text).slice(0, maxLength) : undefined;
}

function compactMultiline(value: unknown, maxLength: number) {
  const text = redactSensitiveText(String(value ?? ""))
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  return text ? text.slice(0, maxLength) : undefined;
}

function normalizeStructured(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return compactMultiline(value, 2000);
  }
}

function stringifyStructured(value: unknown) {
  if (value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
