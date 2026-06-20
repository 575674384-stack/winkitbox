import { describe, expect, it } from "vitest";
import { buildExportConfig, createCustomTool, normalizeStoredCustomTools, parseImportedConfig } from "./config";

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

  it("creates collection-only local launcher tools", () => {
    const tool = createCustomTool(
      {
        mode: "collect",
        name: "Local Editor",
        category: "custom-add",
        homepage: "",
        localPath: "D:\\Tools\\LocalEditor\\editor.exe"
      },
      new Set()
    );

    expect(tool.collectionOnly).toBe(true);
    expect(tool.customInstallCommand).toBeUndefined();
    expect(tool.launch?.commands).toEqual(["D:\\Tools\\LocalEditor\\editor.exe"]);
    expect(tool.localSource).toEqual({
      kind: "launcher",
      path: "D:\\Tools\\LocalEditor\\editor.exe"
    });
  });

  it("creates local installer tools from exe or msi packages", () => {
    const tool = createCustomTool(
      {
        mode: "local-installer",
        name: "Local Setup",
        category: "custom-add",
        homepage: "",
        localPath: "D:\\Downloads\\setup.msi",
        launchCommand: "local-setup.exe"
      },
      new Set()
    );

    expect(tool.customInstallCommand).toContain("msiexec.exe");
    expect(tool.customInstallCommand).toContain("D:\\Downloads\\setup.msi");
    expect(tool.launch?.commands).toEqual(["local-setup.exe"]);
    expect(tool.localSource?.kind).toBe("installer");
  });

  it("creates local zip portable tools that extract into the managed tool root", () => {
    const tool = createCustomTool(
      {
        mode: "local-archive",
        name: "Zip Tool",
        category: "custom-add",
        homepage: "",
        localPath: "D:\\Downloads\\zip-tool.zip",
        archiveExecutable: "ZipTool\\ZipTool.exe"
      },
      new Set()
    );

    expect(tool.customInstallCommand).toContain("Expand-Archive");
    expect(tool.customInstallCommand).toContain("zip-tool.zip");
    expect(tool.customInstallCommand).toContain("ZipTool\\ZipTool.exe");
    expect(tool.launch?.commands?.[0]).toContain("%LOCALAPPDATA%\\WinKitBox");
    expect(tool.localSource).toEqual({
      kind: "archive",
      path: "D:\\Downloads\\zip-tool.zip",
      executable: "ZipTool\\ZipTool.exe"
    });
  });

  it("keeps exported configs under the lightweight 1MB contract", () => {
    const payload = buildExportConfig({
      version: 1,
      exportedAt: "2026-06-16T00:00:00.000Z",
      settings: {
        toolRootPath: "%LOCALAPPDATA%\\WinKitBox",
        updateOnStartup: true,
        themeId: "azure",
        proxyMode: "manual",
        proxyManual: "http://127.0.0.1:7890"
      },
      selectedToolIds: ["powertoys"],
      customTools: []
    });

    expect(payload.length).toBeLessThan(1024 * 1024);
    const imported = parseImportedConfig(payload);
    expect(imported.selectedToolIds).toEqual(["powertoys"]);
    expect(imported.settings.themeId).toBe("azure");
    expect(imported.settings.proxyMode).toBe("manual");
    expect(imported.settings.proxyManual).toBe("http://127.0.0.1:7890");
  });

  it("drops unknown proxy modes from imported configs", () => {
    const imported = parseImportedConfig(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-16T00:00:00.000Z",
        settings: {
          toolRootPath: "%LOCALAPPDATA%\\WinKitBox",
          updateOnStartup: true,
          proxyMode: "unknown"
        },
        selectedToolIds: [],
        customTools: []
      })
    );

    expect(imported.settings.proxyMode).toBeUndefined();
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

  it("removes stale WeType AI repair overrides from stored custom tools", () => {
    const tools = normalizeStoredCustomTools([
      {
        id: "wechat-input",
        name: "微信输入法",
        category: "ime",
        summary: "微信输入法",
        description: "旧 AI 修复项",
        source: "github",
        license: "Freeware",
        homepage: "https://z.weixin.qq.com/",
        installer: {
          downloadUrl: "https://dldir1v6.qq.com/weixin/Universal/WeType/WeType_Setup.exe",
          targetDirName: "wechat-input",
          fileName: "WeType_Setup.exe"
        },
        tags: ["输入法"],
        risk: "medium"
      },
      {
        id: "custom-tool",
        name: "自定义工具",
        category: "custom-add",
        summary: "自定义工具",
        description: "保留",
        source: "custom",
        license: "Custom",
        homepage: "https://example.com",
        customInstallCommand: "echo ok",
        tags: ["自定义"],
        risk: "medium"
      }
    ]);

    expect(tools.map((tool) => tool.id)).toEqual(["custom-tool"]);
  });
});
