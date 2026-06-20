import { describe, expect, it } from "vitest";
import {
  categoryDragMimeType,
  createCategoryDragPayload,
  createToolDragPayload,
  getDroppableCategoryId,
  parseCategoryDragPayload,
  parseToolDragPayload,
  toolDragMimeType,
} from "./catalogDrag";

describe("catalog drag helpers", () => {
  it("serializes and parses dragged tool ids", () => {
    const payload = createToolDragPayload("terminal");

    expect(toolDragMimeType).toBe("application/x-winkitbox-tool");
    expect(parseToolDragPayload(payload)).toBe("terminal");
  });

  it("rejects invalid drag payloads and non-category targets", () => {
    expect(parseToolDragPayload("")).toBeUndefined();
    expect(parseToolDragPayload("{bad")).toBeUndefined();
    expect(parseToolDragPayload(JSON.stringify({ toolId: "" }))).toBeUndefined();
    expect(getDroppableCategoryId("all")).toBeUndefined();
    expect(getDroppableCategoryId("system")).toBe("system");
  });

  it("serializes and parses dragged category ids", () => {
    const payload = createCategoryDragPayload("user-tools");

    expect(categoryDragMimeType).toBe("application/x-winkitbox-category");
    expect(parseCategoryDragPayload(payload)).toBe("user-tools");
    expect(parseCategoryDragPayload(JSON.stringify({ categoryId: "" }))).toBeUndefined();
  });
});
