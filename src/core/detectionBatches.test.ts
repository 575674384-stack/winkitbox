import { describe, expect, it } from "vitest";
import { createDetectionBatches } from "./detectionBatches";

describe("createDetectionBatches", () => {
  it("splits long detection lists into stable batches", () => {
    const items = Array.from({ length: 205 }, (_, index) => index);

    const batches = createDetectionBatches(items, 80);

    expect(batches.map((batch) => batch.length)).toEqual([80, 80, 45]);
    expect(batches.flat()).toEqual(items);
  });

  it("guards invalid batch sizes", () => {
    expect(createDetectionBatches([1, 2, 3], 0)).toEqual([[1], [2], [3]]);
  });
});
