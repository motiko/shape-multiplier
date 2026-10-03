import type { Figure, Instance, Layer, Rect, Rule } from "../model/types";
import { applyRepeat } from "./rules/repeat";
import { applyMirror } from "./rules/mirror";
import { applyRing } from "./rules/ring";
import { applyGrid } from "./rules/grid";
import { outputCount } from "./rules";

/** Hard limit on instances per layer. Rules past the one that hits it are skipped. */
export const INSTANCE_CAP = 5000;

export type RuleResult = {
  instances: Instance[];
  /** Index of the rule that hit INSTANCE_CAP, or null when nothing was cut. */
  cappedAtRule: number | null;
  /** Instance count after each rule (before capping). Rules skipped after the cap keep their predicted count. */
  counts: number[];
};

const ZERO_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

/** One rule: placements in, more placements out. Pure. */
export function applyRule(input: Instance[], rule: Rule, bbox: Rect, limit = Infinity): Instance[] {
  switch (rule.kind) {
    case "repeat": return applyRepeat(input, rule, bbox, limit);
    case "mirror": return applyMirror(input, rule, bbox, limit);
    case "ring": return applyRing(input, rule, bbox, limit);
    case "grid": return applyGrid(input, rule, bbox, limit);
  }
}

/** Run the whole chain without memoisation. */
export function runRules(layer: Layer, bbox: Rect): RuleResult {
  let instances: Instance[] = [{ figureId: layer.figureId, matrix: layer.base, order: 0 }];
  let cappedAtRule: number | null = null;
  const counts: number[] = [];
  let predicted = 1; // uncapped count, so skipped rules still show their real multiplier
  for (let i = 0; i < layer.rules.length; i++) {
    const rule = layer.rules[i];
    predicted = outputCount(rule, predicted);
    counts.push(predicted);
    if (cappedAtRule !== null) continue; // skipped: only predict
    instances = applyRule(instances, rule, bbox, INSTANCE_CAP); // builds at most INSTANCE_CAP, never the whole explosion
    if (predicted > INSTANCE_CAP) cappedAtRule = i;
  }
  return { instances, cappedAtRule, counts };
}

const cache = new WeakMap<Layer, { bbox: Rect; result: RuleResult }>();

/**
 * Memoised on the layer object and the figure's bbox. The store replaces the layer
 * object on every edit, so a cache hit means nothing relevant changed.
 */
export function applyRulesDetailed(layer: Layer, figure?: Pick<Figure, "bbox">): RuleResult {
  const bbox = figure?.bbox ?? ZERO_RECT;
  const hit = cache.get(layer);
  if (hit && hit.bbox === bbox) return hit.result;
  const result = runRules(layer, bbox);
  cache.set(layer, { bbox, result });
  return result;
}

export function applyRules(layer: Layer, figure?: Pick<Figure, "bbox">): Instance[] {
  return applyRulesDetailed(layer, figure).instances;
}
