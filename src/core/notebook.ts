export type NotebookEntry = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

export const maxNotebookEntries = 80;

export function normalizeNotebookEntries(value: unknown): NotebookEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  return value
    .map((item): NotebookEntry | undefined => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const record = item as Partial<NotebookEntry>;
      const id = compact(record.id, 80);
      const updatedAt = String(record.updatedAt ?? "");
      if (!id || seen.has(id) || Number.isNaN(Date.parse(updatedAt))) {
        return undefined;
      }
      seen.add(id);

      const title = compact(record.title, 40) || "未命名记事本";
      return {
        id,
        title,
        content: compact(record.content, 20000),
        updatedAt,
      };
    })
    .filter((entry): entry is NotebookEntry => Boolean(entry))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, maxNotebookEntries);
}

export function createNotebookEntry(
  input: { title?: string; content?: string } = {},
  now = new Date(),
): NotebookEntry {
  return {
    id: `note-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    title: compact(input.title, 40) || "新记事本",
    content: compact(input.content, 20000),
    updatedAt: now.toISOString(),
  };
}

export function updateNotebookEntry(
  entries: readonly NotebookEntry[],
  id: string,
  patch: Partial<Pick<NotebookEntry, "title" | "content">>,
  now = new Date(),
) {
  return normalizeNotebookEntries(
    entries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            title: patch.title !== undefined ? patch.title : entry.title,
            content: patch.content !== undefined ? patch.content : entry.content,
            updatedAt: now.toISOString(),
          }
        : entry,
    ),
  );
}

function compact(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, maxLength);
}
