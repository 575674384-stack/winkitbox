import { describe, expect, it } from "vitest";
import {
  categoryLabels,
  createUserCategory,
  customAddCategoryId,
  getActiveCategoryDefinitions,
  getDefaultCategoryDefinitions,
  normalizeCategoryDefinitions,
  reorderUserCategories,
  resolveToolCategory,
  tools,
  uncategorizedCategoryId
} from "./catalog";

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

  it("uses the current Czkawka GUI winget package id", () => {
    const czkawka = tools.find((tool) => tool.id === "czkawka");

    expect(czkawka?.wingetId).toBe("qarmin.czkawka.gui");
  });

  it("uses a live GitHub Release source for RustDesk instead of the retired winget id", () => {
    const rustdesk = tools.find((tool) => tool.id === "rustdesk");

    expect(rustdesk?.wingetId).toBeUndefined();
    expect(rustdesk?.installer).toMatchObject({
      releaseApiUrl: "https://api.github.com/repos/rustdesk/rustdesk/releases/latest",
      assetPattern: "^rustdesk-.*-x86_64\\.exe$",
      targetDirName: "rustdesk",
      fileName: "RustDesk-Setup.exe",
      args: ["--silent-install"]
    });
  });

  it("keeps custom add protected while allowing other categories to be hidden", () => {
    const categories = normalizeCategoryDefinitions([
      { id: customAddCategoryId, name: "改名无效", hidden: true },
      { id: "cleanup", name: "清理工具", hidden: true }
    ]);

    expect(categories.find((category) => category.id === customAddCategoryId)).toMatchObject({
      name: "自定义添加"
    });
    expect(categories.find((category) => category.id === customAddCategoryId)?.hidden).not.toBe(true);
    expect(getActiveCategoryDefinitions(categories).some((category) => category.id === "cleanup")).toBe(false);
    expect(resolveToolCategory({ category: "cleanup" }, categories)).toBe(uncategorizedCategoryId);
  });

  it("creates stable user category ids", () => {
    const category = createUserCategory("我的工具", getDefaultCategoryDefinitions());

    expect(category).toMatchObject({
      id: "user-我的工具",
      name: "我的工具",
      builtin: false
    });
  });

  it("reorders only user categories while keeping builtin categories fixed", () => {
    const categories = normalizeCategoryDefinitions([
      ...getDefaultCategoryDefinitions(),
      { id: "user-a", name: "A", builtin: false },
      { id: "user-b", name: "B", builtin: false },
      { id: "user-c", name: "C", builtin: false }
    ]);

    const reordered = reorderUserCategories(categories, "user-c", "user-a");

    expect(reordered.map((category) => category.id)).toEqual([
      customAddCategoryId,
      "starter",
      "ai",
      "ime",
      "system",
      "files",
      "capture",
      "cleanup",
      "desktop",
      "network",
      "rescue",
      "user-c",
      "user-a",
      "user-b"
    ]);
  });
});
