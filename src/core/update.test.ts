import { describe, expect, it } from "vitest";
import { compareVersions, isUpdateAvailable } from "./update";

describe("update helpers", () => {
  it("compares semantic versions with optional v prefixes", () => {
    expect(compareVersions("v0.1.8", "0.1.7")).toBeGreaterThan(0);
    expect(compareVersions("0.1.7", "v0.1.7")).toBe(0);
    expect(compareVersions("0.1.6", "0.1.7")).toBeLessThan(0);
  });

  it("detects whether a release should be offered as an update", () => {
    expect(isUpdateAvailable("0.1.7", "v0.1.8")).toBe(true);
    expect(isUpdateAvailable("0.1.8", "v0.1.8")).toBe(false);
  });
});
