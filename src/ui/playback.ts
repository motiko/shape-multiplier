/** Grow-in duration for `total` instances: ~90 ms per copy, between 1.2 s and 8 s. */
export function playDuration(total: number): number {
  return Math.min(8000, Math.max(1200, total * 90));
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
