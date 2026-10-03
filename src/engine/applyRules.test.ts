import { describe, it, expect } from "vitest";
import { applyRules, applyRulesDetailed, runRules, INSTANCE_CAP } from "./applyRules";
import { DEFAULT_REPEAT } from "./rules/repeat";
import { IDENTITY } from "./matrix";
import type { Figure, Layer } from "../model/types";

const fig: Figure = { id: "f", name: "sq", pathData: "M0 0H100V100H0Z", bbox: { x: 0, y: 0, width: 100, height: 100 }, warnings: [] };
const layer = (rules: Layer["rules"]): Layer => ({
  id: "l", figureId: "f", base: IDENTITY, rules, style: { stroke: "#000", strokeWidth: 1, fill: null },
});

describe("applyRules", () => {
  it("a layer without rules yields its base placement", () => {
    const out = applyRules(layer([]), fig);
    expect(out).toEqual([{ figureId: "f", matrix: IDENTITY, order: 0 }]);
  });

  it("rules run in order and multiply the instance count", () => {
    const out = applyRules(layer([{ ...DEFAULT_REPEAT, count: 2 }, { ...DEFAULT_REPEAT, count: 3 }]), fig);
    expect(out).toHaveLength(3 * 4);
  });

  it("all four rule kinds take part in the chain", () => {
    const out = applyRulesDetailed(layer([
      { ...DEFAULT_REPEAT, count: 2 },           // 3
      { kind: "mirror", axis: "x" },             // 6
      { kind: "ring", count: 5, radius: 100, alignToTangent: true }, // 30
      { kind: "grid", cols: 2, rows: 2, gap: 0 }, // 120
    ]), fig);
    expect(out.counts).toEqual([3, 6, 30, 120]);
    expect(out.instances).toHaveLength(120);
    expect(out.cappedAtRule).toBeNull();
  });

  it("is memoised on the layer object", () => {
    const l = layer([DEFAULT_REPEAT]);
    expect(applyRules(l, fig)).toBe(applyRules(l, fig));
    expect(applyRules({ ...l }, fig)).not.toBe(applyRules(l, fig));
    expect(applyRules({ ...l }, fig)).toEqual(applyRules(l, fig));
  });

  it("recomputes when the figure bbox changes", () => {
    const l = layer([DEFAULT_REPEAT]);
    const a = applyRules(l, fig);
    const b = applyRules(l, { ...fig, bbox: { x: 0, y: 0, width: 10, height: 10 } });
    expect(a).not.toBe(b);
  });

  it("stops at the instance cap and reports the rule that hit it", () => {
    const big = { ...DEFAULT_REPEAT, count: 40 }; // 41 per rule
    const l = layer([big, big, big]); // 41 → 1681 → 68921
    const { instances, cappedAtRule, counts } = applyRulesDetailed(l, fig);
    expect(instances).toHaveLength(INSTANCE_CAP);
    expect(cappedAtRule).toBe(2);
    expect(counts).toEqual([41, 1681, 68921]);
    expect(runRules(layer([big, big]), fig.bbox).cappedAtRule).toBeNull();
  });

  it("rules after the capped one are predicted but not applied", () => {
    const grid = { kind: "grid", cols: 20, rows: 20, gap: 0 } as const; // 400 → 160000
    const { instances, cappedAtRule, counts } = runRules(layer([grid, grid, { kind: "mirror", axis: "x" }]), fig.bbox);
    expect(cappedAtRule).toBe(1);
    expect(instances).toHaveLength(INSTANCE_CAP);
    expect(counts).toEqual([400, 160000, 320000]);
  });
});
