import { describe, expect, it } from "vitest";
import { tools } from "./catalog";
import { createLaunchDescriptor, getToolLogoUrl } from "./launcher";

describe("launcher", () => {
  it("uses explicit launch commands when a tool has them", () => {
    const terminal = tools.find((tool) => tool.id === "terminal");

    expect(terminal).toBeDefined();
    expect(createLaunchDescriptor(terminal!)).toMatchObject({
      toolId: "terminal",
      wingetId: "Microsoft.WindowsTerminal",
      startMenuNames: ["Windows Terminal", "终端"],
      commands: ["wt.exe"]
    });
  });

  it("carries packaged app launch ids for Windows app entries", () => {
    const files = tools.find((tool) => tool.id === "files");

    expect(files).toBeDefined();
    expect(createLaunchDescriptor(files!)).toMatchObject({
      toolId: "files",
      wingetId: "FilesCommunity.Files",
      appUserModelIds: ["Files_1y0xx7n9077q4!App"]
    });
  });

  it("adds portable managed paths for portable tools", () => {
    const geek = tools.find((tool) => tool.id === "geek");

    expect(geek).toBeDefined();
    const descriptor = createLaunchDescriptor(geek!);

    expect(descriptor.toolId).toBe("geek");
    expect(descriptor.commands[0]).toBe("%LOCALAPPDATA%\\WinKitBox\\tools\\geek\\geek.exe");
    expect(descriptor.commands).toContain("geek.exe");
  });

  it("uses a custom managed root for portable launch paths", () => {
    const geek = tools.find((tool) => tool.id === "geek");

    expect(geek).toBeDefined();
    const descriptor = createLaunchDescriptor(geek!, { managedRootPath: "D:\\WinKitBoxTools" });

    expect(descriptor.commands[0]).toBe("D:\\WinKitBoxTools\\tools\\geek\\geek.exe");
  });

  it("adds nested portable managed paths when the executable lives inside the archive", () => {
    const fenceless = tools.find((tool) => tool.id === "fenceless");

    expect(fenceless).toBeDefined();
    const descriptor = createLaunchDescriptor(fenceless!);

    expect(descriptor.toolId).toBe("fenceless");
    expect(descriptor.commands[0]).toBe("%LOCALAPPDATA%\\WinKitBox\\tools\\fenceless\\win-x64\\Fenceless.exe");
    expect(descriptor.commands).toContain("Fenceless.exe");
  });

  it("falls back to the tool name for start menu lookup", () => {
    const tool = {
      ...tools.find((item) => item.id === "fenceless")!,
      launch: undefined
    };

    expect(createLaunchDescriptor(tool).startMenuNames).toEqual(["Fenceless"]);
  });

  it("uses explicit logos before favicon fallback", () => {
    const powertoys = tools.find((tool) => tool.id === "powertoys");
    const localsend = tools.find((tool) => tool.id === "localsend");

    expect(getToolLogoUrl(powertoys!)).toContain("2020%20PowerToys%20Icon.svg");
    expect(getToolLogoUrl(localsend!)).toBe("https://icons.duckduckgo.com/ip3/localsend.org.ico");
  });

  it("uses GitHub owner avatars for GitHub-only projects", () => {
    const pai = tools.find((tool) => tool.id === "p-ai");

    expect(getToolLogoUrl(pai!)).toBe("https://github.com/kawayiYokami.png?size=64");
  });
});
