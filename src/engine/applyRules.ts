import type { Figure, Instance, Layer, Rect, Rule } from "../model/types";
import { applyRepeat } from "./rules/repeat";

/** Hard limit on instances per layer. Rules past the one that hits it are skipped. */
export const INSTANCE_CAP = 5000;

export type RuleResult = {
  instances: Instance[];
  /** Index of the rule that hit INSTANCE_CAP, or null when nothing was cut. */
  cappedAtRule: number | null;
};

const ZERO_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

/** One rule: placements in, more placements out. Pure. */
export function applyRule(input: Instance[], rule: Rule, bbox: Rect): Instance[] {
  switch (rule.kind) {
    case "repeat":
      return applyRepeat(input, rule, bbox);
    // Mirror, Ring and Grid arrive in M3; until then they pass placements through.
    case "mirror":
    case "ring":
    case "grid":
      return input;
  }
}

/** Run the whole chain without memoisation. */
export function runRules(layer: Layer, bbox: Rect): RuleResult {
  let instances: Instance[] = [{ figureId: layer.figureId, matrix: layer.base, order: 0 }];
  let cappedAtRule: number | null = null;
  for (let i = 0; i < layer.rules.length; i++) {
    const next = applyRule(instances, layer.rules[i], bbox);
    if (next.length > INSTANCE_CAP) {
      instances = next.slice(0, INSTANCE_CAP);
      cappedAtRule = i;
      break;
    }
    instances = next;
  }
  return { instances, cappedAtRule };
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
