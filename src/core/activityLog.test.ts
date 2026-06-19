import { describe, expect, it } from "vitest";
import {
  addActivityLogEntry,
  createActivityLogEntry,
  getActivityLogStats,
  getLatestToolFailure,
  maxActivityLogEntries,
  normalizeActivityLog,
  type ActivityLogEntry,
} from "./activityLog";

describe("activity log", () => {
  it("sanitizes incoming entries", () => {
    const entry = createActivityLogEntry(
      {
        kind: "install",
        status: "error",
        title: "  安装   失败  ",
        detail: "x".repeat(400),
        toolId: "tool",
        toolName: "Tool",
        exitCode: 1,
      },
      new Date("2026-06-19T00:00:00.000Z"),
    );

    expect(entry).toMatchObject({
      createdAt: "2026-06-19T00:00:00.000Z",
      kind: "install",
      status: "error",
      title: "安装 失败",
      toolId: "tool",
      toolName: "Tool",
      exitCode: 1,
    });
    expect(entry.detail).toHaveLength(280);
  });

  it("keeps newest entries first and trims old history", () => {
    let entries: ActivityLogEntry[] = [];

    for (let index = 0; index < maxActivityLogEntries + 5; index++) {
      entries = addActivityLogEntry(
        entries,
        {
          kind: "install",
          status: "success",
          title: `entry-${index}`,
        },
        new Date(2026, 0, 1, 0, 0, index),
      );
    }

    expect(entries).toHaveLength(maxActivityLogEntries);
    expect(entries[0].title).toBe(`entry-${maxActivityLogEntries + 4}`);
    expect(entries.at(-1)?.title).toBe("entry-5");
  });

  it("normalizes unknown payloads safely", () => {
    const entries = normalizeActivityLog([
      undefined,
      {
        id: "old",
        createdAt: "2026-06-18T00:00:00.000Z",
        kind: "unknown",
        status: "bad",
        title: "",
      },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "old",
      kind: "system",
      status: "info",
      title: "未命名操作",
    });
  });

  it("summarizes failures and finds the latest failure for a tool", () => {
    const entries = normalizeActivityLog([
      {
        id: "1",
        createdAt: "2026-06-19T02:00:00.000Z",
        kind: "install",
        status: "error",
        title: "PowerShell 7 安装失败",
        toolId: "powershell",
      },
      {
        id: "2",
        createdAt: "2026-06-19T03:00:00.000Z",
        kind: "install",
        status: "warning",
        title: "LocalSend 需要手动下载",
        toolId: "localsend",
      },
      {
        id: "3",
        createdAt: "2026-06-19T04:00:00.000Z",
        kind: "update",
        status: "error",
        title: "PowerShell 7 更新失败",
        toolId: "powershell",
      },
    ]);

    expect(getActivityLogStats(entries)).toMatchObject({
      total: 3,
      failed: 2,
      warnings: 1,
      lastFailure: expect.objectContaining({
        title: "PowerShell 7 更新失败",
      }),
    });
    expect(getLatestToolFailure(entries, "powershell")?.title).toBe(
      "PowerShell 7 更新失败",
    );
  });
});
