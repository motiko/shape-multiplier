import { describe, it, expect } from "vitest";
import { compose, composeAll, invert, apply, rotate, scale, translate, parseTransform, fromTRS, IDENTITY } from "./matrix";

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe("matrix", () => {
  it("compose applies the right-hand matrix first", () => {
    const m = compose(translate(10, 0), scale(2));
    close(apply(m, 1, 1), [12, 2]);
  });
  it("invert round-trips", () => {
    const m = composeAll(translate(3, -7), rotate(33), scale(1.7, 0.4));
    close(compose(m, invert(m)), IDENTITY);
  });
  it("rotate about a point keeps the point fixed", () => {
    close(apply(rotate(90, 5, 5), 5, 5), [5, 5]);
    close(apply(rotate(90, 5, 5), 6, 5), [5, 6]);
  });
  it("parseTransform matches SVG order", () => {
    const m = parseTransform("translate(100,100) rotate(45) scale(2)");
    close(apply(m, 1, 0), [100 + 2 * Math.SQRT1_2, 100 + 2 * Math.SQRT1_2]);
    close(parseTransform("matrix(1 2 3 4 5 6)"), [1, 2, 3, 4, 5, 6]);
    close(parseTransform(null), IDENTITY);
  });
  it("fromTRS pivots correctly", () => {
    const m = fromTRS({ rotateDeg: 180, sx: 2, px: 10, py: 10 });
    close(apply(m, 10, 10), [10, 10]);
    close(apply(m, 11, 10), [8, 10]);
  });
  it("spiral preset: 10th step is 150° and ×1.15^10", () => {
    let m = IDENTITY;
    for (let i = 0; i < 10; i++) m = compose(m, fromTRS({ rotateDeg: 15, sx: 1.15 }));
    const s = Math.hypot(m[0], m[1]);
    expect(s).toBeCloseTo(Math.pow(1.15, 10), 6);
    expect((Math.atan2(m[1], m[0]) * 180) / Math.PI).toBeCloseTo(150, 6);
  });
});
