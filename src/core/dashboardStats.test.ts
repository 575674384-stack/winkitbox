import { describe, expect, it } from "vitest";
import { tools } from "./catalog";
import { createDashboardStats } from "./dashboardStats";
import { createInstallPlan } from "./planner";
import type { ToolRuntimeStates } from "./toolStatus";

describe("dashboard stats", () => {
  it("counts installed tools across the whole catalog instead of only selected tools", () => {
    const selectedIds = new Set(["terminal"]);
    const toolStates: ToolRuntimeStates = {
      terminal: { status: "installed" },
      files: { status: "installed" },
      geek: { status: "installed" }
    };

    const stats = createDashboardStats({
      tools,
      selectedIds,
      toolStates,
      installPlan: createInstallPlan(tools, selectedIds)
    });

    expect(stats.selectedCount).toBe(1);
    expect(stats.installedCount).toBe(3);
  });
});
