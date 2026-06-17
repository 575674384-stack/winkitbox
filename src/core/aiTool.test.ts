import { describe, expect, it } from "vitest";
import { createAiGeneratedTool } from "./aiTool";

const context = {
  owner: "example",
  repo: "ExampleApp",
  htmlUrl: "https://github.com/example/ExampleApp",
  releaseApiUrl: "https://api.github.com/repos/example/ExampleApp/releases/latest",
  stars: 1234,
  license: "MIT"
};

describe("aiTool", () => {
  it("creates a directly installable winget tool from AI output", () => {
    const tool = createAiGeneratedTool(
      {
        name: "Example App",
        category: "starter",
        install: {
          type: "winget",
          wingetId: "Example.App"
        }
      },
      context,
      new Set()
    );

    expect(tool.id).toBe("ai-example-app");
    expect(tool.source).toBe("winget");
    expect(tool.wingetId).toBe("Example.App");
    expect(tool.repoUrl).toBe(context.htmlUrl);
  });

  it("rejects GitHub installer output without an asset pattern", () => {
    expect(() =>
      createAiGeneratedTool(
        {
          name: "Example App",
          install: {
            type: "installer"
          }
        },
        context,
        new Set()
      )
    ).toThrow("资产匹配规则");
  });

  it("creates a non-GitHub direct installer tool from AI output", () => {
    const tool = createAiGeneratedTool(
      {
        name: "Website App",
        category: "custom-add",
        install: {
          type: "installer",
          downloadUrl: "https://example.com/app-setup.exe",
          fileName: "WebsiteAppSetup.exe"
        }
      },
      {
        htmlUrl: "https://example.com/download",
        releaseApiUrl: "",
        license: "Freeware"
      },
      new Set()
    );

    expect(tool.category).toBe("custom-add");
    expect(tool.source).toBe("website");
    expect(tool.installer?.downloadUrl).toBe("https://example.com/app-setup.exe");
    expect(tool.repoUrl).toBeUndefined();
  });

  it("keeps user-defined categories on generated tools", () => {
    const tool = createAiGeneratedTool(
      {
        name: "Category App",
        category: "user-tools",
        install: {
          type: "winget",
          wingetId: "Example.CategoryApp"
        }
      },
      context,
      new Set()
    );

    expect(tool.category).toBe("user-tools");
  });
});
