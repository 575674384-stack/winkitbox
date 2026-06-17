import { describe, expect, it } from "vitest";
import {
  builtinThemeBackgrounds,
  createBuiltinThemeBackgroundValue,
  getBuiltinThemeBackgroundId,
  isThemeId,
  themeDefinitions
} from "./themes";

describe("theme definitions", () => {
  it("keeps the built-in theme ids valid and unique", () => {
    const ids = themeDefinitions.map((theme) => theme.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["light", "slate", "teal", "rose"]);
    expect(ids).not.toContain("dark");
    expect(ids.every(isThemeId)).toBe(true);
  });

  it("rejects unknown theme ids", () => {
    expect(isThemeId("light")).toBe(true);
    expect(isThemeId("official-character-pack")).toBe(false);
  });

  it("keeps built-in background ids stable and resolvable", () => {
    const ids = builtinThemeBackgrounds.map((background) => background.id);

    expect(ids).toEqual(["sakura-workbench", "neon-terminal", "azure-rooftop"]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getBuiltinThemeBackgroundId(createBuiltinThemeBackgroundValue("sakura-workbench"))).toBe(
      "sakura-workbench"
    );
    expect(getBuiltinThemeBackgroundId("builtin:unknown")).toBeUndefined();
  });
});
