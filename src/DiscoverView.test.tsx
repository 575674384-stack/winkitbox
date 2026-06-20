import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscoverView } from "./DiscoverView";
import { customAddCategoryId, type CategoryDefinition } from "./core/catalog";

const categories: CategoryDefinition[] = [
  {
    id: customAddCategoryId,
    name: "自定义添加",
    builtin: true,
    protected: true,
  },
];

function createGithubPayload() {
  return {
    items: [
      {
        full_name: "owner/windows-tool",
        name: "windows-tool",
        html_url: "https://github.com/owner/windows-tool",
        description: "Windows desktop app",
        language: "TypeScript",
        stargazers_count: 1200,
        forks_count: 20,
        owner: {
          login: "owner",
          avatar_url: "https://github.com/owner.png",
        },
        license: {
          spdx_id: "MIT",
        },
        topics: ["windows", "desktop"],
      },
    ],
  };
}

async function renderDiscoverView() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
  });
  vi.stubGlobal("winKitBox", {
    fetchGitHub: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: JSON.stringify(createGithubPayload()),
      headers: {},
    }),
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onAddRepoWithAi = vi.fn().mockResolvedValue(undefined);

  await act(async () => {
    root.render(
      <DiscoverView
        categories={categories}
        defaultCategoryId={customAddCategoryId}
        proxyMode="direct"
        proxyManual=""
        onAddRepoWithAi={onAddRepoWithAi}
        onRecommendReposWithAi={vi.fn().mockResolvedValue([])}
        onOpenUrl={vi.fn().mockResolvedValue(undefined)}
      />,
    );
  });

  await act(async () => {
    await Promise.resolve();
  });

  return { container, root, onAddRepoWithAi };
}

describe("DiscoverView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("shows one-click AI add without copy buttons on GitHub project cards", async () => {
    const { container, root, onAddRepoWithAi } = await renderDiscoverView();

    expect(container.textContent).toContain("owner/windows-tool");
    expect(container.textContent).toContain("AI 添加");
    expect(container.querySelector('[aria-label="复制 clone 命令"]')).toBeNull();
    expect(container.querySelector('[aria-label="复制 GitHub 链接"]')).toBeNull();

    const addButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("AI 添加"),
    );
    if (!addButton) {
      throw new Error("AI add button not found");
    }

    await act(async () => {
      addButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onAddRepoWithAi).toHaveBeenCalledWith(
      "https://github.com/owner/windows-tool",
      customAddCategoryId,
    );

    await act(async () => {
      root.unmount();
    });
  });
});
