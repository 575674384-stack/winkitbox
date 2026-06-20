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
    failedOnly: false,
    installedOnly: false,
    selectedOnly: false,
    updatableOnly: false,
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
      failedOnly: false,
      installedOnly: false,
      selectedOnly: false,
      updatableOnly: false,
    };

    expect(toggleCatalogQuickFilter(idle, "selected")).toEqual({
      failedOnly: false,
      installedOnly: false,
      selectedOnly: true,
      updatableOnly: false,
    });
    expect(
      toggleCatalogQuickFilter(
        {
          failedOnly: false,
          installedOnly: false,
          selectedOnly: true,
          updatableOnly: false,
        },
        "selected",
      ),
    ).toEqual({
      failedOnly: false,
      installedOnly: false,
      selectedOnly: false,
      updatableOnly: false,
    });
    expect(
      toggleCatalogQuickFilter(
        {
          failedOnly: false,
          installedOnly: false,
          selectedOnly: true,
          updatableOnly: false,
        },
        "installed",
      ),
    ).toEqual({
      failedOnly: false,
      installedOnly: true,
      selectedOnly: false,
      updatableOnly: false,
    });
  });

  it("supports failed and updatable quick filters", () => {
    const toolStates: ToolRuntimeStates = {
      terminal: { status: "installed" },
      geek: { status: "failed" },
    };
    const updateResults = {
      terminal: { status: "available" as const },
      files: { status: "current" as const },
    };

    expect(
      getVisibleCatalogTools(
        tools,
        filterState({ failedOnly: true, toolStates }),
      ).map((tool) => tool.id),
    ).toEqual(["geek"]);

    expect(
      getVisibleCatalogTools(
        tools,
        filterState({ updatableOnly: true, toolUpdateResults: updateResults }),
      ).map((tool) => tool.id),
    ).toEqual(["terminal"]);
  });
});
