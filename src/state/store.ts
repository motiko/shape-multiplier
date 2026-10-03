import { create } from "zustand";
import type { Figure, Layer, Matrix, Rule } from "../model/types";
import { newId, parseSvg } from "../import/svgParser";
import { applyRules } from "../engine/applyRules";
import { fitTransform, instancesBounds } from "../engine/bounds";
import { compose } from "../engine/matrix";
import { PRESETS, type Preset } from "../presets";

type State = {
  figures: Record<string, Figure>;
  layers: Layer[];
  selectedLayerId: string | null;
  canvas: { width: number; height: number; background: string };
  error: string | null;
  addFigure: (f: Figure) => void;
  removeFigure: (id: string) => void;
  addLayer: (figureId: string) => Layer | undefined;
  removeLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;
  setLayerBase: (id: string, base: Matrix) => void;
  addRule: (layerId: string, rule: Rule) => void;
  updateRule: (layerId: string, index: number, patch: Partial<Rule>) => void;
  removeRule: (layerId: string, index: number) => void;
  /** Rescale and recenter a layer's base so every instance fits the canvas. */
  fitLayer: (layerId: string, fill?: number) => void;
  /** Import the preset's figure (reusing a same-named one), place it, add its rules, fit it. */
  loadPreset: (presetId: string) => void;
  setError: (msg: string | null) => void;
};

/** Center a figure on the canvas and fit it to ~40% of the shorter side. */
export function fitMatrix(fig: Figure, cw: number, ch: number): Matrix {
  return fitTransform(fig.bbox, cw, ch, 0.4);
}

export const useStore = create<State>((set, get) => ({
  figures: {},
  layers: [],
  selectedLayerId: null,
  canvas: { width: 1000, height: 1000, background: "transparent" },
  error: null,

  addFigure: (f) => {
    set((s) => ({ figures: { ...s.figures, [f.id]: f }, error: null }));
    // the first imported figure is placed automatically
    if (get().layers.length === 0) get().addLayer(f.id);
  },
  removeFigure: (id) =>
    set((s) => {
      const figures = { ...s.figures };
      delete figures[id];
      const layers = s.layers.filter((l) => l.figureId !== id);
      return { figures, layers, selectedLayerId: layers.some((l) => l.id === s.selectedLayerId) ? s.selectedLayerId : null };
    }),
  addLayer: (figureId) => {
    const { figures, canvas } = get();
    const fig = figures[figureId];
    if (!fig) return undefined;
    const layer: Layer = {
      id: newId("layer"),
      figureId,
      base: fitMatrix(fig, canvas.width, canvas.height),
      rules: [],
      style: { stroke: "currentColor", strokeWidth: 1.5, fill: null },
    };
    set((s) => ({ layers: [...s.layers, layer], selectedLayerId: layer.id }));
    return layer;
  },
  removeLayer: (id) =>
    set((s) => ({ layers: s.layers.filter((l) => l.id !== id), selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId })),
  selectLayer: (id) => set({ selectedLayerId: id }),
  setLayerBase: (id, base) => set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, base } : l)) })),

  addRule: (layerId, rule) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === layerId ? { ...l, rules: [...l.rules, rule] } : l)) })),
  updateRule: (layerId, index, patch) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === layerId
          ? { ...l, rules: l.rules.map((r, i) => (i === index ? ({ ...r, ...patch } as Rule) : r)) }
          : l,
      ),
    })),
  removeRule: (layerId, index) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === layerId ? { ...l, rules: l.rules.filter((_, i) => i !== index) } : l)),
    })),

  fitLayer: (layerId, fill = 0.8) => {
    const { layers, figures, canvas } = get();
    const layer = layers.find((l) => l.id === layerId);
    const fig = layer && figures[layer.figureId];
    if (!layer || !fig) return;
    const bounds = instancesBounds(applyRules(layer, fig), fig.bbox);
    if (!bounds || (bounds.width === 0 && bounds.height === 0)) return;
    const fit = fitTransform(bounds, canvas.width, canvas.height, fill);
    get().setLayerBase(layerId, compose(fit, layer.base));
  },

  loadPreset: (presetId) => {
    const preset: Preset | undefined = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    let fig = Object.values(get().figures).find((f) => f.name === preset.figure.name);
    if (!fig) {
      fig = parseSvg(preset.figure.svg, preset.figure.name);
      set((s) => ({ figures: { ...s.figures, [fig!.id]: fig! }, error: null }));
    }
    const layer = get().addLayer(fig.id);
    if (!layer) return;
    for (const rule of preset.rules) get().addRule(layer.id, rule);
    get().fitLayer(layer.id);
  },

  setError: (error) => set({ error }),
}));
