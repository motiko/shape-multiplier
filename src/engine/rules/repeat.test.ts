import { describe, it, expect } from "vitest";
import { applyRepeat, pivotOf, stepMatrix, DEFAULT_REPEAT } from "./repeat";
import { apply, IDENTITY, scaleOf } from "../matrix";
import type { Instance, Rect } from "../../model/types";

const bbox: Rect = { x: 10, y: 10, width: 80, height: 80 };
const base: Instance = { figureId: "f", matrix: IDENTITY, order: 0 };
const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe("Repeat rule", () => {
  it("outputs n × (count + 1) instances with sequential order", () => {
    const out = applyRepeat([base, base], DEFAULT_REPEAT, bbox);
    expect(out).toHaveLength(22);
    expect(out.map((i) => i.order)).toEqual([...Array(22).keys()]);
    expect(out[0].matrix).toEqual(IDENTITY);
  });

  it("count 0 keeps the input unchanged", () => {
    expect(applyRepeat([base], { ...DEFAULT_REPEAT, count: 0 }, bbox)).toHaveLength(1);
  });

  it("spiral preset: 10th copy is rotated 150° and scaled 1.15^10 ≈ 4.05", () => {
    const out = applyRepeat([base], DEFAULT_REPEAT, bbox);
    const m = out[10].matrix;
    expect(scaleOf(m)).toBeCloseTo(Math.pow(1.15, 10), 6);
    expect(scaleOf(m)).toBeCloseTo(4.0456, 3);
    expect((Math.atan2(m[1], m[0]) * 180) / Math.PI).toBeCloseTo(150, 6);
  });

  it("pivot 'center' keeps the figure center fixed on every copy", () => {
    const [cx, cy] = pivotOf("center", bbox);
    expect([cx, cy]).toEqual([50, 50]);
    for (const inst of applyRepeat([base], DEFAULT_REPEAT, bbox)) close(apply(inst.matrix, cx, cy), [cx, cy]);
  });

  it("pivot 'origin' and explicit pivots resolve correctly", () => {
    expect(pivotOf("origin", bbox)).toEqual([0, 0]);
    expect(pivotOf([3, 4], bbox)).toEqual([3, 4]);
    const m = stepMatrix({ ...DEFAULT_REPEAT, rotateStep: 90, scaleStep: 1, pivot: [3, 4] }, bbox);
    close(apply(m, 3, 4), [3, 4]);
    close(apply(m, 4, 4), [3, 5]);
  });

  it("translateStep moves each copy by the step in figure space", () => {
    const rule = { ...DEFAULT_REPEAT, count: 3, rotateStep: 0, scaleStep: 1, translateStep: [5, -2] as [number, number] };
    const out = applyRepeat([base], rule, bbox);
    close(apply(out[3].matrix, 0, 0), [15, -6]);
  });

  it("composes on top of the incoming placement", () => {
    const placed: Instance = { figureId: "f", matrix: [2, 0, 0, 2, 100, 100], order: 0 };
    const out = applyRepeat([placed], { ...DEFAULT_REPEAT, count: 1 }, bbox);
    // the figure center stays put in canvas space: base maps (50,50) → (200,200)
    close(apply(out[1].matrix, 50, 50), [200, 200]);
    expect(scaleOf(out[1].matrix)).toBeCloseTo(2 * 1.15, 6);
  });
});
