import { describe, expect, it } from "vitest";
import {
  createDefaultAddToolDraft,
  describeAddToolDraft,
  getAddToolModeLabel,
  inferAddToolDraftFromLocalPath,
  updateAddToolDraftFromSourceUrl,
} from "./addToolDraft";
import { customAddCategoryId } from "./catalog";

describe("add tool draft", () => {
  it("infers simple local launchers as collection-only tools", () => {
    const draft = inferAddToolDraftFromLocalPath("C:\\Tools\\LocalSend.exe");

    expect(draft).toMatchObject({
      mode: "collect",
      name: "LocalSend",
      localPath: "C:\\Tools\\LocalSend.exe",
      launchCommand: "C:\\Tools\\LocalSend.exe",
    });
    expect(describeAddToolDraft(draft)).toContain("直接收纳");
  });

  it("infers MSI and ZIP packages as installable local sources", () => {
    expect(inferAddToolDraftFromLocalPath("D:\\Downloads\\PowerToys.msi")).toMatchObject({
      mode: "local-installer",
      name: "PowerToys",
      launchCommand: "",
    });
    expect(inferAddToolDraftFromLocalPath("D:\\Downloads\\toolkit.zip")).toMatchObject({
      mode: "local-archive",
      name: "toolkit",
      archiveExecutable: "",
    });
  });

  it("keeps link-add drafts separate from AI settings and defaults to custom category", () => {
    const draft = createDefaultAddToolDraft();
    const next = updateAddToolDraftFromSourceUrl(
      draft,
      "https://github.com/microsoft/PowerToys",
    );

    expect(next).toMatchObject({
      mode: "collect",
      categoryId: customAddCategoryId,
      sourceUrl: "https://github.com/microsoft/PowerToys",
      homepage: "https://github.com/microsoft/PowerToys",
      name: "PowerToys",
    });
    expect(getAddToolModeLabel("local-archive")).toBe("ZIP 便携包");
  });
});
