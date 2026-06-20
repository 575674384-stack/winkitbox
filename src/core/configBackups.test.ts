import { describe, expect, it } from "vitest";
import { maxConfigBackups, normalizeConfigBackups } from "./configBackups";

describe("config backups", () => {
  it("normalizes newest valid backups and caps the list", () => {
    const entries = Array.from({ length: 7 }, (_, index) => ({
      id: `backup-${index}`,
      fileName: `backup-${index}.json`,
      createdAt: `2026-06-20T0${index}:00:00.000Z`,
      sizeBytes: 100 + index,
    }));

    const normalized = normalizeConfigBackups([
      { fileName: "", createdAt: "bad" },
      ...entries,
    ]);

    expect(normalized).toHaveLength(maxConfigBackups);
    expect(normalized[0].fileName).toBe("backup-6.json");
    expect(normalized.at(-1)?.fileName).toBe("backup-2.json");
  });
});
