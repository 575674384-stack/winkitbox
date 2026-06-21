import { describe, expect, it } from "vitest";
import { calculateVirtualGridWindow, filterToolsWithCacheKey } from "./virtualGrid";

describe("virtual grid helpers", () => {
  it("calculates an overscanned window for large card grids", () => {
    const window = calculateVirtualGridWindow({
      totalItems: 250,
      scrollTop: 920,
      viewportHeight: 720,
      columnCount: 4,
      rowHeight: 280,
      overscanRows: 1
    });

    expect(window).toEqual({
      startIndex: 8,
      endIndex: 28,
      beforeHeight: 560,
      afterHeight: 15680
    });
  });

  it("keeps small lists fully rendered", () => {
    expect(
      calculateVirtualGridWindow({
        totalItems: 20,
        scrollTop: 0,
        viewportHeight: 720,
        columnCount: 4,
        rowHeight: 280,
        overscanRows: 1,
        minimumItems: 40
      })
    ).toEqual({
      startIndex: 0,
      endIndex: 20,
      beforeHeight: 0,
      afterHeight: 0
    });
  });

  it("normalizes search cache keys", () => {
    expect(filterToolsWithCacheKey("  Power   Toys  ")).toBe("power toys");
  });
});
