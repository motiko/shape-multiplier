import { describe, it, expect } from "vitest";
import { parsePath, serializePath, pathBBox, transformPath } from "./pathData";
import { translate } from "../engine/matrix";

describe("pathData", () => {
  it("parses relative and shorthand commands into absolute M/L/C/Z", () => {
    const cmds = parsePath("m10 10 h20 v20 h-20 z");
    expect(cmds.map((c) => c.c)).toEqual(["M", "L", "L", "L", "Z"]);
    expect(pathBBox(cmds)).toEqual({ x: 10, y: 10, width: 20, height: 20 });
  });
  it("handles implicit lineto after moveto and S/T reflection", () => {
    const cmds = parsePath("M0 0 10 0 10 10 C 20 10 20 20 10 20 S 0 30 10 30 Q 15 35 10 40 T 10 50");
    expect(cmds.filter((c) => c.c === "L")).toHaveLength(2);
    expect(cmds.filter((c) => c.c === "C")).toHaveLength(4);
    const last = cmds[cmds.length - 1];
    expect(last.c === "C" && last.x === 10 && last.y === 50).toBe(true);
  });
  it("converts arcs to cubics with the right bbox", () => {
    // full circle of radius 50 at (50,50)
    const cmds = parsePath("M100 50A50 50 0 1 0 0 50A50 50 0 1 0 100 50Z");
    const bb = pathBBox(cmds);
    expect(bb.x).toBeCloseTo(0, 2);
    expect(bb.y).toBeCloseTo(0, 2);
    expect(bb.width).toBeCloseTo(100, 2);
    expect(bb.height).toBeCloseTo(100, 2);
  });
  it("parses glued arc flags", () => {
    const cmds = parsePath("M0 0a5 5 0 0110 0");
    expect(cmds.some((c) => c.c === "C")).toBe(true);
  });
  it("transforms and serializes", () => {
    const d = serializePath(transformPath(parsePath("M0 0L10 0"), translate(5, 5)));
    expect(d).toBe("M5 5L15 5");
  });
  it("bbox uses cubic extrema, not control points", () => {
    const cmds = parsePath("M0 0C0 100 100 100 100 0");
    const bb = pathBBox(cmds);
    expect(bb.height).toBeCloseTo(75, 6);
  });
});
