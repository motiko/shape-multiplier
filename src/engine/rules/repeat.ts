import type { Instance, Matrix, Rect, Repeat } from "../../model/types";
import { compose, fromTRS } from "../matrix";

export const DEFAULT_REPEAT: Repeat = {
  kind: "repeat",
  count: 10,
  rotateStep: 15,
  scaleStep: 1.15,
  translateStep: [0, 0],
  pivot: "center",
};

/** Resolve a pivot setting to a point in figure space. */
export function pivotOf(pivot: Repeat["pivot"], bbox: Rect): [number, number] {
  if (pivot === "origin") return [0, 0];
  if (pivot === "center") return [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2];
  return pivot;
}

/** The per-step transform in figure space: translate, then rotate and scale about the pivot. */
export function stepMatrix(rule: Repeat, bbox: Rect): Matrix {
  const [px, py] = pivotOf(rule.pivot, bbox);
  return fromTRS({
    tx: rule.translateStep[0],
    ty: rule.translateStep[1],
    rotateDeg: rule.rotateStep,
    sx: rule.scaleStep,
    px,
    py,
  });
}

/**
 * Repeat: every incoming placement is kept and followed by `count` further copies,
 * each one more step away. Output length is input.length × (count + 1).
 * The step is applied in figure space, so a "center" pivot means each copy
 * rotates and grows about its own figure center regardless of earlier rules.
 */
export function applyRepeat(input: Instance[], rule: Repeat, bbox: Rect, limit = Infinity): Instance[] {
  const count = Math.max(0, Math.floor(rule.count));
  const step = stepMatrix(rule, bbox);
  const out: Instance[] = [];
  for (const inst of input) {
    let m = inst.matrix;
    if (out.length >= limit) break;
    out.push({ figureId: inst.figureId, matrix: m, order: out.length });
    for (let i = 1; i <= count && out.length < limit; i++) {
      m = compose(m, step);
      out.push({ figureId: inst.figureId, matrix: m, order: out.length });
    }
  }
  return out;
}
