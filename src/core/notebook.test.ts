import { describe, expect, it } from "vitest";
import {
  createNotebookEntry,
  maxNotebookEntries,
  normalizeNotebookEntries,
  updateNotebookEntry,
} from "./notebook";

describe("notebook helpers", () => {
  it("normalizes notes newest first and caps the list", () => {
    const entries = Array.from({ length: maxNotebookEntries + 2 }, (_, index) => ({
      id: `note-${index}`,
      title: `Note ${index}`,
      content: "content",
      updatedAt: `2026-06-20T${String(index % 24).padStart(2, "0")}:00:00.000Z`,
    }));

    const normalized = normalizeNotebookEntries([{ id: "", updatedAt: "bad" }, ...entries]);

    expect(normalized).toHaveLength(maxNotebookEntries);
    expect(normalized[0].updatedAt >= normalized[1].updatedAt).toBe(true);
  });

  it("creates and updates notes with stable ids", () => {
    const created = createNotebookEntry(
      { title: "环境记录", content: "PowerShell 已安装" },
      new Date("2026-06-20T08:00:00.000Z"),
    );
    const updated = updateNotebookEntry(
      [created],
      created.id,
      { content: "PowerShell 和 Git 已安装" },
      new Date("2026-06-20T09:00:00.000Z"),
    );

    expect(updated[0].id).toBe(created.id);
    expect(updated[0].content).toBe("PowerShell 和 Git 已安装");
    expect(updated[0].updatedAt).toBe("2026-06-20T09:00:00.000Z");
  });
});
