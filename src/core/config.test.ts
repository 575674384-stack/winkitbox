import { describe, expect, it } from "vitest";
import { buildExportConfig, createCustomTool, parseImportedConfig } from "./config";

describe("config helpers", () => {
  it("creates a custom tool with a stable custom id and install command", () => {
    const tool = createCustomTool(
      {
        name: "My Tool",
        category: "ai",
        homepage: "https://example.com",
        installCommand: "winget install Example.Tool",
        launchCommand: "my-tool.exe"
      },
      new Set(["custom-my-tool"])
    );

    expect(tool).toMatchObject({
      id: "custom-my-tool-2",
      name: "My Tool",
      category: "ai",
      source: "custom",
      customInstallCommand: "winget install Example.Tool"
    });
    expect(tool.launch?.commands).toEqual(["my-tool.exe"]);
  });

  it("keeps exported configs under the lightweight 1MB contract", () => {
    const payload = buildExportConfig({
      version: 1,
      exportedAt: "2026-06-16T00:00:00.000Z",
      settings: {
        toolRootPath: "%LOCALAPPDATA%\\WinKitBox",
        updateOnStartup: true
      },
      selectedToolIds: ["powertoys"],
      customTools: []
    });

    expect(payload.length).toBeLessThan(1024 * 1024);
    expect(parseImportedConfig(payload).selectedToolIds).toEqual(["powertoys"]);
  });
});
