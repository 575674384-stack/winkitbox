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
        updateOnStartup: true,
        themeId: "light"
      },
      selectedToolIds: ["powertoys"],
      customTools: []
    });

    expect(payload.length).toBeLessThan(1024 * 1024);
    const imported = parseImportedConfig(payload);
    expect(imported.selectedToolIds).toEqual(["powertoys"]);
    expect(imported.settings.themeId).toBe("light");
  });

  it("drops unknown theme ids from imported configs", () => {
    const imported = parseImportedConfig(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-16T00:00:00.000Z",
        settings: {
          toolRootPath: "%LOCALAPPDATA%\\WinKitBox",
          updateOnStartup: true,
          themeId: "unknown"
        },
        selectedToolIds: [],
        customTools: []
      })
    );

    expect(imported.settings.themeId).toBeUndefined();
  });

  it("keeps custom categories in portable config while preserving protected categories", () => {
    const imported = parseImportedConfig(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-16T00:00:00.000Z",
        settings: {
          toolRootPath: "%LOCALAPPDATA%\\WinKitBox",
          updateOnStartup: true
        },
        selectedToolIds: [],
        customTools: [],
        customCategories: [
          { id: "custom-add", name: "不要改", hidden: true },
          { id: "user-tools", name: "我的工具" }
        ]
      })
    );

    expect(imported.customCategories?.find((category) => category.id === "custom-add")?.name).toBe("自定义添加");
    expect(imported.customCategories?.find((category) => category.id === "custom-add")?.hidden).not.toBe(true);
    expect(imported.customCategories?.find((category) => category.id === "user-tools")?.name).toBe("我的工具");
  });
});
