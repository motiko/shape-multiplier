import { create } from "zustand";
import { temporal } from "zundo";
import type { Figure, Layer, Matrix, Rule } from "../model/types";
import { newId, parseSvg } from "../import/svgParser";
import { applyRules } from "../engine/applyRules";
import { fitTransform, instancesBounds } from "../engine/bounds";
import { compose } from "../engine/matrix";
import { PRESETS, type Preset } from "../presets";

export type CanvasSpec = { width: number; height: number; background: string };

/** The persisted, undoable part of the state. */
export type Doc = { figures: Record<string, Figure>; layers: Layer[]; canvas: CanvasSpec };

export const EMPTY_DOC: Doc = { figures: {}, layers: [], canvas: { width: 1000, height: 1000, background: "transparent" } };

/** Edits closer together than this (slider drags) collapse into one undo step. */
export const UNDO_BURST_MS = 400;
export const HISTORY_LIMIT = 100;

type State = Doc & {
  selectedLayerId: string | null;
  /** Timeline: how many instances (across layers, in order) to draw. null = all. */
  shown: number | null;
  playing: boolean;
  error: string | null;
  addFigure: (f: Figure) => void;
  removeFigure: (id: string) => void;
  addLayer: (figureId: string) => Layer | undefined;
  removeLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;
  setLayerBase: (id: string, base: Matrix) => void;
  /** Append a rule; with `fit` the layer is refitted to the canvas in the same undo step. */
  addRule: (layerId: string, rule: Rule, fit?: boolean) => void;
  updateRule: (layerId: string, index: number, patch: Partial<Rule>) => void;
  removeRule: (layerId: string, index: number) => void;
  /** Move a rule within its layer's chain. Out-of-range targets are clamped. */
  moveRule: (layerId: string, from: number, to: number) => void;
  /** Rescale and recenter a layer's base so every instance fits the canvas. */
  fitLayer: (layerId: string, fill?: number) => void;
  /** Import the preset's figure (reusing a same-named one), place it, add its rules, fit it. */
  loadPreset: (presetId: string) => void;
  /** Replace the whole document (used by localStorage restore). */
  loadDocument: (doc: Doc) => void;
  newDocument: () => void;
  setShown: (n: number | null) => void;
  setPlaying: (p: boolean) => void;
  setError: (msg: string | null) => void;
};

/** Center a figure on the canvas and fit it to ~40% of the shorter side. */
export function fitMatrix(fig: Figure, cw: number, ch: number): Matrix {
  return fitTransform(fig.bbox, cw, ch, 0.4);
}

export const docOf = (s: Doc): Doc => ({ figures: s.figures, layers: s.layers, canvas: s.canvas });

/** Set while a continuous edit (slider drag) runs, so only those edits coalesce in the undo history. */
let continuousEdit = false;

const sameDoc = (a: Doc, b: Doc) => a.figures === b.figures && a.layers === b.layers && a.canvas === b.canvas;

/**
 * Run several store writes as one undo step: history tracking is paused while `fn`
 * runs and a single entry (the pre-transaction document) is pushed afterwards.
 */
export function transaction<T>(fn: () => T): T {
  const t = useStore.temporal.getState();
  if (!t.isTracking) return fn(); // nested: the outer transaction records
  const before = docOf(useStore.getState());
  t.pause();
  let out: T;
  try { out = fn(); } finally { t.resume(); }
  if (!sameDoc(before, docOf(useStore.getState()))) {
    const past = [...useStore.temporal.getState().pastStates, before];
    useStore.temporal.setState({ pastStates: past.slice(-HISTORY_LIMIT), futureStates: [] });
  }
  return out;
}

export const useStore = create<State>()(
  temporal<State, [], [], Doc>(
    (set, get) => ({
      ...EMPTY_DOC,
      selectedLayerId: null,
      shown: null,
      playing: false,
      error: null,

      addFigure: (f) =>
        transaction(() => {
          set((s) => ({ figures: { ...s.figures, [f.id]: f }, error: null }));
          // the first imported figure is placed automatically
          if (get().layers.length === 0) get().addLayer(f.id);
        }),
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

      addRule: (layerId, rule, fit = false) =>
        transaction(() => {
          set((s) => ({ layers: s.layers.map((l) => (l.id === layerId ? { ...l, rules: [...l.rules, rule] } : l)) }));
          if (fit) get().fitLayer(layerId);
        }),
      updateRule: (layerId, index, patch) => {
        continuousEdit = true;
        try {
          set((s) => ({
            layers: s.layers.map((l) =>
              l.id === layerId
                ? { ...l, rules: l.rules.map((r, i) => (i === index ? ({ ...r, ...patch } as Rule) : r)) }
                : l,
            ),
          }));
        } finally {
          continuousEdit = false;
        }
      },
      removeRule: (layerId, index) =>
        set((s) => ({
          layers: s.layers.map((l) => (l.id === layerId ? { ...l, rules: l.rules.filter((_, i) => i !== index) } : l)),
        })),
      moveRule: (layerId, from, to) =>
        set((s) => ({
          layers: s.layers.map((l) => {
            if (l.id !== layerId || from === to || from < 0 || from >= l.rules.length) return l;
            const rules = [...l.rules];
            const [rule] = rules.splice(from, 1);
            rules.splice(Math.max(0, Math.min(rules.length, to)), 0, rule);
            return { ...l, rules };
          }),
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
        transaction(() => {
          let fig = Object.values(get().figures).find((f) => f.name === preset.figure.name);
          if (!fig) {
            fig = parseSvg(preset.figure.svg, preset.figure.name);
            set((s) => ({ figures: { ...s.figures, [fig!.id]: fig! }, error: null }));
          }
          const layer = get().addLayer(fig.id);
          if (!layer) return;
          for (const rule of preset.rules) get().addRule(layer.id, rule);
          get().fitLayer(layer.id);
        });
      },

      loadDocument: (doc) =>
        set({ figures: doc.figures, layers: doc.layers, canvas: doc.canvas, selectedLayerId: doc.layers.at(-1)?.id ?? null, shown: null, playing: false, error: null }),
      newDocument: () => set({ ...EMPTY_DOC, selectedLayerId: null, shown: null, playing: false, error: null }),

      setShown: (shown) => set({ shown: shown === null ? null : Math.max(0, Math.floor(shown)) }),
      setPlaying: (playing) => set({ playing }),
      setError: (error) => set({ error }),
    }),
    {
      partialize: docOf,
      equality: (a, b) => a.figures === b.figures && a.layers === b.layers && a.canvas === b.canvas,
      limit: HISTORY_LIMIT,
      // Discrete actions (add rule, preset, delete) always record a step. Continuous edits
      // (slider drags) are throttled on the leading edge: the first change of a burst records
      // the pre-drag state and the rest of the burst is skipped, so one undo reverts the whole drag.
      handleSet: (handleSet) => {
        // zundo types the inner handler as setState, but at runtime it is the 4-arg history push
        const push = handleSet as unknown as (past: Doc, replace: unknown, current: Doc, delta?: Partial<Doc> | null) => void;
        let last = -Infinity;
        return (pastState, replace, current, delta) => {
          if (!continuousEdit) { last = -Infinity; push(pastState as Doc, replace, current, delta); return; }
          const now = Date.now();
          const inBurst = now - last < UNDO_BURST_MS;
          last = now;
          if (inBurst) return;
          push(pastState as Doc, replace, current, delta);
        };
      },
    },
  ),
);

/** Reset everything, including undo history. For tests and "New". */
export function resetStore(): void {
  useStore.getState().newDocument();
  useStore.temporal.getState().clear();
}
