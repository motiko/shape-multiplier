import type { Matrix } from "../model/types";

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** Returns a ∘ b: apply b first, then a (same order as SVG `transform="a b"`). */
export function compose(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export function composeAll(...ms: Matrix[]): Matrix {
  return ms.reduce(compose, IDENTITY);
}

export function invert(m: Matrix): Matrix {
  const det = m[0] * m[3] - m[1] * m[2];
  if (det === 0) throw new Error("matrix is not invertible");
  const [a, b, c, d, e, f] = m;
  return [
    d / det,
    -b / det,
    -c / det,
    a / det,
    (c * f - d * e) / det,
    (b * e - a * f) / det,
  ];
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function translate(tx: number, ty: number): Matrix {
  return [1, 0, 0, 1, tx, ty];
}

export function scale(sx: number, sy = sx): Matrix {
  return [sx, 0, 0, sy, 0, 0];
}

/** Rotation in degrees, optionally about a point. */
export function rotate(deg: number, cx = 0, cy = 0): Matrix {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  const rot: Matrix = [cos, sin, -sin, cos, 0, 0];
  if (cx === 0 && cy === 0) return rot;
  return composeAll(translate(cx, cy), rot, translate(-cx, -cy));
}

export function skewX(deg: number): Matrix {
  return [1, 0, Math.tan((deg * Math.PI) / 180), 1, 0, 0];
}

export function skewY(deg: number): Matrix {
  return [1, Math.tan((deg * Math.PI) / 180), 0, 1, 0, 0];
}

/** Translate · Rotate · Scale about a pivot, the common case for rules and layers. */
export function fromTRS(opts: {
  tx?: number; ty?: number; rotateDeg?: number; sx?: number; sy?: number; px?: number; py?: number;
}): Matrix {
  const { tx = 0, ty = 0, rotateDeg = 0, sx = 1, sy = sx, px = 0, py = 0 } = opts;
  return composeAll(translate(tx, ty), translate(px, py), rotate(rotateDeg), scale(sx, sy), translate(-px, -py));
}

/** Uniform scale factor of a matrix (geometric mean of axis scales). */
export function scaleOf(m: Matrix): number {
  return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
}

export function toSvgTransform(m: Matrix): string {
  return `matrix(${m.map((v) => +v.toFixed(6)).join(" ")})`;
}

/**
 * Parse an SVG `transform` attribute: translate, scale, rotate, skewX, skewY, matrix.
 * Unknown functions are ignored.
 */
export function parseTransform(attr: string | null | undefined): Matrix {
  if (!attr) return IDENTITY;
  let m: Matrix = IDENTITY;
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(attr))) {
    const fn = match[1];
    const n = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    let t: Matrix | null = null;
    switch (fn) {
      case "translate": t = translate(n[0] ?? 0, n[1] ?? 0); break;
      case "scale": t = scale(n[0] ?? 1, n[1] ?? n[0] ?? 1); break;
      case "rotate": t = rotate(n[0] ?? 0, n[1] ?? 0, n[2] ?? 0); break;
      case "skewX": t = skewX(n[0] ?? 0); break;
      case "skewY": t = skewY(n[0] ?? 0); break;
      case "matrix": if (n.length === 6) t = n as Matrix; break;
    }
    if (t) m = compose(m, t);
  }
  return m;
}
