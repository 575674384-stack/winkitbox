import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { LaunchDescriptor } from "./launcher";

const require = createRequire(import.meta.url);
const { buildDetectToolsScript } = require("../../electron/windowsTools.cjs") as {
  buildDetectToolsScript: (descriptors: LaunchDescriptor[], options?: { fixtureMode?: boolean }) => string;
};

describe("windows tool detection script", () => {
  it("keeps every descriptor as a separate tool in PowerShell", () => {
    const descriptors: LaunchDescriptor[] = [
      {
        toolId: "files",
        label: "Files",
        wingetId: "FilesCommunity.Files",
        appUserModelIds: ["Files_1y0xx7n9077q4!App"],
        startMenuNames: ["Files"],
        commands: [],
        homepage: "https://files.community/"
      },
      {
        toolId: "terminal",
        label: "Windows Terminal",
        wingetId: "Microsoft.WindowsTerminal",
        appUserModelIds: [],
        startMenuNames: ["Windows Terminal", "终端"],
        commands: ["wt.exe"],
        homepage: "https://github.com/microsoft/terminal"
      }
    ];

    const script = `${buildDetectToolsScript(descriptors, { fixtureMode: true })}
$tools | ForEach-Object { [string]$_.toolId } | ConvertTo-Json -Compress
`;

    const result = spawnSync("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script
    ], {
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual(["files", "terminal"]);
  });

  it("detects portable launchers through expanded environment paths", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "winkitbox-portable-"));
    const fixtureDir = path.join(tempRoot, "WinKitBox", "test-fixture");
    const fixtureExe = path.join(fixtureDir, "geek.exe");
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(fixtureExe, "");

    const descriptors: LaunchDescriptor[] = [
      {
        toolId: "geek",
        label: "Geek Uninstaller",
        appUserModelIds: [],
        startMenuNames: ["Geek Uninstaller", "Geek"],
        commands: ["%LOCALAPPDATA%\\WinKitBox\\test-fixture\\geek.exe"],
        homepage: "https://geekuninstaller.com/download"
      }
    ];

    try {
      const result = spawnSync("powershell.exe", [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        buildDetectToolsScript(descriptors)
      ], {
        encoding: "utf8",
        env: {
          ...process.env,
          LOCALAPPDATA: tempRoot
        }
      });

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toMatchObject({
        toolId: "geek",
        installed: true,
        launcherFound: true,
        launcherType: "command"
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
