/**
 * SVG path data utilities: parse → absolute → only M / L / C / Z → transform → serialize.
 * Arcs, quadratics and shorthand commands are converted to cubics so any affine
 * transform can be applied to control points directly.
 */
import type { Matrix, Rect } from "../model/types";
import { apply } from "../engine/matrix";

export type Cmd =
  | { c: "M"; x: number; y: number }
  | { c: "L"; x: number; y: number }
  | { c: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { c: "Z" };

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function tokenize(d: string): { cmd: string; args: number[] }[] {
  const out: { cmd: string; args: number[] }[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const cmd = m[1];
    // arc flags may be glued together ("a1 1 0 00 10 10"), so parse flags specially
    const args: number[] = [];
    if (cmd === "A" || cmd === "a") {
      const s = m[2].replace(/,/g, " ");
      let i = 0;
      const nums: number[] = [];
      const flagRe = /\s*([01])/y;
      const numRe = /\s*(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/y;
      while (i < s.length) {
        const slot = nums.length % 7;
        const r = slot === 3 || slot === 4 ? flagRe : numRe;
        r.lastIndex = i;
        const mm = r.exec(s);
        if (!mm) break;
        nums.push(Number(mm[1]));
        i = r.lastIndex;
      }
      args.push(...nums);
    } else {
      args.push(...(m[2].match(NUM) ?? []).map(Number));
    }
    out.push({ cmd, args });
  }
  return out;
}

/** Convert an SVG arc to one or more cubic béziers (SVG implementation notes F.6.5). */
function arcToCubics(
  x1: number, y1: number, rx: number, ry: number, phiDeg: number,
  fa: number, fs: number, x2: number, y2: number,
): Cmd[] {
  if (x1 === x2 && y1 === y2) return [];
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (rx === 0 || ry === 0) return [{ c: "L", x: x2, y: y2 }];
  const phi = (phiDeg * Math.PI) / 180;
  const cosP = Math.cos(phi), sinP = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cosP * dx + sinP * dy;
  const y1p = -sinP * dx + cosP * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let coef = Math.sqrt(Math.max(0, num / den));
  if (fa === fs) coef = -coef;
  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);
  const cx = cosP * cxp - sinP * cyp + (x1 + x2) / 2;
  const cy = sinP * cxp + cosP * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTheta = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dTheta > 0) dTheta -= 2 * Math.PI;
  if (fs && dTheta < 0) dTheta += 2 * Math.PI;

  const segs = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const delta = dTheta / segs;
  const t = (4 / 3) * Math.tan(delta / 4);
  const out: Cmd[] = [];
  let th = theta1;
  for (let i = 0; i < segs; i++) {
    const c1 = Math.cos(th), s1 = Math.sin(th);
    const c2 = Math.cos(th + delta), s2 = Math.sin(th + delta);
    const p = (ex: number, ey: number): [number, number] => [
      cosP * rx * ex - sinP * ry * ey + cx,
      sinP * rx * ex + cosP * ry * ey + cy,
    ];
    const [q1x, q1y] = p(c1 - t * s1, s1 + t * c1);
    const [q2x, q2y] = p(c2 + t * s2, s2 - t * c2);
    const [ex, ey] = p(c2, s2);
    out.push({ c: "C", x1: q1x, y1: q1y, x2: q2x, y2: q2y, x: ex, y: ey });
    th += delta;
  }
  return out;
}

