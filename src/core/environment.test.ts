import { describe, expect, it } from "vitest";
import { createEnvironmentChecks } from "./environment";

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
      longPathsEnabled: true,
      utf8BetaEnabled: true,
    });

    expect(checks.map((check) => [check.id, check.status])).toEqual([
      ["winget", "ok"],
      ["powershell", "ok"],
      ["dotnet", "ok"],
      ["vcredist", "ok"],
      ["long-paths", "ok"],
      ["utf8", "ok"],
    ]);

    expect(checks.find((check) => check.id === "dotnet")?.detail).toBe(
      "已检测到 8.0.6"
    );
  });

  it("surfaces actionable warnings for missing optional runtime support", () => {
    const checks = createEnvironmentChecks({
      wingetAvailable: false,
      powershellVersion: "",
      dotnetRuntimes: [],
      vcredistInstalled: false,
      longPathsEnabled: false,
      utf8BetaEnabled: false,
    });

    expect(checks.find((check) => check.id === "winget")?.status).toBe("danger");
    expect(checks.find((check) => check.id === "dotnet")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "vcredist")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "long-paths")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "utf8")?.action).toBe("可在本页一键切换");
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
      longPathsEnabled: true,
      utf8BetaEnabled: true,
    });

    const dotnetCheck = checks.find((check) => check.id === "dotnet");

    expect(dotnetCheck?.status).toBe("warning");
    expect(dotnetCheck?.detail).toBe(
      "未检测到 Windows Desktop Runtime，部分桌面工具可能无法启动。"
    );
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
      longPathsEnabled: true,
      utf8BetaEnabled: true,
    });

    const dotnetCheck = checks.find((check) => check.id === "dotnet");

    expect(dotnetCheck?.status).toBe("ok");
    expect(dotnetCheck?.detail).toBe("已检测到 8.0.6、9.0.1");
  });
});
