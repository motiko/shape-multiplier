import type { Grid, Instance, Rect } from "../../model/types";
import { compose, translate } from "../matrix";
import { instancesBounds } from "../bounds";

export const DEFAULT_GRID: Grid = { kind: "grid", cols: 3, rows: 3, gap: 20 };

/**
 * Grid: tiles the incoming group `cols` × `rows` times, each cell one group
 * bounds plus `gap` (canvas units) apart, row-major from the original.
 * Output length is n × cols × rows.
 */
export function applyGrid(input: Instance[], rule: Grid, bbox: Rect, limit = Infinity): Instance[] {
  const cols = Math.max(1, Math.floor(rule.cols)), rows = Math.max(1, Math.floor(rule.rows));
  const b = instancesBounds(input, bbox);
  if (!b) return input;
  const dx = b.width + rule.gap, dy = b.height + rule.gap;

  const out: Instance[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = translate(c * dx, r * dy);
      for (const inst of input) {
        if (out.length >= limit) return out;
        out.push({ figureId: inst.figureId, matrix: compose(t, inst.matrix), order: out.length });
      }
    }
  }
  return out;
}
