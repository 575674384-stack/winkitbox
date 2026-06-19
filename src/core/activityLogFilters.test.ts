import { describe, expect, it } from "vitest";
import { normalizeActivityLog, type ActivityLogEntry } from "./activityLog";
import {
  createActivityLogFilterOptions,
  filterActivityLogEntries,
  getActivityLogVisibleCountLabel,
} from "./activityLogFilters";

const entries = normalizeActivityLog([
  {
    id: "1",
    createdAt: "2026-06-19T02:00:00.000Z",
    kind: "install",
    status: "error",
    title: "Czkawka 安装失败",
    detail: "winget 安装失败",
    toolId: "czkawka",
    toolName: "Czkawka",
    source: "一键装机",
    rawOutput: ["Failed to install Czkawka"],
  },
  {
    id: "2",
    createdAt: "2026-06-18T02:00:00.000Z",
    kind: "ai",
    status: "success",
    title: "AI 添加工具",
    detail: "添加 LocalSend",
    toolId: "localsend",
    toolName: "LocalSend",
    source: "AI 添加工具",
  },
  {
    id: "3",
    createdAt: "2026-06-10T02:00:00.000Z",
    kind: "system",
    status: "warning",
    title: "开启 UTF-8 beta",
    detail: "命令结束，退出码未知",
    source: "Windows 环境体检",
  },
] as ActivityLogEntry[]);

describe("activity log filters", () => {
  it("filters by status, kind, time range, and query", () => {
    const result = filterActivityLogEntries(entries, {
      status: "error",
      kind: "install",
      timeRange: "7d",
      query: "czkawka failed",
    }, new Date("2026-06-19T12:00:00.000Z"));

    expect(result.map((entry) => entry.id)).toEqual(["1"]);
  });

  it("supports quick filters for failures and warnings", () => {
    expect(
      filterActivityLogEntries(entries, { quick: "failed" }).map((entry) => entry.id),
    ).toEqual(["1"]);
    expect(
      filterActivityLogEntries(entries, { quick: "warnings" }).map((entry) => entry.id),
    ).toEqual(["3"]);
  });

  it("can scope logs to one tool", () => {
    const result = filterActivityLogEntries(entries, {
      toolId: "localsend",
      query: "AI",
    });

    expect(result.map((entry) => entry.id)).toEqual(["2"]);
  });

  it("creates UI option counts and visible count labels", () => {
    const options = createActivityLogFilterOptions(entries);

    expect(options.statusCounts.error).toBe(1);
    expect(options.kindCounts.ai).toBe(1);
    expect(getActivityLogVisibleCountLabel(2, 3)).toBe("当前显示 2 / 3 条");
  });
});
