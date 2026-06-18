import {
  resolveToolCategory,
  type CategoryDefinition,
  type Tool,
  type ToolCategory,
} from "./catalog";
import { searchTools } from "./planner";
import type { ToolRuntimeStates } from "./toolStatus";

export type CatalogQuickFilter = "installed" | "selected";

export type CatalogQuickFilterState = {
  installedOnly: boolean;
  selectedOnly: boolean;
};

export type CatalogFilterOptions = CatalogQuickFilterState & {
  activeCategory: "all" | ToolCategory;
  customCategories: CategoryDefinition[];
  selectedIds: ReadonlySet<string>;
  query: string;
  toolStates: ToolRuntimeStates;
};

export function toggleCatalogQuickFilter(
  state: CatalogQuickFilterState,
  filter: CatalogQuickFilter,
): CatalogQuickFilterState {
  if (filter === "installed") {
    return {
      installedOnly: !state.installedOnly,
      selectedOnly: false,
    };
  }

  return {
    installedOnly: false,
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

  return searchTools([...statusFiltered], options.query);
}
