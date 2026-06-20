export type ConfigBackupEntry = {
  id: string;
  fileName: string;
  createdAt: string;
  sizeBytes: number;
};

export const maxConfigBackups = 5;

export function normalizeConfigBackups(value: unknown): ConfigBackupEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): ConfigBackupEntry | undefined => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const record = item as Partial<ConfigBackupEntry>;
      const createdAt = String(record.createdAt ?? "");
      if (!record.fileName || Number.isNaN(Date.parse(createdAt))) {
        return undefined;
      }

      return {
        id: String(record.id ?? record.fileName),
        fileName: String(record.fileName),
        createdAt,
        sizeBytes: Math.max(0, Math.round(Number(record.sizeBytes ?? 0))),
      };
    })
    .filter((item): item is ConfigBackupEntry => Boolean(item))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, maxConfigBackups);
}

export function getConfigBackupLabel(entry: ConfigBackupEntry) {
  const date = new Date(entry.createdAt);

  if (Number.isNaN(date.getTime())) {
    return entry.fileName;
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

