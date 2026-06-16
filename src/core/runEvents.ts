export type RunEvent =
  | {
      type: "plan-start";
      total: number;
      action?: "install" | "uninstall";
    }
  | {
      type:
        | "install-start"
        | "install-success"
        | "install-failed"
        | "uninstall-start"
        | "uninstall-success"
        | "uninstall-failed"
        | "manual";
      toolId: string;
      label: string;
    }
  | {
      type: "plan-complete";
    };

const eventPrefix = "WINKITBOX_EVENT ";

export function createRunEventLine(event: RunEvent) {
  return `${eventPrefix}${JSON.stringify(event)}`;
}

export function parseRunEventLine(line: string): RunEvent | undefined {
  const index = line.indexOf(eventPrefix);
  if (index < 0) {
    return undefined;
  }

  try {
    const payload = JSON.parse(line.slice(index + eventPrefix.length)) as Partial<RunEvent>;
    return isRunEvent(payload) ? payload : undefined;
  } catch {
    return undefined;
  }
}

function isRunEvent(value: Partial<RunEvent>): value is RunEvent {
  const candidate = value as {
    type?: string;
    total?: unknown;
    toolId?: unknown;
    label?: unknown;
  };

  if (!candidate || typeof candidate.type !== "string") {
    return false;
  }

  if (candidate.type === "plan-start") {
    return typeof candidate.total === "number";
  }

  if (candidate.type === "plan-complete") {
    return true;
  }

  return typeof candidate.toolId === "string" && typeof candidate.label === "string";
}
