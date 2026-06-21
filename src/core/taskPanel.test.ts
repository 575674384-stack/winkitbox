import { describe, expect, it } from "vitest";
import { shouldAutoHideTaskPanel } from "./taskPanel";
import type { TaskQueueItem } from "./taskQueue";

const baseTask: TaskQueueItem = {
  id: "task-1",
  kind: "install",
  title: "Install",
  status: "success",
  progressLabel: "已完成",
  createdAt: "2026-06-21T00:00:00.000Z"
};

describe("task panel helpers", () => {
  it("auto hides once every task is finished", () => {
    expect(shouldAutoHideTaskPanel([{ ...baseTask }])).toBe(true);
  });

  it("stays visible while queued or running work exists", () => {
    expect(shouldAutoHideTaskPanel([{ ...baseTask, status: "running" }])).toBe(false);
    expect(shouldAutoHideTaskPanel([{ ...baseTask, status: "queued" }])).toBe(false);
  });

  it("does not auto-hide errors so the user can retry or inspect logs", () => {
    expect(shouldAutoHideTaskPanel([{ ...baseTask, status: "error" }])).toBe(false);
  });
});
