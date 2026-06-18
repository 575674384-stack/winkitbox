import type { RunEvent } from "./runEvents";

export type ToolInstallStatus =
  | "unknown"
  | "checking"
  | "installed"
  | "not-installed"
  | "installing"
  | "uninstalling"
  | "failed"
  | "opening";

export type ToolRuntimeState = {
  status: ToolInstallStatus;
  message?: string;
  launcherFound?: boolean;
  launcherType?: string;
};

export type ToolRuntimeStates = Record<string, ToolRuntimeState>;

export type ToolDetectionResult = {
  toolId: string;
  installed: boolean;
  launcherFound: boolean;
  launcherType: string;
  message: string;
};

export type DetectionMergeOptions = {
  preserveActive?: boolean;
};

export type InstallProgress = {
  active: boolean;
  action?: "install" | "uninstall";
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  currentLabel?: string;
};

export function createEmptyInstallProgress(): InstallProgress {
  return {
    active: false,
    total: 0,
    completed: 0,
    succeeded: 0,
    failed: 0
  };
}

export function applyRunEventSnapshot(
  event: RunEvent,
  currentStates: ToolRuntimeStates,
  currentProgress: InstallProgress
): {
  states: ToolRuntimeStates;
  progress: InstallProgress;
} {
  if (event.type === "plan-start") {
    return {
      states: currentStates,
      progress: {
        active: true,
        action: event.action,
        total: event.total,
        completed: 0,
        succeeded: 0,
        failed: 0
      }
    };
  }

  if (event.type === "plan-complete") {
    return {
      states: currentStates,
      progress: {
        ...currentProgress,
        active: false,
        action: currentProgress.action,
        currentLabel: undefined
      }
    };
  }

  if (event.type === "manual") {
    return {
      states: currentStates,
      progress: currentProgress
    };
  }

  if (event.type === "install-start") {
    return {
      states: {
        ...currentStates,
        [event.toolId]: {
          status: "installing",
          message: `正在安装 ${event.label}...`
        }
      },
      progress: {
        ...currentProgress,
        active: true,
        currentLabel: event.label
      }
    };
  }

  if (event.type === "uninstall-start") {
    return {
      states: {
        ...currentStates,
        [event.toolId]: {
          status: "uninstalling",
          message: `正在卸载 ${event.label}...`
        }
      },
      progress: {
        ...currentProgress,
        active: true,
        currentLabel: event.label
      }
    };
  }

  if (event.type === "install-success") {
    return {
      states: {
        ...currentStates,
        [event.toolId]: {
          status: "installed",
          message: `${event.label} 已安装，可以直接打开。`,
          launcherFound: true
        }
      },
      progress: {
        ...currentProgress,
        completed: currentProgress.completed + 1,
        succeeded: currentProgress.succeeded + 1,
        currentLabel: event.label
      }
    };
  }

  if (event.type === "uninstall-success") {
    return {
      states: {
        ...currentStates,
        [event.toolId]: {
          status: "not-installed",
          message: `${event.label} 已卸载。`,
          launcherFound: false
        }
      },
      progress: {
        ...currentProgress,
        completed: currentProgress.completed + 1,
        succeeded: currentProgress.succeeded + 1,
        currentLabel: event.label
      }
    };
  }

  if (event.type === "uninstall-failed") {
    return {
      states: {
        ...currentStates,
        [event.toolId]: {
          status: "failed",
          message: `${event.label} 卸载失败，请查看日志后重试。`
        }
      },
      progress: {
        ...currentProgress,
        completed: currentProgress.completed + 1,
        failed: currentProgress.failed + 1,
        currentLabel: event.label
      }
    };
  }

  return {
    states: {
      ...currentStates,
      [event.toolId]: {
        status: "failed",
        message: `${event.label} 安装失败，请查看日志后重试。`
      }
    },
    progress: {
      ...currentProgress,
      completed: currentProgress.completed + 1,
      failed: currentProgress.failed + 1,
      currentLabel: event.label
    }
  };
}

export function markToolsChecking(currentStates: ToolRuntimeStates, toolIds: string[]): ToolRuntimeStates {
  const next = { ...currentStates };

  for (const toolId of toolIds) {
    const current = currentStates[toolId];

    if (current && isActiveStatus(current.status)) {
      continue;
    }

    next[toolId] = {
      ...current,
      status: "checking",
      message: "正在检测安装状态..."
    };
  }

  return next;
}

export function applyDetectionResults(
  currentStates: ToolRuntimeStates,
  results: ToolDetectionResult[],
  expectedToolIds: string[] = [],
  options: DetectionMergeOptions = {}
): ToolRuntimeStates {
  const next = { ...currentStates };
  const resultToolIds = new Set(results.map((result) => result.toolId));
  const preserveActive = options.preserveActive !== false;

  for (const result of results) {
    const current = currentStates[result.toolId];

    if (preserveActive && current && (current.status === "installing" || current.status === "uninstalling" || current.status === "opening")) {
      continue;
    }

    next[result.toolId] = {
      status: result.installed ? "installed" : "not-installed",
      message: result.message,
      launcherFound: result.launcherFound,
      launcherType: result.launcherType
    };
  }

  for (const toolId of expectedToolIds) {
    if (resultToolIds.has(toolId)) {
      continue;
    }

    const current = currentStates[toolId];
    const canMarkMissing =
      current?.status === "checking" ||
      (!preserveActive && current && isActiveStatus(current.status));

    if (!canMarkMissing) {
      continue;
    }

    next[toolId] = {
      status: "unknown",
      message: "没有收到检测结果，请稍后重试。"
    };
  }

  return next;
}

export function getStatusLabel(status: ToolInstallStatus) {
  const labels: Record<ToolInstallStatus, string> = {
    unknown: "未检测",
    checking: "检测中",
    installed: "已安装",
    "not-installed": "未安装",
    installing: "安装中",
    uninstalling: "卸载中",
    failed: "安装失败",
    opening: "打开中"
  };

  return labels[status];
}

export function getInstallButtonLabel(status: ToolInstallStatus) {
  if (status === "installed") {
    return "重装";
  }

  if (status === "failed") {
    return "重试";
  }

  if (status === "installing") {
    return "安装中";
  }

  if (status === "uninstalling") {
    return "卸载中";
  }

  return "安装";
}

export function isActiveStatus(status: ToolInstallStatus) {
  return status === "checking" || status === "installing" || status === "uninstalling" || status === "opening";
}