/** Parse path data into absolute M/L/C/Z commands. */
export function parsePath(d: string): Cmd[] {
  const out: Cmd[] = [];
  let cx = 0, cy = 0;       // current point
  let sx = 0, sy = 0;       // subpath start
  let lastC: [number, number] | null = null; // last cubic control point (for S)
  let lastQ: [number, number] | null = null; // last quadratic control (for T)

  const quadToCubic = (qx: number, qy: number, x: number, y: number): Cmd => ({
    c: "C",
    x1: cx + (2 / 3) * (qx - cx), y1: cy + (2 / 3) * (qy - cy),
    x2: x + (2 / 3) * (qx - x), y2: y + (2 / 3) * (qy - y),
    x, y,
  });

  for (const { cmd, args } of tokenize(d)) {
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    let i = 0;
    const take = (n: number) => { const a = args.slice(i, i + n); i += n; return a; };

    if (C === "Z") {
      out.push({ c: "Z" }); cx = sx; cy = sy; lastC = lastQ = null;
      continue;
    }
    let first = true;
    while (i < args.length || (first && args.length === 0)) {
      first = false;
      switch (C) {
        case "M": {
          const [x, y] = take(2); if (x === undefined) { i = args.length; break; }
          cx = rel ? cx + x : x; cy = rel ? cy + y : y;
          sx = cx; sy = cy;
          out.push({ c: "M", x: cx, y: cy });
          // subsequent pairs are implicit lineto
          while (i + 1 < args.length) {
            const [lx, ly] = take(2);
            cx = rel ? cx + lx : lx; cy = rel ? cy + ly : ly;
            out.push({ c: "L", x: cx, y: cy });
          }
          lastC = lastQ = null; break;
        }
        case "L": {
          const [x, y] = take(2); if (x === undefined) { i = args.length; break; }
          cx = rel ? cx + x : x; cy = rel ? cy + y : y;
          out.push({ c: "L", x: cx, y: cy }); lastC = lastQ = null; break;
        }
        case "H": {
          const [x] = take(1); if (x === undefined) { i = args.length; break; }
          cx = rel ? cx + x : x; out.push({ c: "L", x: cx, y: cy }); lastC = lastQ = null; break;
        }
        case "V": {
          const [y] = take(1); if (y === undefined) { i = args.length; break; }
          cy = rel ? cy + y : y; out.push({ c: "L", x: cx, y: cy }); lastC = lastQ = null; break;
        }
        case "C": {
          const a = take(6); if (a.length < 6) { i = args.length; break; }
          const [x1, y1, x2, y2, x, y] = rel ? [a[0] + cx, a[1] + cy, a[2] + cx, a[3] + cy, a[4] + cx, a[5] + cy] : a;
          out.push({ c: "C", x1, y1, x2, y2, x, y });
          lastC = [x2, y2]; lastQ = null; cx = x; cy = y; break;
        }
        case "S": {
          const a = take(4); if (a.length < 4) { i = args.length; break; }
          const [x2, y2, x, y] = rel ? [a[0] + cx, a[1] + cy, a[2] + cx, a[3] + cy] : a;
          const [x1, y1]: [number, number] = lastC ? [2 * cx - lastC[0], 2 * cy - lastC[1]] : [cx, cy];
          out.push({ c: "C", x1, y1, x2, y2, x, y });
          lastC = [x2, y2]; lastQ = null; cx = x; cy = y; break;
        }
        case "Q": {
          const a = take(4); if (a.length < 4) { i = args.length; break; }
          const [qx, qy, x, y] = rel ? [a[0] + cx, a[1] + cy, a[2] + cx, a[3] + cy] : a;
          out.push(quadToCubic(qx, qy, x, y));
          lastQ = [qx, qy]; lastC = null; cx = x; cy = y; break;
        }
        case "T": {
          const a = take(2); if (a.length < 2) { i = args.length; break; }
          const [x, y] = rel ? [a[0] + cx, a[1] + cy] : a;
          const qx: number = lastQ ? 2 * cx - lastQ[0] : cx;
          const qy: number = lastQ ? 2 * cy - lastQ[1] : cy;
          out.push(quadToCubic(qx, qy, x, y));
          lastQ = [qx, qy]; lastC = null; cx = x; cy = y; break;
        }
        case "A": {
          const a = take(7); if (a.length < 7) { i = args.length; break; }
          const [rx, ry, phi, fa, fs] = a;
          const x = rel ? a[5] + cx : a[5], y = rel ? a[6] + cy : a[6];
          out.push(...arcToCubics(cx, cy, rx, ry, phi, fa, fs, x, y));
          cx = x; cy = y; lastC = lastQ = null; break;
        }
        default: i = args.length;
      }
    }
  }
  return out;
}

export function transformPath(cmds: Cmd[], m: Matrix): Cmd[] {
  return cmds.map((k) => {
    switch (k.c) {
      case "M": case "L": { const [x, y] = apply(m, k.x, k.y); return { c: k.c, x, y }; }
      case "C": {
        const [x1, y1] = apply(m, k.x1, k.y1);
        const [x2, y2] = apply(m, k.x2, k.y2);
        const [x, y] = apply(m, k.x, k.y);
        return { c: "C", x1, y1, x2, y2, x, y };
      }
      default: return k;
    }
  });
}

const f = (n: number) => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
};

export function serializePath(cmds: Cmd[]): string {
  return cmds
    .map((k) => {
      switch (k.c) {
        case "M": case "L": return `${k.c}${f(k.x)} ${f(k.y)}`;
        case "C": return `C${f(k.x1)} ${f(k.y1)} ${f(k.x2)} ${f(k.y2)} ${f(k.x)} ${f(k.y)}`;
        case "Z": return "Z";
      }
    })
    .join("");
}

/** Bounding box using exact cubic extrema. */
export function pathBBox(cmds: Cmd[]): Rect {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (x: number, y: number) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  };
  let cx = 0, cy = 0;
  for (const k of cmds) {
    if (k.c === "Z") continue;
    if (k.c === "M" || k.c === "L") { add(k.x, k.y); cx = k.x; cy = k.y; continue; }
    add(k.x, k.y);
    for (const [p0, p1, p2, p3, axis] of [
      [cx, k.x1, k.x2, k.x, "x"], [cy, k.y1, k.y2, k.y, "y"],
    ] as [number, number, number, number, "x" | "y"][]) {
      // derivative roots of the cubic
      const a = -p0 + 3 * p1 - 3 * p2 + p3;
      const b = 2 * (p0 - 2 * p1 + p2);
      const c = p1 - p0;
      const ts: number[] = [];
      if (Math.abs(a) < 1e-12) { if (Math.abs(b) > 1e-12) ts.push(-c / b); }
      else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) { const s = Math.sqrt(disc); ts.push((-b + s) / (2 * a), (-b - s) / (2 * a)); }
      }
      for (const t of ts) {
        if (t <= 0 || t >= 1) continue;
        const u = 1 - t;
        const v = u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
        if (axis === "x") add(v, cy); else add(cx, v);
      }
    }
    cx = k.x; cy = k.y;
  }
  if (!isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
