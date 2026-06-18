import { describe, expect, it } from "vitest";
import { tools } from "./catalog";
import {
  buildInstallCommand,
  buildPowerShellScript,
  buildUninstallCommand,
  buildUninstallPowerShellScript,
  createInstallPlan,
  createUninstallPlan,
  getDefaultSelection,
  searchTools
} from "./planner";

describe("planner", () => {
  it("builds winget commands with id, winget source, agreement and silent flags", () => {
    const powertoys = tools.find((tool) => tool.id === "powertoys");

    expect(powertoys).toBeDefined();
    expect(buildInstallCommand(powertoys!).command).toBe(
      "winget install --id Microsoft.PowerToys --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity --silent"
    );
  });

  it("builds portable download commands for bundled portable tools", () => {
    const geek = tools.find((tool) => tool.id === "geek");
    const command = buildInstallCommand(geek!);

    expect(geek).toBeDefined();
    expect(command.command).toContain("https://geekuninstaller.com/geek.zip");
    expect(command.command).toContain("$managedRoot = Join-Path $env:LOCALAPPDATA 'WinKitBox'");
    expect(command.command).toContain("$toolRoot = Join-Path $managedRoot 'tools'");
    expect(command.command).toContain("$targetDir = Join-Path $toolRoot 'geek'");
    expect(command.command).toContain("Expand-Archive");
    expect(command.command).toContain("geek.exe");
    expect(command.manualUrl).toBeUndefined();
  });

  it("builds portable install commands with a custom managed root", () => {
    const geek = tools.find((tool) => tool.id === "geek");
    const command = buildInstallCommand(geek!, { managedRootPath: "D:\\WinKitBoxTools" });

    expect(command.command).toContain("$managedRoot = [Environment]::ExpandEnvironmentVariables('D:\\WinKitBoxTools')");
    expect(command.command).toContain("$toolRoot = Join-Path $managedRoot 'tools'");
    expect(command.command).toContain("$targetDir = Join-Path $toolRoot 'geek'");
  });

  it("builds release asset commands for GitHub portable tools", () => {
    const zyperwin = tools.find((tool) => tool.id === "zyperwin");
    const command = buildInstallCommand(zyperwin!);

    expect(zyperwin).toBeDefined();
    expect(command.command).toContain("https://api.github.com/repos/ZyperWave/ZyperWinOptimize/releases/latest");
    expect(command.command).toContain("^ZyperWin\\+\\+.*\\.zip$");
    expect(command.command).toContain("$targetDir = Join-Path $toolRoot 'zyperwin'");
    expect(command.command).toContain("Release\\ZyperWin++.exe");
    expect(command.manualUrl).toBeUndefined();
  });

  it("builds 7z portable commands with a managed extractor", () => {
    const fenceless = tools.find((tool) => tool.id === "fenceless");
    const command = buildInstallCommand(fenceless!);

    expect(fenceless).toBeDefined();
    expect(command.command).toContain("https://codeberg.org/api/v1/repos/Wavestorm/Fenceless/releases");
    expect(command.command).toContain("Fenceless-.*-win-x64\\.7z$");
    expect(command.command).toContain("https://www.7-zip.org/a/7zr.exe");
    expect(command.command).toContain("win-x64\\Fenceless.exe");
    expect(command.manualUrl).toBeUndefined();
  });

  it("builds direct installer commands for packaged installer tools", () => {
    const coodesker = tools.find((tool) => tool.id === "coodesker");
    const command = buildInstallCommand(coodesker!);

    expect(coodesker).toBeDefined();
    expect(command.command).toContain("https://api.github.com/repos/coodesker/coodesker-desktop/releases/latest");
    expect(command.command).toContain("^Coodesker-x64_.*\\.exe$");
    expect(command.command).toContain("$installerRoot = Join-Path $managedRoot 'installers'");
    expect(command.command).toContain("Start-Process -FilePath $installerPath -Wait");
    expect(command.manualUrl).toBeUndefined();
  });

  it("keeps every catalog item directly installable instead of using web-only manual steps", () => {
    for (const tool of tools) {
      const command = buildInstallCommand(tool);

      expect(command.command, `${tool.id} should be directly installable`).toBeDefined();
      expect(command.manualUrl, `${tool.id} should not be a web-only install step`).toBeUndefined();
    }
  });

  it("builds winget uninstall commands with id and silent flag", () => {
    const terminal = tools.find((tool) => tool.id === "terminal");
    const command = buildUninstallCommand(terminal!);

    expect(command.command).toBe(
      "winget uninstall --id Microsoft.WindowsTerminal --source winget --disable-interactivity --accept-source-agreements --silent"
    );
  });

  it("uses purge and force fallbacks when uninstalling Czkawka", () => {
    const czkawka = tools.find((tool) => tool.id === "czkawka");
    const command = buildUninstallCommand(czkawka!);

    expect(command.command).toContain("qarmin.czkawka.gui");
    expect(command.command).toContain("--force");
    expect(command.command).toContain("--purge");
    expect(command.command).toContain("qarmin.czkawka");
  });

  it("builds managed portable removal commands for portable tools", () => {
    const geek = tools.find((tool) => tool.id === "geek");
    const command = buildUninstallCommand(geek!);

    expect(command.command).toContain("$managedRoot = Join-Path $env:LOCALAPPDATA 'WinKitBox'");
    expect(command.command).toContain("$toolRoot = Join-Path $managedRoot 'tools'");
    expect(command.command).toContain("$targetDir = Join-Path $toolRoot 'geek'");
    expect(command.command).toContain("Remove-Item -LiteralPath $targetDir -Recurse -Force");
  });

  it("builds managed portable removal commands with a custom managed root", () => {
    const geek = tools.find((tool) => tool.id === "geek");
    const command = buildUninstallCommand(geek!, { managedRootPath: "D:\\WinKitBoxTools" });

    expect(command.command).toContain("$managedRoot = [Environment]::ExpandEnvironmentVariables('D:\\WinKitBoxTools')");
    expect(command.command).toContain("$toolRoot = Join-Path $managedRoot 'tools'");
  });

  it("builds registry uninstall commands for installer tools", () => {
    const coodesker = tools.find((tool) => tool.id === "coodesker");
    const command = buildUninstallCommand(coodesker!);

    expect(command.command).toContain("Find-WinKitBoxUninstallEntry");
    expect(command.command).toContain("'Coodesker'");
    expect(command.command).toContain("'酷呆桌面'");
    expect(command.command).toContain("cmd.exe");
  });

  it("keeps every catalog item directly uninstallable", () => {
    for (const tool of tools) {
      const command = buildUninstallCommand(tool);

      expect(command.command, `${tool.id} should be directly uninstallable`).toBeDefined();
      expect(command.manualUrl, `${tool.id} should not need web-only uninstall steps`).toBeUndefined();
    }
  });

  it("creates install plan counters from selected tools", () => {
    const plan = createInstallPlan(tools, new Set(["powertoys", "geek", "bleachbit"]));

    expect(plan.readyCount).toBe(3);
    expect(plan.manualCount).toBe(0);
    expect(plan.adminCount).toBe(1);
    expect(plan.highRiskCount).toBe(1);
  });

  it("skips collection-only tools in install plans", () => {
    const plan = createInstallPlan(
      [
        {
          id: "custom-local-editor",
          name: "Local Editor",
          category: "custom-add",
          summary: "本地程序",
          description: "只收纳到工具箱，不由 WinKitBox 安装。",
          source: "custom",
          license: "Local",
          homepage: "https://example.com",
          collectionOnly: true,
          launch: {
            commands: ["D:\\Tools\\LocalEditor\\editor.exe"]
          },
          tags: ["自定义", "本地"],
          risk: "low"
        }
      ],
      new Set(["custom-local-editor"])
    );

    expect(plan.readyCount).toBe(0);
    expect(plan.skippedCount).toBe(1);
    expect(plan.commands[0].skipReason).toBe("只收纳到工具箱，不执行安装。");
    expect(buildPowerShellScript(plan)).toContain("[skip] Local Editor: 只收纳到工具箱，不执行安装。");
  });

  it("renders a powershell script with install steps for portable tools", () => {
    const plan = createInstallPlan(tools, new Set(["powertoys", "geek"]));
    const script = buildPowerShellScript(plan);

    expect(script).toContain('WINKITBOX_EVENT {"type":"plan-start","total":2}');
    expect(script).toContain('WINKITBOX_EVENT {"type":"install-start","toolId":"powertoys","label":"PowerToys"}');
    expect(script).toContain('WINKITBOX_EVENT {"type":"install-success","toolId":"powertoys","label":"PowerToys"}');
    expect(script).toContain('WINKITBOX_EVENT {"type":"install-start","toolId":"geek","label":"Geek Uninstaller"}');
    expect(script).toContain('WINKITBOX_EVENT {"type":"install-success","toolId":"geek","label":"Geek Uninstaller"}');
    expect(script).toContain("Write-Host '[install] PowerToys'");
    expect(script).toContain("Write-Host '[install] Geek Uninstaller'");
    expect(script).toContain("winget install --id Microsoft.PowerToys --source winget");
    expect(script).toContain("https://geekuninstaller.com/geek.zip");
  });

  it("renders a powershell script with uninstall progress events", () => {
    const plan = createUninstallPlan(tools, new Set(["terminal", "geek"]));
    const script = buildUninstallPowerShellScript(plan);

    expect(script).toContain('WINKITBOX_EVENT {"type":"plan-start","total":2,"action":"uninstall"}');
    expect(script).toContain('WINKITBOX_EVENT {"type":"uninstall-start","toolId":"terminal","label":"Windows Terminal"}');
    expect(script).toContain('WINKITBOX_EVENT {"type":"uninstall-success","toolId":"terminal","label":"Windows Terminal"}');
    expect(script).toContain('WINKITBOX_EVENT {"type":"uninstall-start","toolId":"geek","label":"Geek Uninstaller"}');
    expect(script).toContain("Write-Host '[uninstall] Geek Uninstaller'");
  });

  it("stops the powershell plan when an installer returns a non-zero exit code", () => {
    const plan = createInstallPlan(tools, new Set(["terminal"]));
    const script = buildPowerShellScript(plan);

    expect(script).toContain("$ErrorActionPreference = 'Stop'");
    expect(script).toContain("if ($LASTEXITCODE -ne 0)");
    expect(script).toContain('WINKITBOX_EVENT {"type":"install-failed","toolId":"terminal","label":"Windows Terminal"}');
    expect(script).toContain("throw 'WinKitBox install failed: Windows Terminal'");
  });

  it("searches by name, tag, and description text", () => {
    expect(searchTools(tools, "桌面整理").map((tool) => tool.id)).toEqual(
      expect.arrayContaining(["portals", "fenceless", "coodesker"])
    );
    expect(searchTools(tools, "输入法").map((tool) => tool.id)).toEqual(
      expect.arrayContaining(["wechat-input", "rime-weasel", "pime"])
    );
  });

  it("returns an empty default selection", () => {
    const selected = getDefaultSelection(tools);

    expect(selected.size).toBe(0);
  });
});
