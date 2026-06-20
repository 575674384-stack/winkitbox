import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsView } from "./App";
import { defaultThemeId } from "./core/themes";
import type { UpdateInfo } from "./core/update";

const baseSettings = {
  toolRootPath: "C:\\Tools",
  defaultToolRootPath: "C:\\Tools",
  updateOnStartup: false,
  aiBaseUrl: "https://api.example.com/v1",
  aiApiKey: "sk-test",
  aiModel: "test-model",
  proxyMode: "direct" as const,
  proxyManual: "",
  themeId: defaultThemeId,
  themeBackgrounds: {},
  glassOpacity: 74,
  glassBlur: 26,
  customTools: [],
  customCategories: [],
  toolCategoryOverrides: {},
};

function findButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label),
  );
  if (!button) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
}

async function renderSettingsView(extraProps: Record<string, unknown> = {}) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const saveAiSettings = vi.fn().mockResolvedValue(undefined);
  const onLog = vi.fn();

  await act(async () => {
    root.render(
      <SettingsView
        settings={baseSettings}
        toolRootDraft={baseSettings.toolRootPath}
        setToolRootDraft={vi.fn()}
        saveToolRootPath={vi.fn().mockResolvedValue(undefined)}
        chooseToolRootPath={vi.fn().mockResolvedValue(undefined)}
        resetToolRootPath={vi.fn().mockResolvedValue(undefined)}
        updateInfo={{ currentVersion: "0.3.12", hasUpdate: false, assets: [] } as UpdateInfo}
        isCheckingUpdate={false}
        checkForUpdates={vi.fn().mockResolvedValue(undefined)}
        openUpdateRelease={vi.fn().mockResolvedValue(undefined)}
        saveUpdateOnStartup={vi.fn().mockResolvedValue(undefined)}
        saveAiSettings={saveAiSettings}
        saveProxySettings={vi.fn().mockResolvedValue(undefined)}
        saveTheme={vi.fn().mockResolvedValue(undefined)}
        onSelectCustomThemeBackground={vi.fn().mockResolvedValue(undefined)}
        onClearCustomThemeBackground={vi.fn().mockResolvedValue(undefined)}
        onLog={onLog}
        onExportConfig={vi.fn().mockResolvedValue(undefined)}
        onImportConfig={vi.fn().mockResolvedValue(undefined)}
        configBackups={[]}
        onCreateBackup={vi.fn().mockResolvedValue(undefined)}
        onRestoreBackup={vi.fn().mockResolvedValue(undefined)}
        {...extraProps}
      />,
    );
  });

  return { container, root, saveAiSettings, onLog };
}

describe("SettingsView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    (window as unknown as { winKitBox?: unknown }).winKitBox = undefined;
    document.body.innerHTML = "";
  });

  it("shows connection feedback in the AI model panel after a successful test", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const bridge = {
      testAiConnection: vi.fn().mockResolvedValue({ ok: true }),
      onDownloadUpdateProgress: vi.fn(() => undefined),
    };
    vi.stubGlobal("winKitBox", bridge);
    (window as unknown as { winKitBox: unknown }).winKitBox = {
      ...bridge,
    };

    const { container, root } = await renderSettingsView();

    await act(async () => {
      findButton(container, "测试连通性").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(container.textContent).toContain("AI 接口连通性测试通过");

    await act(async () => {
      root.unmount();
    });
  });

  it("shows model detection feedback in the AI model panel", async () => {
    const bridge = {
      listAiModels: vi.fn().mockResolvedValue({ models: ["test-model"] }),
      onDownloadUpdateProgress: vi.fn(() => undefined),
    };
    vi.stubGlobal("winKitBox", bridge);
    (window as unknown as { winKitBox: unknown }).winKitBox = {
      ...bridge,
    };

    const { container, root } = await renderSettingsView();

    await act(async () => {
      findButton(container, "检测可用模型").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(container.textContent).toContain("已检测到 1 个可用模型。");

    await act(async () => {
      root.unmount();
    });
  });

  it("shows page feedback for settings actions", async () => {
    const { container, root } = await renderSettingsView({
      feedback: {
        level: "success",
        message: "代理设置已保存并生效。",
      },
    });

    expect(container.textContent).toContain("代理设置已保存并生效。");

    await act(async () => {
      root.unmount();
    });
  });
});
