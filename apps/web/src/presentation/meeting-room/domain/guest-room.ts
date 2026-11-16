// TJ-ARCH-MOB-001 compliant
// Layout rules of the guest room (web-release-acceptance.md section 3), as pure functions.
// No framework, LiveKit or UI imports.

/** Widest stage, in CSS pixels, that still stacks every cell in one column. */
const SINGLE_COLUMN_MAX = 480;

/**
 * Grid columns from the number of cells (tiles plus the R1 share card) and the stage
 * width: one column at 480px and below; two for up to four cells; then three, then four.
 */
export function columnsFor(cells: number, stageWidth: number): number {
  if (stageWidth <= SINGLE_COLUMN_MAX || cells <= 1) return 1;
  if (cells <= 4) return 2;
  return cells <= 9 ? 3 : 4;
}
