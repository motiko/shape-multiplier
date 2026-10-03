import { describe, it, expect, beforeEach } from "vitest";
import { PRESETS } from "./presets";
import { useStore, resetStore } from "./state/store";
import { applyRulesDetailed } from "./engine/applyRules";
import { instancesBounds } from "./engine/bounds";

describe("presets", () => {
  beforeEach(resetStore);

  it("there are three, with distinct ids and figures", () => {
    expect(PRESETS.map((p) => p.id)).toEqual(["spiral", "rosette", "tile"]);
    expect(new Set(PRESETS.map((p) => p.figure.name)).size).toBe(3);
  });

  it.each(PRESETS.map((p) => [p.id, p] as const))("%s loads, multiplies, stays under the cap and fits the canvas", (_id, preset) => {
    useStore.getState().loadPreset(preset.id);
    const { figures, layers, canvas } = useStore.getState();
    const layer = layers.at(-1)!;
    const fig = figures[layer.figureId];
    expect(fig.name).toBe(preset.figure.name);
    expect(layer.rules).toEqual(preset.rules);
    const { instances, cappedAtRule } = applyRulesDetailed(layer, fig);
    expect(cappedAtRule).toBeNull();
    expect(instances.length).toBeGreaterThan(1);
    const b = instancesBounds(instances, fig.bbox)!;
    expect(b.x).toBeGreaterThanOrEqual(-1e-6);
    expect(b.y).toBeGreaterThanOrEqual(-1e-6);
    expect(b.x + b.width).toBeLessThanOrEqual(canvas.width + 1e-6);
    expect(b.y + b.height).toBeLessThanOrEqual(canvas.height + 1e-6);
  });

  it("unknown preset ids are ignored", () => {
    useStore.getState().loadPreset("nope");
    expect(useStore.getState().layers).toHaveLength(0);
  });
});
