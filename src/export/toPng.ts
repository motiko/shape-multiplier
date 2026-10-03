import type { Scene } from "../render/draw";
import { drawScene } from "../render/draw";

export const PNG_SCALES = [1, 2, 4] as const;
export type PngScale = (typeof PNG_SCALES)[number];

export type PngExportOptions = {
  width: number;
  height: number;
  background?: string | null;
  fg: string;
  /** Output pixels per design unit: 1×, 2× or 4×. */
  scale: PngScale;
};

/**
 * Renders the scene through the same drawScene the canvas uses, on an offscreen
 * canvas at `scale` × the design size. Strokes scale with the image.
 */
export function toPng(scene: Scene, o: PngExportOptions): Promise<Blob> {
  const el = document.createElement("canvas");
  el.width = Math.round(o.width * o.scale);
  el.height = Math.round(o.height * o.scale);
  const ctx = el.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D is not available"));
  drawScene(ctx, scene, { k: o.scale, strokeScale: o.scale, fg: o.fg, background: o.background, width: o.width, height: o.height });
  return new Promise((resolve, reject) => {
    el.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))), "image/png");
  });
}
