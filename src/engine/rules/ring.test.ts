import { describe, it, expect } from "vitest";
import { applyRing } from "./ring";
import { apply, IDENTITY } from "../matrix";
import type { Instance, Rect } from "../../model/types";

const bbox: Rect = { x: 0, y: 0, width: 100, height: 100 };
const base: Instance = { figureId: "f", matrix: IDENTITY, order: 0 };
const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe("Ring rule", () => {
  it("places count copies evenly on a circle around the group center, first one at the top", () => {
    const out = applyRing([base], { kind: "ring", count: 4, radius: 200, alignToTangent: false }, bbox);
    expect(out).toHaveLength(4);
    const centers = out.map((i) => apply(i.matrix, 50, 50));
    close(centers[0], [50, -150]);
    close(centers[1], [250, 50]);
    close(centers[2], [50, 250]);
    close(centers[3], [-150, 50]);
    // without alignment every copy keeps its orientation
    out.forEach((i) => close(i.matrix.slice(0, 4), [1, 0, 0, 1]));
  });

  it("alignToTangent rotates each copy by its angle", () => {
    const out = applyRing([base], { kind: "ring", count: 4, radius: 200, alignToTangent: true }, bbox);
    // second copy (90° clockwise): figure's +x axis now points down (+y)
    close(out[1].matrix.slice(0, 4), [0, 1, -1, 0]);
    close(apply(out[1].matrix, 50, 50), [250, 50]); // the center still lands on the circle
    close(apply(out[2].matrix, 50, 0), [50, 300]); // top-middle of copy 3 points away from the center
  });

  it("multiplies the whole group and keeps order sequential", () => {
    const two: Instance[] = [base, { figureId: "f", matrix: [1, 0, 0, 1, 100, 0], order: 1 }];
    const out = applyRing(two, { kind: "ring", count: 3, radius: 50, alignToTangent: true }, bbox);
    expect(out).toHaveLength(6);
    expect(out.map((i) => i.order)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("clamps count to at least 1 and honours the build limit", () => {
    expect(applyRing([base], { kind: "ring", count: 0, radius: 10, alignToTangent: false }, bbox)).toHaveLength(1);
    expect(applyRing([base], { kind: "ring", count: 12, radius: 10, alignToTangent: false }, bbox, 5)).toHaveLength(5);
  });
});
