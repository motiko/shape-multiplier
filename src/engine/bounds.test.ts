import { describe, it, expect } from "vitest";
import { transformRect, unionRect, instancesBounds, fitTransform } from "./bounds";
import { apply, rotate } from "./matrix";
import { applyRepeat, DEFAULT_REPEAT } from "./rules/repeat";

const r = { x: 0, y: 0, width: 100, height: 100 };

describe("bounds", () => {
  it("transformRect of a 45° rotated square is its diagonal", () => {
    const b = transformRect(rotate(45, 50, 50), r);
    expect(b.width).toBeCloseTo(100 * Math.SQRT2, 6);
    expect(b.x).toBeCloseTo(50 - 50 * Math.SQRT2, 6);
  });
  it("unionRect covers both", () => {
    expect(unionRect(r, { x: 50, y: -10, width: 100, height: 20 })).toEqual({ x: 0, y: -10, width: 150, height: 110 });
  });
  it("spiral bounds are centered on the pivot and scale with the largest copy", () => {
    const inst = applyRepeat([{ figureId: "f", matrix: [1, 0, 0, 1, 0, 0], order: 0 }], DEFAULT_REPEAT, r);
    const b = instancesBounds(inst, r)!;
    expect(b.x + b.width / 2).toBeCloseTo(50, 6);
    expect(b.width).toBeGreaterThan(100 * Math.pow(1.15, 10));
    expect(instancesBounds([], r)).toBeNull();
  });
  it("fitTransform centers and scales bounds into the canvas", () => {
    const m = fitTransform({ x: 100, y: 100, width: 200, height: 100 }, 1000, 500, 0.8);
    expect(apply(m, 200, 150)).toEqual([500, 250]);
    expect(m[0]).toBeCloseTo(2, 6); // 500*0.8 / 200
  });
});
