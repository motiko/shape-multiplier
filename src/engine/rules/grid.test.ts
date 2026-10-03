import { describe, it, expect } from "vitest";
import { applyGrid } from "./grid";
import { apply, IDENTITY } from "../matrix";
import { instancesBounds } from "../bounds";
import type { Instance, Rect } from "../../model/types";

const bbox: Rect = { x: 0, y: 0, width: 100, height: 50 };
const base: Instance = { figureId: "f", matrix: IDENTITY, order: 0 };
const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe("Grid rule", () => {
  it("tiles cols × rows row-major with the gap between cells", () => {
    const out = applyGrid([base], { kind: "grid", cols: 3, rows: 2, gap: 10 }, bbox);
    expect(out).toHaveLength(6);
    close(apply(out[0].matrix, 0, 0), [0, 0]);
    close(apply(out[1].matrix, 0, 0), [110, 0]);
    close(apply(out[2].matrix, 0, 0), [220, 0]);
    close(apply(out[3].matrix, 0, 0), [0, 60]);
    const b = instancesBounds(out, bbox)!;
    expect([b.width, b.height]).toEqual([320, 110]);
  });

  it("uses the group bounds as the cell, so stacked rules tile the whole group", () => {
    const two: Instance[] = [base, { figureId: "f", matrix: [1, 0, 0, 1, 100, 0], order: 1 }];
    const out = applyGrid(two, { kind: "grid", cols: 2, rows: 1, gap: 0 }, bbox);
    expect(out).toHaveLength(4);
    close(apply(out[2].matrix, 0, 0), [200, 0]);
    close(apply(out[3].matrix, 0, 0), [300, 0]);
  });

  it("negative gap overlaps, 1×1 is identity, limit is honoured", () => {
    const out = applyGrid([base], { kind: "grid", cols: 2, rows: 1, gap: -50 }, bbox);
    close(apply(out[1].matrix, 0, 0), [50, 0]);
    expect(applyGrid([base], { kind: "grid", cols: 1, rows: 1, gap: 99 }, bbox)[0].matrix).toEqual(IDENTITY);
    expect(applyGrid([base], { kind: "grid", cols: 20, rows: 20, gap: 0 }, bbox, 7)).toHaveLength(7);
  });
});
