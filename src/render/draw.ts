import type { Figure, Instance, Layer } from "../model/types";
import { applyRules } from "../engine/applyRules";
import { scaleOf } from "../engine/matrix";

/** Everything the renderer and the exporters need. Taken straight from the store. */
export type Scene = {
  figures: Record<string, Figure>;
  layers: Layer[];
  selectedLayerId?: string | null;
  /** Instances to draw across all layers in order; null or undefined = all. */
  shown?: number | null;
};

export type LayerInstances = { layer: Layer; figure: Figure; instances: Instance[] };

/** Per-layer instance lists (memoised by the engine) for layers whose figure exists. */
export function sceneInstances(scene: Pick<Scene, "figures" | "layers">): LayerInstances[] {
  const out: LayerInstances[] = [];
  for (const layer of scene.layers) {
    const figure = scene.figures[layer.figureId];
    if (figure) out.push({ layer, figure, instances: applyRules(layer, figure) });
  }
  return out;
}

export function totalInstances(scene: Pick<Scene, "figures" | "layers">): number {
  return sceneInstances(scene).reduce((n, l) => n + l.instances.length, 0);
}

/**
 * Walks the scene in draw order, handing out at most `shown` instances in total.
 * Used by the canvas and both exporters so they agree on what the timeline shows.
 */
export function visibleInstances(scene: Scene): { layer: Layer; figure: Figure; instances: Instance[] }[] {
  let budget = scene.shown ?? Infinity;
  const out: LayerInstances[] = [];
  for (const l of sceneInstances(scene)) {
    if (budget <= 0) break;
    const instances = l.instances.length <= budget ? l.instances : l.instances.slice(0, budget);
    budget -= instances.length;
    out.push({ ...l, instances });
  }
  return out;
}

export type DrawOptions = {
  /** Device pixels per design unit. */
  k: number;
  /** Multiplier from a layer's stroke width (CSS px) to device px. On screen this is the devicePixelRatio. */
  strokeScale: number;
  /** Color used for `currentColor` strokes and fills. */
  fg: string;
  /** Fill for the whole canvas; "transparent" / null leaves it clear. */
  background?: string | null;
  width: number;
  height: number;
};

const pathCache = new WeakMap<Figure, Path2D>();
export function pathFor(fig: Figure): Path2D {
  let p = pathCache.get(fig);
  if (!p) { p = new Path2D(fig.pathData); pathCache.set(fig, p); }
  return p;
}

/** Draws the scene onto a 2D context. The context's transform is reset first. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene, o: DrawOptions): void {
  const W = Math.round(o.width * o.k), H = Math.round(o.height * o.k);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (o.background && o.background !== "transparent") { ctx.fillStyle = o.background; ctx.fillRect(0, 0, W, H); }

  const color = (c: string) => (c === "currentColor" ? o.fg : c);
  for (const { layer, figure, instances } of visibleInstances(scene)) {
    const path = pathFor(figure);
    const dim = scene.selectedLayerId && layer.id !== scene.selectedLayerId;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalAlpha = dim ? 0.55 : 1;
    for (const inst of instances) {
      const m = inst.matrix;
      ctx.setTransform(m[0] * o.k, m[1] * o.k, m[2] * o.k, m[3] * o.k, m[4] * o.k, m[5] * o.k);
      // non-scaling stroke: constant width on the output regardless of the instance's scale
      ctx.lineWidth = (layer.style.strokeWidth * o.strokeScale) / (scaleOf(m) * o.k);
      if (layer.style.fill) { ctx.fillStyle = color(layer.style.fill); ctx.fill(path); }
      ctx.strokeStyle = color(layer.style.stroke);
      ctx.stroke(path);
    }
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
