export type VirtualGridRequest = {
  totalItems: number;
  scrollTop: number;
  viewportHeight: number;
  columnCount: number;
  rowHeight: number;
  overscanRows?: number;
  minimumItems?: number;
};

export type VirtualGridWindow = {
  startIndex: number;
  endIndex: number;
  beforeHeight: number;
  afterHeight: number;
};

export function calculateVirtualGridWindow({
  totalItems,
  scrollTop,
  viewportHeight,
  columnCount,
  rowHeight,
  overscanRows = 2,
  minimumItems = 48,
}: VirtualGridRequest): VirtualGridWindow {
  const safeTotal = Math.max(0, Math.floor(totalItems));
  const safeColumns = Math.max(1, Math.floor(columnCount));
  const safeRowHeight = Math.max(1, Math.floor(rowHeight));

  if (safeTotal <= minimumItems) {
    return {
      startIndex: 0,
      endIndex: safeTotal,
      beforeHeight: 0,
      afterHeight: 0,
    };
  }

  const totalRows = Math.ceil(safeTotal / safeColumns);
  const firstVisibleRow = Math.max(0, Math.floor(Math.max(0, scrollTop) / safeRowHeight));
  const visibleRows = Math.max(1, Math.ceil(Math.max(1, viewportHeight) / safeRowHeight));
  const startRow = Math.max(0, firstVisibleRow - overscanRows);
  const endRow = Math.min(totalRows, firstVisibleRow + visibleRows + overscanRows);
  const startIndex = startRow * safeColumns;
  const endIndex = Math.min(safeTotal, endRow * safeColumns);

  return {
    startIndex,
    endIndex,
    beforeHeight: startRow * safeRowHeight,
    afterHeight: Math.max(0, (totalRows - endRow) * safeRowHeight),
  };
}

export function filterToolsWithCacheKey(query: string) {
  return query.toLowerCase().replace(/\s+/g, " ").trim();
}
