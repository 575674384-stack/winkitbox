/// <reference types="node" />

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Tool } from "./catalog";
import { buildToolUpdateCommand, getToolUpdateStrategy } from "./toolUpdates";

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

describe("tool update helpers", () => {
  it("uses winget upgrade for winget-backed tools", () => {
    const tool: Tool = {
      ...baseTool,
      source: "winget",
      wingetId: "Example.Tool",
    };

    expect(getToolUpdateStrategy(tool)).toBe("winget");
    expect(buildToolUpdateCommand(tool).command).toBe(
      "winget upgrade --id Example.Tool --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity --silent"
    );
  });

  it("keeps winget detection read-only and separate from updates", () => {
    const mainSource = readFileSync("electron/main.cjs", "utf8");
    const checkFunction = mainSource.match(
      /async function checkWingetToolUpdate[\s\S]*?async function checkReleaseToolUpdate/
    )?.[0];

    expect(checkFunction).toContain("winget list --id");
    expect(checkFunction).toContain("winget show --id");
    expect(checkFunction).not.toMatch(/winget\s+upgrade\s+--id/);
    expect(checkFunction).not.toMatch(/\$[^\n]*winget[^\n]*--what-if/);
  });

  it("uses reinstall refresh for portable or installer tools", () => {
    const tool: Tool = {
      ...baseTool,
      portable: {
        downloadUrl: "https://example.com/tool.zip",
        targetDirName: "tool",
        archive: "zip",
        executable: "tool.exe",
      },
    };

    expect(getToolUpdateStrategy(tool)).toBe("reinstall");
    expect(buildToolUpdateCommand(tool).command).toContain("Invoke-WebRequest");
  });

  it("skips collection-only tools", () => {
    const tool: Tool = {
      ...baseTool,
      collectionOnly: true,
    };

    expect(getToolUpdateStrategy(tool)).toBe("none");
    expect(buildToolUpdateCommand(tool).skipReason).toBe("只收纳到工具箱，不由 WinKitBox 更新。");
  });
});
