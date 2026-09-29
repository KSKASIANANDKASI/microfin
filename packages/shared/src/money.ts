/**
 * All money in this system is an integer number of MINOR units (paise).
 * Nothing here ever returns a fractional currency value.
 */

export const MINOR_PER_MAJOR = 100;

export function toMinor(major: number): number {
  return Math.round(major * MINOR_PER_MAJOR);
}

export function toMajor(minor: number): number {
  return minor / MINOR_PER_MAJOR;
}

/** Round to the nearest `step` minor units (step 1 = plain rounding). */
export function roundTo(minor: number, step = 1): number {
  if (step <= 1) return Math.round(minor);
  return Math.round(minor / step) * step;
}

export function formatINR(minor: number, opts: { compact?: boolean } = {}): string {
  const value = toMajor(minor);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: opts.compact ? 0 : 2,
    minimumFractionDigits: opts.compact ? 0 : 2,
  }).format(value);
}

/** Split `total` into `parts` integers that sum exactly to `total`. */
export function splitEvenly(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}
