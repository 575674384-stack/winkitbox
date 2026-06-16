import { describe, expect, it } from "vitest";
import { createRunEventLine, parseRunEventLine } from "./runEvents";

describe("run events", () => {
  it("serializes and parses install progress events", () => {
    const line = createRunEventLine({ type: "install-start", toolId: "files", label: "Files" });

    expect(parseRunEventLine(line)).toEqual({
      type: "install-start",
      toolId: "files",
      label: "Files"
    });
  });

  it("serializes and parses uninstall progress events", () => {
    const line = createRunEventLine({ type: "uninstall-start", toolId: "geek", label: "Geek Uninstaller" });

    expect(parseRunEventLine(line)).toEqual({
      type: "uninstall-start",
      toolId: "geek",
      label: "Geek Uninstaller"
    });
  });

  it("ignores normal command output", () => {
    expect(parseRunEventLine("Windows Terminal installed successfully.")).toBeUndefined();
  });
});
