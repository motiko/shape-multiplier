import { describe, it, expect } from "vitest";
import { defaultRule, outputCount, RULE_KINDS } from "./index";
import { DEFAULT_REPEAT } from "./repeat";

describe("rule registry", () => {
  it("defaultRule returns a fresh copy for every kind", () => {
    for (const k of RULE_KINDS) expect(defaultRule(k).kind).toBe(k);
    const r = defaultRule("repeat");
    expect(r).toEqual(DEFAULT_REPEAT);
    expect(r).not.toBe(DEFAULT_REPEAT);
    if (r.kind === "repeat") expect(r.translateStep).not.toBe(DEFAULT_REPEAT.translateStep);
  });
  it("outputCount predicts each rule's multiplier", () => {
    expect(outputCount({ kind: "repeat", count: 10, rotateStep: 0, scaleStep: 1, translateStep: [0, 0], pivot: "center" }, 2)).toBe(22);
    expect(outputCount({ kind: "mirror", axis: "x" }, 3)).toBe(6);
    expect(outputCount({ kind: "mirror", axis: "both" }, 3)).toBe(12);
    expect(outputCount({ kind: "ring", count: 6, radius: 1, alignToTangent: true }, 2)).toBe(12);
    expect(outputCount({ kind: "grid", cols: 4, rows: 5, gap: 0 }, 2)).toBe(40);
  });
});
