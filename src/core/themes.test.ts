import { describe, expect, it } from "vitest";
import {
  imageThemeIds,
  isImageThemeId,
  isSolidThemeId,
  isThemeId,
  solidThemeIds,
  themeDefinitions
} from "./themes";

describe("theme definitions", () => {
  it("keeps the built-in theme ids valid and unique", () => {
    const ids = themeDefinitions.map((theme) => theme.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...solidThemeIds, ...imageThemeIds]);
    expect(ids.every(isThemeId)).toBe(true);
  });

  it("rejects unknown theme ids", () => {
    expect(isThemeId("light")).toBe(true);
    expect(isThemeId("sakura")).toBe(true);
    expect(isThemeId("official-character-pack")).toBe(false);
  });

  it("separates solid and image themes", () => {
    expect(solidThemeIds.every(isSolidThemeId)).toBe(true);
    expect(imageThemeIds.every(isImageThemeId)).toBe(true);
    expect(isImageThemeId("light")).toBe(false);
    expect(isSolidThemeId("neon")).toBe(false);
  });

  it("gives image themes a background image", () => {
    for (const id of imageThemeIds) {
      const theme = themeDefinitions.find((t) => t.id === id);
      expect(theme?.imageBackground).toBeTruthy();
    }
  });

  it("does not give solid themes a background image", () => {
    for (const id of solidThemeIds) {
      const theme = themeDefinitions.find((t) => t.id === id);
      expect(theme?.imageBackground).toBeUndefined();
    }
  });
});
