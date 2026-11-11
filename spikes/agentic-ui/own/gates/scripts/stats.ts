/** Nearest-rank p95 and median, rounded to 0.1 ms (gate 16.1 summaries). */
const round1 = (v: number): number => Math.round(v * 10) / 10;

export function p95(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const v = sorted[Math.ceil(0.95 * sorted.length) - 1];
  return v === undefined ? null : round1(v);
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return round1(sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}
