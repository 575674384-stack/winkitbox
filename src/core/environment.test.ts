import { describe, expect, it } from "vitest";
import {
  createEnvironmentChecks,
  createEnvironmentHealthSummary,
  getRecommendedEnvironmentRepairs,
} from "./environment";

describe("environment checks", () => {
  it("marks common Windows setup dependencies as healthy when available", () => {
    const checks = createEnvironmentChecks({
      wingetAvailable: true,
      wingetVersion: "v1.9.25200",
      powershellVersion: "5.1.19041.1",
      dotnetRuntimes: [
        "Microsoft.NETCore.App 8.0.6 [C:\\Program Files\\dotnet\\shared\\Microsoft.NETCore.App]",
        "Microsoft.WindowsDesktop.App 8.0.6 [C:\\Program Files\\dotnet\\shared\\Microsoft.WindowsDesktop.App]",
      ],
      vcredistInstalled: true,
      webView2Installed: true,
      longPathsEnabled: true,
      utf8BetaEnabled: true,
      appInstallerAvailable: true,
      appInstallerVersion: "1.21.0.0",
      uiXamlInstalled: true,
      uiXamlPackages: ["Microsoft.UI.Xaml.2.8"],
      pwshAvailable: true,
      pwshVersion: "7.4.2",
    });

    expect(checks.map((check) => [check.id, check.status])).toEqual([
      ["winget", "ok"],
      ["powershell", "ok"],
      ["dotnet", "ok"],
      ["vcredist", "ok"],
      ["webview2", "ok"],
      ["long-paths", "ok"],
      ["utf8", "ok"],
      ["app-installer", "ok"],
      ["ui-xaml", "ok"],
      ["pwsh", "ok"],
    ]);

    expect(checks.find((check) => check.id === "dotnet")?.detail).toBe(
      "已检测到 8.0.6"
    );
    expect(checks.find((check) => check.id === "dotnet")?.impact).toContain(
      "WPF/WinForms 桌面工具启动",
    );
  });

  it("surfaces actionable warnings for missing optional runtime support", () => {
    const checks = createEnvironmentChecks({
      wingetAvailable: false,
      powershellVersion: "",
      dotnetRuntimes: [],
      vcredistInstalled: false,
      webView2Installed: false,
      longPathsEnabled: false,
      utf8BetaEnabled: false,
      appInstallerAvailable: false,
      uiXamlInstalled: false,
    });

    expect(checks.find((check) => check.id === "winget")?.status).toBe("danger");
    expect(checks.find((check) => check.id === "dotnet")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "vcredist")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "webview2")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "long-paths")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "utf8")?.action).toBe("可在本页一键切换");
    expect(checks.find((check) => check.id === "app-installer")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "ui-xaml")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "pwsh")?.status).toBe("warning");
  });

  it("attaches repair actions to missing dependencies without making UTF-8 a default fix", () => {
    const checks = createEnvironmentChecks({
      wingetAvailable: true,
      powershellVersion: "5.1.19041.1",
      dotnetRuntimes: [],
      vcredistInstalled: false,
      webView2Installed: false,
      longPathsEnabled: false,
      utf8BetaEnabled: false,
      appInstallerAvailable: true,
      uiXamlInstalled: false,
      pwshAvailable: true,
      pwshVersion: "7.4.2",
    });

    expect(checks.find((check) => check.id === "dotnet")?.repair?.command).toContain(
      "Microsoft.DotNet.DesktopRuntime.8",
    );
    expect(checks.find((check) => check.id === "vcredist")?.repair?.command).toContain(
      "Microsoft.VCRedist.2015+.x64",
    );
    expect(checks.find((check) => check.id === "webview2")?.repair?.command).toContain(
      "Microsoft.EdgeWebView2Runtime",
    );

    const recommended = getRecommendedEnvironmentRepairs(checks).map(
      (action) => action.checkId,
    );

    expect(recommended).toEqual(["dotnet", "vcredist", "webview2", "long-paths", "ui-xaml"]);
  });

  it("marks winget-dependent repairs as unavailable when winget is missing", () => {
    const checks = createEnvironmentChecks({
      wingetAvailable: false,
      powershellVersion: "5.1.19041.1",
      dotnetRuntimes: [],
      vcredistInstalled: false,
      webView2Installed: false,
      longPathsEnabled: true,
      utf8BetaEnabled: true,
    });

    expect(checks.find((check) => check.id === "winget")?.repair?.kind).toBe("url");
    expect(checks.find((check) => check.id === "winget")?.impact).toContain(
      "工具安装",
    );
    expect(checks.find((check) => check.id === "dotnet")?.repair?.disabledReason).toBe(
      "需要先修复 winget。",
    );
    expect(checks.find((check) => check.id === "pwsh")?.repair?.disabledReason).toBe(
      "需要先修复 winget。",
    );
  });

  it("summarizes environment health for the UI", () => {
    const checks = createEnvironmentChecks({
      wingetAvailable: true,
      powershellVersion: "5.1.19041.1",
      dotnetRuntimes: [],
      vcredistInstalled: true,
      webView2Installed: true,
      longPathsEnabled: false,
      utf8BetaEnabled: true,
      appInstallerAvailable: true,
      uiXamlInstalled: true,
      uiXamlPackages: ["Microsoft.UI.Xaml.2.8"],
      pwshAvailable: true,
      pwshVersion: "7.4.2",
    });

    expect(createEnvironmentHealthSummary(checks)).toMatchObject({
      total: 10,
      ok: 8,
      warning: 2,
      danger: 0,
      recommendedRepairCount: 2,
    });
  });

  it("does not treat ASP.NET or base .NET runtimes as Desktop Runtime", () => {
    const checks = createEnvironmentChecks({
      wingetAvailable: true,
      powershellVersion: "5.1.19041.1",
      dotnetRuntimes: [
        "Microsoft.AspNetCore.App 8.0.27 [C:\\Program Files\\dotnet\\shared\\Microsoft.AspNetCore.App]",
        "Microsoft.NETCore.App 5.0.17 [C:\\Program Files\\dotnet\\shared\\Microsoft.NETCore.App]",
      ],
      vcredistInstalled: true,
      webView2Installed: true,
      longPathsEnabled: true,
      utf8BetaEnabled: true,
      appInstallerAvailable: true,
      uiXamlInstalled: true,
      uiXamlPackages: ["Microsoft.UI.Xaml.2.8"],
    });

    const dotnetCheck = checks.find((check) => check.id === "dotnet");

    expect(dotnetCheck?.status).toBe("warning");
    expect(dotnetCheck?.detail).toBe(
      "未检测到 Windows Desktop Runtime，部分桌面工具可能无法启动。"
    );
  });

  it("warns when App Installer or UI.Xaml framework is missing", () => {
    const checks = createEnvironmentChecks({
      wingetAvailable: true,
      powershellVersion: "5.1.19041.1",
      dotnetRuntimes: [],
      vcredistInstalled: true,
      webView2Installed: true,
      longPathsEnabled: true,
      utf8BetaEnabled: true,
      appInstallerAvailable: false,
      uiXamlInstalled: false,
    });

    const appInstallerCheck = checks.find((check) => check.id === "app-installer");
    const uiXamlCheck = checks.find((check) => check.id === "ui-xaml");

    expect(appInstallerCheck?.status).toBe("warning");
    expect(appInstallerCheck?.repair?.kind).toBe("url");
    expect(uiXamlCheck?.status).toBe("warning");
    expect(uiXamlCheck?.repair?.command).toContain("Microsoft.UI.Xaml.2.8");
  });

  it("uses explicit Desktop Runtime readings from the system snapshot", () => {
    const checks = createEnvironmentChecks({
      wingetAvailable: true,
      powershellVersion: "5.1.19041.1",
      dotnetRuntimes: ["Microsoft.NETCore.App 8.0.6"],
      dotnetDesktopRuntimes: [
        "Microsoft.WindowsDesktop.App 8.0.6 [C:\\Program Files\\dotnet\\shared\\Microsoft.WindowsDesktop.App]",
        "Microsoft.WindowsDesktop.App 9.0.1 [C:\\Program Files\\dotnet\\shared\\Microsoft.WindowsDesktop.App]",
      ],
      vcredistInstalled: true,
      webView2Installed: true,
      longPathsEnabled: true,
      utf8BetaEnabled: true,
      appInstallerAvailable: true,
      uiXamlInstalled: true,
      uiXamlPackages: ["Microsoft.UI.Xaml.2.8"],
    });

    const dotnetCheck = checks.find((check) => check.id === "dotnet");

    expect(dotnetCheck?.status).toBe("ok");
    expect(dotnetCheck?.detail).toBe("已检测到 8.0.6、9.0.1");
  });
});
