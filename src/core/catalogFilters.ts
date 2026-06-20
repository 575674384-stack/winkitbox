import {
  resolveToolCategory,
  type CategoryDefinition,
  type Tool,
  type ToolCategory,
} from "./catalog";
import { searchTools } from "./planner";
import type { ToolRuntimeStates } from "./toolStatus";
import type { ToolUpdateCheckResult } from "./toolUpdates";

export type CatalogQuickFilter = "installed" | "selected" | "failed" | "updatable";

export type CatalogQuickFilterState = {
  failedOnly: boolean;
  installedOnly: boolean;
  selectedOnly: boolean;
  updatableOnly: boolean;
};

export type CatalogFilterOptions = CatalogQuickFilterState & {
  activeCategory: "all" | ToolCategory;
  customCategories: CategoryDefinition[];
  selectedIds: ReadonlySet<string>;
  query: string;
  toolStates: ToolRuntimeStates;
  toolUpdateResults?: Record<string, Pick<ToolUpdateCheckResult, "status">>;
};

export function toggleCatalogQuickFilter(
  state: CatalogQuickFilterState,
  filter: CatalogQuickFilter,
): CatalogQuickFilterState {
  const idle = {
    failedOnly: false,
    installedOnly: false,
    selectedOnly: false,
    updatableOnly: false,
  };

  if (filter === "installed") {
    return {
      ...idle,
      installedOnly: !state.installedOnly,
    };
  }

  if (filter === "failed") {
    return {
      ...idle,
      failedOnly: !state.failedOnly,
    };
  }

  if (filter === "updatable") {
    return {
      ...idle,
      updatableOnly: !state.updatableOnly,
    };
  }

  return {
    ...idle,
    selectedOnly: !state.selectedOnly,
  };
}

export function getVisibleCatalogTools(
  allTools: readonly Tool[],
  options: CatalogFilterOptions,
): Tool[] {
  const categoryFiltered =
    options.activeCategory === "all"
      ? allTools
      : allTools.filter(
          (tool) =>
            resolveToolCategory(tool, options.customCategories) ===
            options.activeCategory,
        );

  const selectedFiltered = options.selectedOnly
    ? categoryFiltered.filter((tool) => options.selectedIds.has(tool.id))
    : categoryFiltered;

  const statusFiltered = options.installedOnly
    ? selectedFiltered.filter(
        (tool) => options.toolStates[tool.id]?.status === "installed",
      )
    : selectedFiltered;

  const failedFiltered = options.failedOnly
    ? statusFiltered.filter(
        (tool) => options.toolStates[tool.id]?.status === "failed",
      )
    : statusFiltered;

  const updatableFiltered = options.updatableOnly
    ? failedFiltered.filter((tool) => {
        const status = options.toolUpdateResults?.[tool.id]?.status;
        return status === "available" || status === "reinstall";
      })
    : failedFiltered;

  return searchTools([...updatableFiltered], options.query);
}
