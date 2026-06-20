export const toolDragMimeType = "application/x-winkitbox-tool";
export const categoryDragMimeType = "application/x-winkitbox-category";

export function createToolDragPayload(toolId: string): string {
  return JSON.stringify({ toolId });
}

export function createCategoryDragPayload(categoryId: string): string {
  return JSON.stringify({ categoryId });
}

export function parseToolDragPayload(value: string): string | undefined {
  try {
    const parsed = JSON.parse(value) as { toolId?: unknown };
    const toolId = String(parsed.toolId ?? "").trim();
    return toolId || undefined;
  } catch {
    return undefined;
  }
}

export function parseCategoryDragPayload(value: string): string | undefined {
  try {
    const parsed = JSON.parse(value) as { categoryId?: unknown };
    const categoryId = String(parsed.categoryId ?? "").trim();
    return categoryId || undefined;
  } catch {
    return undefined;
  }
}

export function getDroppableCategoryId(categoryId: string): string | undefined {
  return categoryId === "all" ? undefined : categoryId;
}
