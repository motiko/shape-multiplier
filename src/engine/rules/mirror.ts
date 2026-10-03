import type { Instance, Matrix, Mirror, Rect } from "../../model/types";
import { compose } from "../matrix";
import { instancesBounds } from "../bounds";

export const DEFAULT_MIRROR: Mirror = { kind: "mirror", axis: "x" };

/**
 * Mirror: reflects every incoming placement across the right edge (axis "x"),
 * the bottom edge (axis "y") or both edges plus the corner (axis "both") of the
 * current group bounds, so the reflection sits next to the original instead of on top of it.
 * Output length is n × 2 or n × 4.
 */
export function applyMirror(input: Instance[], rule: Mirror, bbox: Rect, limit = Infinity): Instance[] {
  const b = instancesBounds(input, bbox);
  if (!b) return input;
  const right = b.x + b.width, bottom = b.y + b.height;
  const flipX: Matrix = [-1, 0, 0, 1, 2 * right, 0];
  const flipY: Matrix = [1, 0, 0, -1, 0, 2 * bottom];
  const flips: Matrix[] =
    rule.axis === "x" ? [flipX] : rule.axis === "y" ? [flipY] : [flipX, flipY, compose(flipX, flipY)];

  const out: Instance[] = input.slice(0, limit).map((inst, i) => ({ ...inst, order: i }));
  for (const f of flips) {
    for (const inst of input) {
      if (out.length >= limit) return out;
      out.push({ figureId: inst.figureId, matrix: compose(f, inst.matrix), order: out.length });
    }
  }
  return out;
}
