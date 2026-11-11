/**
 * Gate 16.3 statistics: seeded PRNG, shuffling, quantiles, a percentile bootstrap confidence
 * interval for the median paired difference, and an ordinary least-squares slope with its 95% CI.
 */

/** Deterministic 32-bit PRNG (mulberry32); returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/** Linear-interpolation quantile (Hyndman-Fan type 7, as R's default). */
export function quantile(values: readonly number[], q: number): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = s[lo] ?? 0;
  const b = s[hi] ?? a;
  return a + (b - a) * (pos - lo);
}

export interface PairedSummary {
  readonly n: number;
  readonly medianDiff: number | null;
  readonly ciLow: number | null;
  readonly ciHigh: number | null;
  /** Pairs where O minus H is above / below zero. */
  readonly positive: number;
  readonly negative: number;
  readonly meaningful: boolean;
}

/** Median of (O - H) over matched pairs, with a 95% percentile bootstrap CI (10,000 resamples). */
export function pairedDifference(diffs: readonly number[], seed: number, resamples = 10_000): PairedSummary {
  const n = diffs.length;
  const positive = diffs.filter((d) => d > 0).length;
  const negative = diffs.filter((d) => d < 0).length;
  if (n < 2) return { n, medianDiff: quantile(diffs, 0.5), ciLow: null, ciHigh: null, positive, negative, meaningful: false };
  const rng = mulberry32(seed);
  const medians: number[] = [];
  const sample = new Array<number>(n);
  for (let r = 0; r < resamples; r += 1) {
    for (let i = 0; i < n; i += 1) sample[i] = diffs[Math.floor(rng() * n)] ?? 0;
    medians.push(quantile(sample, 0.5) ?? 0);
  }
  const ciLow = quantile(medians, 0.025);
  const ciHigh = quantile(medians, 0.975);
  const meaningful = ciLow !== null && ciHigh !== null && (ciLow > 0 || ciHigh < 0);
  return { n, medianDiff: quantile(diffs, 0.5), ciLow, ciHigh, positive, negative, meaningful };
}

/** Two-sided 97.5% Student t quantile for small df (OLS slope CI); falls back to the normal value. */
function tQuantile975(df: number): number {
  const table = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131,
    2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
  return df >= 1 && df <= table.length ? (table[df - 1] ?? 1.96) : 1.96;
}

export interface Slope {
  readonly n: number;
  readonly slope: number | null;
  readonly ciLow: number | null;
  readonly ciHigh: number | null;
  readonly intercept: number | null;
}

export function olsSlope(xs: readonly number[], ys: readonly number[]): Slope {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return { n, slope: null, ciLow: null, ciHigh: null, intercept: null };
  const mx = xs.slice(0, n).reduce((s, x) => s + x, 0) / n;
  const my = ys.slice(0, n).reduce((s, y) => s + y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (xs[i] ?? 0) - mx;
    sxx += dx * dx;
    sxy += dx * ((ys[i] ?? 0) - my);
  }
  if (sxx === 0) return { n, slope: null, ciLow: null, ciHigh: null, intercept: null };
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let sse = 0;
  for (let i = 0; i < n; i += 1) sse += ((ys[i] ?? 0) - (intercept + slope * (xs[i] ?? 0))) ** 2;
  const se = Math.sqrt(sse / (n - 2) / sxx);
  const t = tQuantile975(n - 2);
  return { n, slope, ciLow: slope - t * se, ciHigh: slope + t * se, intercept };
}
