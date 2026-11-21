// TJ-ARCH-MOB-001 compliant

export interface TileRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const TILE_ASPECT = 16 / 9;

/**
 * The recording layout (decision D4): every tile the same size, 16:9, in a grid centred on
 * the canvas. A screen share is one tile like any other. The grid with the largest tiles
 * wins; a last row with fewer tiles is centred. Pure, so it is easy to read and to test.
 */
export function computeGridLayout(
  count: number,
  width: number,
  height: number,
  gap: number,
): readonly TileRect[] {
  if (count <= 0) return [];
  let best = { columns: 1, rows: count, tileWidth: 0, tileHeight: 0 };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const maxWidth = (width - gap * (columns + 1)) / columns;
    const maxHeight = (height - gap * (rows + 1)) / rows;
    const tileWidth = Math.max(0, Math.min(maxWidth, maxHeight * TILE_ASPECT));
    if (tileWidth > best.tileWidth) {
      best = { columns, rows, tileWidth, tileHeight: tileWidth / TILE_ASPECT };
    }
  }
  const { columns, rows, tileWidth, tileHeight } = best;
  const gridHeight = rows * tileHeight + (rows - 1) * gap;
  const top = (height - gridHeight) / 2;
  const rects: TileRect[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns);
    const inRow = row === rows - 1 ? count - row * columns : columns;
    const rowWidth = inRow * tileWidth + (inRow - 1) * gap;
    const left = (width - rowWidth) / 2;
    const column = index - row * columns;
    rects.push({
      x: left + column * (tileWidth + gap),
      y: top + row * (tileHeight + gap),
      width: tileWidth,
      height: tileHeight,
    });
  }
  return rects;
}
