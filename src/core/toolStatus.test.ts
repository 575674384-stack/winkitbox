import { describe, expect, it } from "vitest";
import {
  applyDetectionResults,
  applyRunEventSnapshot,
  createEmptyInstallProgress,
  getInstallButtonLabel,
  getStatusLabel,
  markToolsChecking,
  type ToolRuntimeStates
} from "./toolStatus";

describe("tool status", () => {
  it("turns install events into visible progress and installed state", () => {
    const started = applyRunEventSnapshot(
      { type: "plan-start", total: 2 },
      {},
      createEmptyInstallProgress()
    );

    expect(started.progress).toMatchObject({
      active: true,
      total: 2,
      completed: 0,
      succeeded: 0,
      failed: 0
    });

    const installing = applyRunEventSnapshot(
      { type: "install-start", toolId: "files", label: "Files" },
      started.states,
      started.progress
    );

    expect(installing.states.files).toMatchObject({
      status: "installing",
      message: "正在安装 Files..."
    });
    expect(installing.progress.currentLabel).toBe("Files");

    const installed = applyRunEventSnapshot(
      { type: "install-success", toolId: "files", label: "Files" },
      installing.states,
      installing.progress
    );

    expect(installed.states.files).toMatchObject({
      status: "installed",
      message: "Files 已安装，可以直接打开。"
    });
    expect(installed.progress).toMatchObject({
      completed: 1,
      succeeded: 1,
      failed: 0
    });
  });

  it("marks failed installs without losing progress", () => {
    const failed = applyRunEventSnapshot(
      { type: "install-failed", toolId: "terminal", label: "Windows Terminal" },
      {},
      {
        active: true,
        total: 1,
        completed: 0,
        succeeded: 0,
        failed: 0,
        currentLabel: "Windows Terminal"
      }
    );

    expect(failed.states.terminal).toMatchObject({
      status: "failed",
      message: "Windows Terminal 安装失败，请查看日志后重试。"
    });
    expect(failed.progress).toMatchObject({
      completed: 1,
      succeeded: 0,
      failed: 1
    });
  });

  it("turns uninstall events into visible progress and not-installed state", () => {
    const started = applyRunEventSnapshot(
      { type: "uninstall-start", toolId: "geek", label: "Geek Uninstaller" },
      {
        geek: { status: "installed", message: "已安装，可直接打开。" }
      },
      {
        active: true,
        total: 1,
        completed: 0,
        succeeded: 0,
        failed: 0
      }
    );

    expect(started.states.geek).toMatchObject({
      status: "uninstalling",
      message: "正在卸载 Geek Uninstaller..."
    });

    const finished = applyRunEventSnapshot(
      { type: "uninstall-success", toolId: "geek", label: "Geek Uninstaller" },
      started.states,
      started.progress
    );

    expect(finished.states.geek).toMatchObject({
      status: "not-installed",
      message: "Geek Uninstaller 已卸载。"
    });
    expect(finished.progress).toMatchObject({
      completed: 1,
      succeeded: 1,
      failed: 0
    });
  });

  it("applies local detection results and keeps active installs untouched", () => {
    const current: ToolRuntimeStates = {
      terminal: { status: "installing", message: "正在安装 Windows Terminal..." }
    };

    const checking = markToolsChecking(current, ["terminal", "files"]);

    expect(checking.terminal.status).toBe("installing");
    expect(checking.files.status).toBe("checking");

    const detected = applyDetectionResults(
      checking,
      [
        {
          toolId: "terminal",
          installed: true,
          launcherFound: true,
          launcherType: "app",
          message: "已安装，可直接打开。"
        },
        {
          toolId: "files",
          installed: false,
          launcherFound: false,
          launcherType: "",
          message: "未安装。"
        }
      ],
      ["terminal", "files"]
    );

    expect(detected.terminal.status).toBe("installing");
    expect(detected.files).toMatchObject({
      status: "not-installed",
      message: "未安装。"
    });
  });

  it("can finalize active installs during an explicit post-run refresh", () => {
    const current: ToolRuntimeStates = {
      terminal: { status: "installing", message: "正在安装 Windows Terminal..." },
      files: { status: "installing", message: "正在安装 Files..." }
    };

    const detected = applyDetectionResults(
      current,
      [
        {
          toolId: "terminal",
          installed: true,
          launcherFound: true,
          launcherType: "app",
          message: "已安装，可直接打开。"
        }
      ],
      ["terminal", "files"],
      { preserveActive: false }
    );

    expect(detected.terminal).toMatchObject({
      status: "installed",
      message: "已安装，可直接打开。"
    });
    expect(detected.files).toMatchObject({
      status: "unknown",
      message: "没有收到检测结果，请稍后重试。"
    });
  });

  it("keeps user-facing labels short and distinct", () => {
    expect(getStatusLabel("installed")).toBe("已安装");
    expect(getStatusLabel("not-installed")).toBe("未安装");
    expect(getInstallButtonLabel("installed")).toBe("重装");
    expect(getInstallButtonLabel("failed")).toBe("重试");
  });

  it("does not leave missing detection results stuck as checking", () => {
    const current: ToolRuntimeStates = markToolsChecking({}, ["files", "terminal"]);

    const detected = applyDetectionResults(
      current,
      [
        {
          toolId: "files",
          installed: true,
          launcherFound: true,
          launcherType: "app",
          message: "已安装，可直接打开。"
        }
      ],
      ["files", "terminal"]
    );

    expect(detected.files.status).toBe("installed");
    expect(detected.terminal).toMatchObject({
      status: "unknown",
      message: "没有收到检测结果，请稍后重试。"
    });
  });
});
