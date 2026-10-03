import { useEffect, useMemo, useRef } from "react";
import { useStore } from "../state/store";
import { applyRules } from "../engine/applyRules";
import { scaleOf } from "../engine/matrix";
import type { Figure } from "../model/types";

const pathCache = new WeakMap<Figure, Path2D>();
function pathFor(fig: Figure): Path2D {
  let p = pathCache.get(fig);
  if (!p) { p = new Path2D(fig.pathData); pathCache.set(fig, p); }
  return p;
}

export function CanvasView() {
  const ref = useRef<HTMLCanvasElement>(null);
  const figures = useStore((s) => s.figures);
  const layers = useStore((s) => s.layers);
  const selectedLayerId = useStore((s) => s.selectedLayerId);
  const canvas = useStore((s) => s.canvas);

  const instances = useMemo(
    () => layers.map((l) => ({ layer: l, instances: applyRules(l, figures[l.figureId]) })),
    [layers, figures],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = el.clientWidth || canvas.width;
      const cssH = cssW * (canvas.height / canvas.width);
      if (el.width !== Math.round(cssW * dpr) || el.height !== Math.round(cssH * dpr)) {
        el.width = Math.round(cssW * dpr);
        el.height = Math.round(cssH * dpr);
      }
      const k = (cssW * dpr) / canvas.width; // design units → device px
      const fg = getComputedStyle(el).color;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, el.width, el.height);

      for (const { layer, instances: list } of instances) {
        const fig = figures[layer.figureId];
        if (!fig) continue;
        const path = pathFor(fig);
        const selected = layer.id === selectedLayerId;
        for (const inst of list) {
          const m = inst.matrix;
          ctx.setTransform(m[0] * k, m[1] * k, m[2] * k, m[3] * k, m[4] * k, m[5] * k);
          // non-scaling stroke: keep width constant in CSS px
          ctx.lineWidth = (layer.style.strokeWidth * dpr) / (scaleOf(m) * k);
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          if (layer.style.fill) { ctx.fillStyle = layer.style.fill; ctx.fill(path); }
          ctx.strokeStyle = layer.style.stroke === "currentColor" ? fg : layer.style.stroke;
          ctx.globalAlpha = selected || !selectedLayerId ? 1 : 0.55;
          ctx.stroke(path);
        }
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [instances, figures, selectedLayerId, canvas]);

  return (
    <canvas
      ref={ref}
      className="stage"
      style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
      aria-label="Canvas with the combined figure"
    />
  );
}
