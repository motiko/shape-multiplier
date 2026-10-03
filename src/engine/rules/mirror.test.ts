import { describe, it, expect } from "vitest";
import { applyMirror } from "./mirror";
import { apply, IDENTITY, scaleOf } from "../matrix";
import { instancesBounds } from "../bounds";
import type { Instance, Rect } from "../../model/types";

const bbox: Rect = { x: 0, y: 0, width: 100, height: 50 };
const base: Instance = { figureId: "f", matrix: IDENTITY, order: 0 };
const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe("Mirror rule", () => {
  it("axis x doubles and reflects across the right edge of the group bounds", () => {
    const out = applyMirror([base], { kind: "mirror", axis: "x" }, bbox);
    expect(out).toHaveLength(2);
    expect(out[0].matrix).toEqual(IDENTITY);
    close(apply(out[1].matrix, 0, 10), [200, 10]); // left edge lands at 2 × right edge
    close(apply(out[1].matrix, 100, 10), [100, 10]); // the shared edge stays put
    const b = instancesBounds(out, bbox)!;
    expect([b.x, b.width, b.height]).toEqual([0, 200, 50]);
  });

  it("axis y reflects across the bottom edge", () => {
    const out = applyMirror([base], { kind: "mirror", axis: "y" }, bbox);
    close(apply(out[1].matrix, 10, 0), [10, 100]);
    expect(instancesBounds(out, bbox)!.height).toBe(100);
  });

  it("axis both yields four quadrants meeting at the corner", () => {
    const out = applyMirror([base], { kind: "mirror", axis: "both" }, bbox);
    expect(out).toHaveLength(4);
    close(apply(out[3].matrix, 0, 0), [200, 100]);
    const b = instancesBounds(out, bbox)!;
    expect([b.width, b.height]).toEqual([200, 100]);
    out.forEach((inst, i) => { expect(inst.order).toBe(i); expect(scaleOf(inst.matrix)).toBeCloseTo(1, 9); });
  });

  it("reflects the whole group, not each instance separately", () => {
    const two: Instance[] = [base, { figureId: "f", matrix: [1, 0, 0, 1, 150, 0], order: 1 }];
    const out = applyMirror(two, { kind: "mirror", axis: "x" }, bbox);
    // group right edge is 250; the first instance's reflection starts at 400
    close(apply(out[2].matrix, 0, 0), [500, 0]);
    close(apply(out[3].matrix, 0, 0), [350, 0]);
  });

  it("honours the build limit and passes empty input through", () => {
    expect(applyMirror([base], { kind: "mirror", axis: "both" }, bbox, 3)).toHaveLength(3);
    expect(applyMirror([], { kind: "mirror", axis: "x" }, bbox)).toEqual([]);
  });
});
