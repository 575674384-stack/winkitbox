import { describe, expect, it } from "vitest";

// @ts-expect-error aiRepair.cjs is a CommonJS helper in electron/ without type declarations.
import { looksLikeMsixFailure } from "../../electron/aiRepair.cjs";

describe("looksLikeMsixFailure", () => {
  it("returns true for common MSIX/App Installer failure messages", () => {
    expect(looksLikeMsixFailure("Add-AppxPackage failed with 0x80073CF6")).toBe(true);
    expect(looksLikeMsixFailure("Microsoft.UI.Xaml.2.8 is missing")).toBe(true);
    expect(looksLikeMsixFailure("App Installer cannot install msixbundle")).toBe(true);
    expect(looksLikeMsixFailure("Deployment failed: package not found")).toBe(true);
    expect(looksLikeMsixFailure("PackageFamilyName Microsoft.WindowsTerminal_8wekyb3d8bbwe")).toBe(true);
  });

  it("returns false for unrelated failure messages", () => {
    expect(looksLikeMsixFailure("winget returned exit code 1")).toBe(false);
    expect(looksLikeMsixFailure("404 Not Found")).toBe(false);
    expect(looksLikeMsixFailure("")).toBe(false);
    expect(looksLikeMsixFailure(undefined)).toBe(false);
  });
});
