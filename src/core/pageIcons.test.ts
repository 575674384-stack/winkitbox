import { describe, expect, it } from "vitest";
import { getPageIcon } from "./pageIcons";

describe("page mascot icons", () => {
  it("maps workspace pages to generated mascot icons", () => {
    expect(getPageIcon("catalog")).toBeTruthy();
    expect(getPageIcon("system")).toBeTruthy();
    expect(getPageIcon("addTool")).toBeTruthy();
    expect(getPageIcon("updates")).toBeTruthy();
    expect(getPageIcon("notes")).toBeTruthy();
    expect(getPageIcon("logs")).toBeTruthy();
    expect(getPageIcon("settings")).toBeTruthy();
  });

  it("leaves GitHub ranking on its original icon style", () => {
    expect(getPageIcon("discover")).toBeUndefined();
  });
});
