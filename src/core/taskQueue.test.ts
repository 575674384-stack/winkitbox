import { describe, expect, it } from "vitest";
import {
  addTaskQueueItem,
  completeTaskQueueItem,
  failTaskQueueItem,
  getTaskQueueStats,
  startTaskQueueItem,
  type TaskQueueInput,
} from "./taskQueue";

describe("task queue", () => {
  it("tracks queued, running, successful, and failed tasks", () => {
    const installTask: TaskQueueInput = {
      id: "install-terminal",
      kind: "install",
      title: "安装 Windows Terminal",
      toolId: "terminal",
      toolName: "Windows Terminal",
    };

    const queued = addTaskQueueItem([], installTask, new Date("2026-06-20T10:00:00.000Z"));
    expect(queued[0]).toMatchObject({
      id: "install-terminal",
      status: "queued",
      progressLabel: "等待中",
    });

    const running = startTaskQueueItem(queued, "install-terminal", new Date("2026-06-20T10:01:00.000Z"));
    expect(running[0]).toMatchObject({
      status: "running",
      progressLabel: "执行中",
    });

    const completed = completeTaskQueueItem(
      running,
      "install-terminal",
      { status: "success", message: "安装完成", exitCode: 0 },
      new Date("2026-06-20T10:02:00.000Z"),
    );

    expect(completed[0]).toMatchObject({
      status: "success",
      message: "安装完成",
      exitCode: 0,
    });
    expect(completed[0].durationMs).toBe(60000);
  });

  it("summarizes task status counts and retryable failures", () => {
    const tasks = failTaskQueueItem(
      addTaskQueueItem(
        [
          {
            id: "repair-dotnet",
            kind: "environment",
            title: "安装 .NET Desktop Runtime",
            status: "success",
            progressLabel: "已完成",
            createdAt: "2026-06-20T09:00:00.000Z",
          },
        ],
        {
          id: "update-flow",
          kind: "update",
          title: "更新 Flow Launcher",
          retryable: true,
        },
        new Date("2026-06-20T10:00:00.000Z"),
      ),
      "update-flow",
      "更新失败",
      new Date("2026-06-20T10:01:00.000Z"),
    );

    expect(getTaskQueueStats(tasks)).toMatchObject({
      total: 2,
      success: 1,
      error: 1,
      retryableFailures: 1,
    });
  });
});
