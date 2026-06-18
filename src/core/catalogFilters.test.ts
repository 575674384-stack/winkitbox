import { describe, expect, it } from "vitest";
import { tools } from "./catalog";
import {
  getVisibleCatalogTools,
  toggleCatalogQuickFilter,
  type CatalogQuickFilterState,
} from "./catalogFilters";
import type { ToolRuntimeStates } from "./toolStatus";

function filterState(overrides: Partial<Parameters<typeof getVisibleCatalogTools>[1]> = {}) {
  return {
    activeCategory: "all" as const,
    customCategories: [],
    installedOnly: false,
    selectedOnly: false,
    selectedIds: new Set<string>(),
    query: "",
    toolStates: {},
    ...overrides,
  };
}

describe("catalog filters", () => {
  it("shows only selected tools when selected-only mode is enabled", () => {
    const selectedIds = new Set(["terminal", "geek"]);

    const visibleTools = getVisibleCatalogTools(
      tools,
      filterState({ selectedOnly: true, selectedIds }),
    );

    expect(visibleTools.map((tool) => tool.id)).toEqual(["terminal", "geek"]);
  });

  it("shows only installed tools when installed-only mode is enabled", () => {
    const toolStates: ToolRuntimeStates = {
      terminal: { status: "installed" },
      files: { status: "installed" },
      geek: { status: "not-installed" },
    };

    const visibleTools = getVisibleCatalogTools(
      tools,
      filterState({ installedOnly: true, toolStates }),
    );

    expect(visibleTools.map((tool) => tool.id)).toEqual(["terminal", "files"]);
  });

  it("toggles the same quick filter off and keeps selected/installed filters exclusive", () => {
    const idle: CatalogQuickFilterState = {
      installedOnly: false,
      selectedOnly: false,
    };

    expect(toggleCatalogQuickFilter(idle, "selected")).toEqual({
      installedOnly: false,
      selectedOnly: true,
    });
    expect(
      toggleCatalogQuickFilter(
        { installedOnly: false, selectedOnly: true },
        "selected",
      ),
    ).toEqual({
      installedOnly: false,
      selectedOnly: false,
    });
    expect(
      toggleCatalogQuickFilter(
        { installedOnly: false, selectedOnly: true },
        "installed",
      ),
    ).toEqual({
      installedOnly: true,
      selectedOnly: false,
    });
  });
});
