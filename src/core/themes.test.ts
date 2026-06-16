import { describe, expect, it } from "vitest";
import { isThemeId, themeDefinitions } from "./themes";

describe("theme definitions", () => {
  it("keeps the built-in theme ids valid and unique", () => {
    const ids = themeDefinitions.map((theme) => theme.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["light", "dark", "slate", "teal", "rose"]);
    expect(ids.every(isThemeId)).toBe(true);
  });

  it("rejects unknown theme ids", () => {
    expect(isThemeId("light")).toBe(true);
    expect(isThemeId("official-character-pack")).toBe(false);
  });
});
