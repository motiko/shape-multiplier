import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { drawScene } from "./draw";

export function CanvasView() {
  const ref = useRef<HTMLCanvasElement>(null);
  const figures = useStore((s) => s.figures);
  const layers = useStore((s) => s.layers);
  const selectedLayerId = useStore((s) => s.selectedLayerId);
  const shown = useStore((s) => s.shown);
  const canvas = useStore((s) => s.canvas);

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
      drawScene(ctx, { figures, layers, selectedLayerId, shown }, {
        k: (cssW * dpr) / canvas.width,
        strokeScale: dpr,
        fg: getComputedStyle(el).color,
        background: canvas.background,
        width: canvas.width,
        height: canvas.height,
      });
    };

    // one frame per change: slider drags coalesce into the next animation frame
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [figures, layers, selectedLayerId, shown, canvas]);

  return (
    <canvas
      ref={ref}
      className="stage"
      style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
      aria-label="Canvas with the combined figure"
    />
  );
}
