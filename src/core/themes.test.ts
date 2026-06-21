import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  defaultThemeId,
  isThemeId,
  themeDefinitions
} from "./themes";

describe("theme definitions", () => {
  it("keeps the built-in theme ids valid and unique", () => {
    const ids = themeDefinitions.map((theme) => theme.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(isThemeId)).toBe(true);
  });

  it("rejects unknown theme ids", () => {
    expect(isThemeId("light")).toBe(false);
    expect(isThemeId("sakura")).toBe(false);
    expect(isThemeId("azure")).toBe(true);
    expect(isThemeId("mint")).toBe(true);
    expect(isThemeId("amber")).toBe(true);
    expect(isThemeId("violet")).toBe(true);
    expect(isThemeId("rose")).toBe(true);
    expect(isThemeId("ninja")).toBe(true);
    expect(isThemeId("official-character-pack")).toBe(false);
  });

  it("gives each built-in theme a background image", () => {
    expect(themeDefinitions.every((theme) => theme.imageBackground)).toBe(true);
  });

  it("defaults to azure", () => {
    expect(defaultThemeId).toBe("azure");
  });

  it("keeps Electron theme normalization in sync with renderer themes", () => {
    const themeIdsSource = readFileSync("electron/themeIds.cjs", "utf8");
    const allowedIds =
      themeIdsSource.match(/const allowedThemeIds = new Set\(\[(?<ids>[^\]]+)\]\)/)
        ?.groups?.ids ?? "";

    for (const theme of themeDefinitions) {
      expect(allowedIds).toContain(`"${theme.id}"`);
    }
  });
});
