import { describe, expect, it } from "vitest";
import { categoryLabels, tools } from "./catalog";

describe("tool catalog", () => {
  it("removes tools that should no longer appear in the toolbox", () => {
    const ids = tools.map((tool) => tool.id);

    expect(ids).not.toContain("quicklook");
    expect(ids).not.toContain("notepad-plus-plus");
    expect(ids).not.toContain("sharex");
    expect(ids).not.toContain("nofences");
  });

  it("contains AI app and input method categories", () => {
    expect(categoryLabels.ai).toBe("AI 应用");
    expect(categoryLabels.ime).toBe("输入法");
    expect(tools.some((tool) => tool.category === "ai" && tool.id === "cc-switch")).toBe(true);
    expect(tools.some((tool) => tool.category === "ime" && tool.id === "wechat-input")).toBe(true);
  });

  it("adds requested maintenance and system enhancement tools", () => {
    expect(tools.some((tool) => tool.id === "wise-registry-cleaner")).toBe(true);
    expect(tools.some((tool) => tool.id === "zyperwin")).toBe(true);
  });
});
