import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddToolView } from "./AddToolView";
import { customAddCategoryId, type CategoryDefinition } from "./core/catalog";

const categories: CategoryDefinition[] = [
  {
    id: customAddCategoryId,
    name: "自定义添加",
    builtin: true,
    protected: true,
  },
];

function findButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label),
  );
  if (!button) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("AddToolView", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows page feedback after adding a manual tool", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onAddManualTool = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <AddToolView
          settings={{
            toolRootPath: "C:\\Tools",
            aiBaseUrl: "",
            aiApiKey: "",
            aiModel: "",
          }}
          categories={categories}
          allCategories={categories}
          customTools={[]}
          focus={{ nonce: 0 }}
          onAddManualTool={onAddManualTool}
          onAddAiTool={vi.fn().mockResolvedValue(undefined)}
          onRemoveCustomTool={vi.fn().mockResolvedValue(undefined)}
          onUninstallCustomTool={vi.fn().mockResolvedValue(undefined)}
          onOpenSettings={vi.fn()}
          onOpenUrl={vi.fn().mockResolvedValue(undefined)}
          onLog={vi.fn()}
        />,
      );
    });

    await act(async () => {
      findButton(container, "手动添加").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    const nameInput = Array.from(container.querySelectorAll("input")).find(
      (item) => item.placeholder === "例如 LocalSend / 自用脚本",
    ) as HTMLInputElement | undefined;
    if (!nameInput) {
      throw new Error("Manual tool name input not found");
    }

    await act(async () => {
      setInputValue(nameInput, "测试工具");
    });

    await act(async () => {
      findButton(container, "添加到工具箱").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(onAddManualTool).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("已添加到工具箱");

    await act(async () => {
      root.unmount();
    });
  });
});
