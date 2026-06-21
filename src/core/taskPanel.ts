import type { TaskQueueItem } from "./taskQueue";

const activeTaskStatuses = new Set(["queued", "running"]);

export function shouldAutoHideTaskPanel(tasks: readonly TaskQueueItem[]) {
  return (
    tasks.length > 0 &&
    tasks.every((task) => !activeTaskStatuses.has(task.status)) &&
    tasks.every((task) => task.status !== "error")
  );
}
