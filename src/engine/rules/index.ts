import type { Rule } from "../../model/types";
import { DEFAULT_REPEAT } from "./repeat";
import { DEFAULT_MIRROR } from "./mirror";
import { DEFAULT_RING } from "./ring";
import { DEFAULT_GRID } from "./grid";

export const RULE_KINDS = ["repeat", "mirror", "ring", "grid"] as const;
export type RuleKind = Rule["kind"];

const DEFAULTS: Record<RuleKind, Rule> = {
  repeat: DEFAULT_REPEAT,
  mirror: DEFAULT_MIRROR,
  ring: DEFAULT_RING,
  grid: DEFAULT_GRID,
};

/** A fresh rule of the given kind with sensible defaults. */
export function defaultRule(kind: RuleKind): Rule {
  const d = DEFAULTS[kind];
  return d.kind === "repeat" ? { ...d, translateStep: [...d.translateStep] } : { ...d };
}

/** How many instances a rule produces from n inputs. */
export function outputCount(rule: Rule, n: number): number {
  switch (rule.kind) {
    case "repeat": return n * (Math.max(0, Math.floor(rule.count)) + 1);
    case "mirror": return n * (rule.axis === "both" ? 4 : 2);
    case "ring": return n * Math.max(1, Math.floor(rule.count));
    case "grid": return n * Math.max(1, Math.floor(rule.cols)) * Math.max(1, Math.floor(rule.rows));
  }
}
