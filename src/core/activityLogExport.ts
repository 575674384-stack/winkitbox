import {
  normalizeActivityLog,
  redactSensitiveText,
  type ActivityKind,
  type ActivityLogEntry,
  type ActivityStatus,
} from "./activityLog";

const kindLabels: Record<ActivityKind, string> = {
  install: "安装",
  uninstall: "卸载",
  update: "更新",
  "update-check": "更新检测",
  launch: "启动",
  ai: "AI",
  config: "配置",
  system: "系统",
  category: "分类",
  theme: "主题",
};

const statusLabels: Record<ActivityStatus, string> = {
  success: "成功",
  warning: "警告",
  error: "失败",
  info: "信息",
};

export function exportActivityLogAsJson(
  entries: readonly ActivityLogEntry[],
  exportedAt = new Date(),
) {
  const normalized = normalizeActivityLog(entries);

  return JSON.stringify(
    {
      product: "WinKitBox",
      exportedAt: exportedAt.toISOString(),
      count: normalized.length,
      entries: normalized,
    },
    null,
    2,
  );
}

export function exportActivityLogAsText(
  entries: readonly ActivityLogEntry[],
  exportedAt = new Date(),
) {
  const normalized = normalizeActivityLog(entries);
  const lines = [
    "WinKitBox 日志导出",
    `导出时间：${formatDateTime(exportedAt.toISOString())}`,
    `记录数量：${normalized.length}`,
    "",
  ];

  normalized.forEach((entry, index) => {
    lines.push(`## ${index + 1}. ${redactSensitiveText(entry.title)}`);
    lines.push(`时间：${formatDateTime(entry.createdAt)}`);
    lines.push(`类型：${kindLabels[entry.kind]}`);
    lines.push(`状态：${statusLabels[entry.status]}`);
    if (entry.toolName) {
      lines.push(`工具：${entry.toolName}`);
    }
    if (entry.toolId) {
      lines.push(`工具 ID：${entry.toolId}`);
    }
    if (entry.source) {
      lines.push(`来源：${entry.source}`);
    }
    if (entry.exitCode !== undefined) {
      lines.push(`退出码：${entry.exitCode ?? "未知"}`);
    }
    if (entry.durationMs !== undefined) {
      lines.push(`耗时：${formatDuration(entry.durationMs)}`);
    }
    if (entry.commandSummary) {
      lines.push(`命令摘要：${redactSensitiveText(entry.commandSummary)}`);
    }
    if (entry.detail) {
      lines.push("详情：");
      lines.push(redactSensitiveText(entry.detail));
    }
    if (entry.rawOutput?.length) {
      lines.push("实时输出：");
      lines.push(...entry.rawOutput.map(redactSensitiveText));
    }
    lines.push("");
  });

  return lines.join("\n");
}

export function getActivityLogKindLabel(kind: ActivityKind) {
  return kindLabels[kind];
}

export function getActivityLogStatusLabel(status: ActivityStatus) {
  return statusLabels[status];
}

export function formatActivityLogDateTime(createdAt: string) {
  return formatDateTime(createdAt);
}

export function formatActivityLogDuration(durationMs: number | undefined) {
  return durationMs === undefined ? "未知" : formatDuration(durationMs);
}

function formatDateTime(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}
