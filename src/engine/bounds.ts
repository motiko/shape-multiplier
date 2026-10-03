import type { Instance, Matrix, Rect } from "../model/types";
import { apply } from "./matrix";

/** Axis-aligned bounds of a rect after transformation. */
export function transformRect(m: Matrix, r: Rect): Rect {
  const pts = [
    apply(m, r.x, r.y),
    apply(m, r.x + r.width, r.y),
    apply(m, r.x, r.y + r.height),
    apply(m, r.x + r.width, r.y + r.height),
  ];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return {
    x, y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

/** Bounds of every instance of one figure, or null for an empty list. */
export function instancesBounds(instances: Instance[], figureBBox: Rect): Rect | null {
  let out: Rect | null = null;
  for (const inst of instances) {
    const r = transformRect(inst.matrix, figureBBox);
    out = out ? unionRect(out, r) : r;
  }
  return out;
}

/**
 * A canvas-space matrix that moves `bounds` to the canvas center and scales it
 * so its longer side fills `fill` of the shorter canvas side.
 */
export function fitTransform(bounds: Rect, cw: number, ch: number, fill = 0.8): Matrix {
  const size = Math.max(bounds.width, bounds.height) || 1;
  const s = (Math.min(cw, ch) * fill) / size;
  const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
  return [s, 0, 0, s, cw / 2 - cx * s, ch / 2 - cy * s];
}
