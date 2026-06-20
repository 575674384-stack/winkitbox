import { describe, expect, it } from "vitest";
import type { Tool } from "./catalog";
import {
  createToolSourceHealthDescriptors,
  getToolUpdateStrategyDescription,
  getToolUpdateStrategyLabel,
  summarizeToolSourceHealth,
} from "./toolSourceHealth";

const baseTool: Tool = {
  id: "tool",
  name: "Tool",
  category: "custom-add",
  summary: "Tool",
  description: "Tool",
  source: "custom",
  license: "Custom",
  homepage: "https://example.com",
  tags: [],
  risk: "medium",
};

describe("tool source health helpers", () => {
  it("creates health descriptors for winget, release, direct, local, and collection tools", () => {
    const descriptors = createToolSourceHealthDescriptors([
      { ...baseTool, id: "winget", name: "Winget", source: "winget", wingetId: "Example.Tool" },
      {
        ...baseTool,
        id: "release",
        name: "Release",
        portable: {
          releaseApiUrl: "https://api.github.com/repos/owner/repo/releases/latest",
          assetPattern: "win\\.zip$",
          targetDirName: "release",
          executable: "app.exe",
          sha256: "abc123",
        },
      },
      {
        ...baseTool,
        id: "direct",
        name: "Direct",
        installer: {
          downloadUrl: "https://example.com/setup.exe",
          targetDirName: "direct",
          fileName: "setup.exe",
        },
      },
      {
        ...baseTool,
        id: "local",
        name: "Local",
        localSource: { kind: "launcher", path: "D:\\Tools\\app.exe" },
      },
      { ...baseTool, id: "collect", name: "Collect", collectionOnly: true },
    ]);

    expect(descriptors.map((item) => [item.id, item.kind])).toEqual([
      ["winget", "winget"],
      ["release", "github-release"],
      ["direct", "direct-download"],
      ["local", "local"],
      ["collect", "collection"],
    ]);
    expect(descriptors.find((item) => item.id === "release")?.checksum).toBe("abc123");
  });

  it("labels update strategies with user-facing descriptions", () => {
    expect(getToolUpdateStrategyLabel("winget")).toBe("winget 精确更新");
    expect(getToolUpdateStrategyDescription("reinstall")).toContain("重新从配置来源安装");
  });

  it("summarizes source health status counts", () => {
    const summary = summarizeToolSourceHealth([
      { toolId: "a", name: "A", kind: "winget", status: "healthy", message: "ok" },
      { toolId: "b", name: "B", kind: "direct-download", status: "broken", message: "404" },
      { toolId: "c", name: "C", kind: "collection", status: "skipped", message: "skip" },
      { toolId: "d", name: "D", kind: "manual", status: "unknown", message: "unknown" },
      { toolId: "e", name: "E", kind: "github-release", status: "warning", message: "no checksum" },
    ]);

    expect(summary).toEqual({
      total: 5,
      healthy: 1,
      warning: 1,
      broken: 1,
      skipped: 1,
      unknown: 1,
    });
  });
});
