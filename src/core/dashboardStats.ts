import type { Tool } from "./catalog";
import type { InstallPlan } from "./planner";
import type { ToolRuntimeStates } from "./toolStatus";

export type DashboardStatsInput = {
  tools: Tool[];
  selectedIds: Set<string>;
  toolStates: ToolRuntimeStates;
  installPlan: InstallPlan;
};

export function createDashboardStats({ tools, selectedIds, toolStates, installPlan }: DashboardStatsInput) {
  return {
    selectedCount: selectedIds.size,
    installedCount: tools.filter((tool) => toolStates[tool.id]?.status === "installed").length,
    readyCount: installPlan.readyCount,
    manualCount: installPlan.manualCount,
    adminCount: installPlan.adminCount
  };
}
