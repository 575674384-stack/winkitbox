export const defaultDetectionBatchSize = 80;
export const defaultDetectionBatchDelayMs = 80;

export function createDetectionBatches<T>(
  items: readonly T[],
  batchSize = defaultDetectionBatchSize,
): T[][] {
  const safeBatchSize = Math.max(1, Math.floor(batchSize));
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += safeBatchSize) {
    batches.push(items.slice(index, index + safeBatchSize));
  }

  return batches;
}
