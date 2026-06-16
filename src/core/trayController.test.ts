import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { createTrayMenuTemplate, getTrayIconPath } = require("../../electron/trayController.cjs") as {
  createTrayMenuTemplate: (actions: {
    restoreWindow: () => void;
    hideWindow: () => void;
    quitApp: () => void;
  }) => Array<{ label?: string; type?: string; click?: () => void }>;
  getTrayIconPath: (rootDir: string) => string;
};

describe("tray controller", () => {
  it("provides restore, hide, and quit actions", () => {
    const restoreWindow = vi.fn();
    const hideWindow = vi.fn();
    const quitApp = vi.fn();
    const template = createTrayMenuTemplate({ restoreWindow, hideWindow, quitApp });

    expect(template.map((item) => item.label ?? item.type)).toEqual([
      "打开 WinKitBox",
      "隐藏到托盘",
      "separator",
      "退出"
    ]);

    template[0].click?.();
    template[1].click?.();
    template[3].click?.();

    expect(restoreWindow).toHaveBeenCalledOnce();
    expect(hideWindow).toHaveBeenCalledOnce();
    expect(quitApp).toHaveBeenCalledOnce();
  });

  it("uses the bundled ico as tray icon", () => {
    expect(getTrayIconPath("C:/App")).toBe(path.join("C:/App", "assets", "icon", "winkitbox-icon.ico"));
  });
});
