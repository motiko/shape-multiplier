import type { Instance, Rect, Ring } from "../../model/types";
import { compose, IDENTITY, rotate, translate } from "../matrix";
import { instancesBounds } from "../bounds";

export const DEFAULT_RING: Ring = { kind: "ring", count: 6, radius: 200, alignToTangent: true };

/** First copy sits at the top; the rest follow clockwise. */
export const RING_START_DEG = -90;

/**
 * Ring: places `count` copies of the incoming group on a circle of `radius`
 * (canvas units) around the group's center. With alignToTangent each copy is
 * also rotated by its angle so it keeps its orientation relative to the center.
 * Output length is n × count.
 */
export function applyRing(input: Instance[], rule: Ring, bbox: Rect, limit = Infinity): Instance[] {
  const count = Math.max(1, Math.floor(rule.count));
  const b = instancesBounds(input, bbox);
  if (!b) return input;
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;

  const out: Instance[] = [];
  for (let i = 0; i < count; i++) {
    const deg = RING_START_DEG + (360 * i) / count;
    const rad = (deg * Math.PI) / 180;
    const place = compose(
      translate(rule.radius * Math.cos(rad), rule.radius * Math.sin(rad)),
      rule.alignToTangent ? rotate(deg - RING_START_DEG, cx, cy) : IDENTITY,
    );
    for (const inst of input) {
      if (out.length >= limit) return out;
      out.push({ figureId: inst.figureId, matrix: compose(place, inst.matrix), order: out.length });
    }
  }
  return out;
}
