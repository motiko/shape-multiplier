import type { Scene } from "../render/draw";
import { visibleInstances } from "../render/draw";
import { scaleOf, toSvgTransform } from "../engine/matrix";

export type SvgExportOptions = {
  width: number;
  height: number;
  background?: string | null;
  /** Color written for `currentColor` strokes and fills. */
  fg?: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const fmt = (n: number) => String(+n.toFixed(4));

/**
 * Lossless export: one <path> per figure in <defs>, one <use transform="matrix(...)"> per
 * instance. Stroke width is divided by each instance's scale, matching the canvas's
 * non-scaling stroke without relying on vector-effect support.
 */
export function toSvg(scene: Scene, o: SvgExportOptions): string {
  const fg = o.fg ?? "#000";
  const color = (c: string) => (c === "currentColor" ? fg : c);
  const groups = visibleInstances(scene);
  const figures = new Map(groups.map((g) => [g.figure.id, g.figure]));

  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${o.height}" viewBox="0 0 ${o.width} ${o.height}">`);
  if (o.background && o.background !== "transparent") lines.push(`  <rect width="${o.width}" height="${o.height}" fill="${esc(o.background)}"/>`);
  lines.push("  <defs>");
  for (const fig of figures.values()) lines.push(`    <path id="${esc(fig.id)}" d="${esc(fig.pathData)}"/>`);
  lines.push("  </defs>");
  for (const { layer, figure, instances } of groups) {
    const st = layer.style;
    lines.push(`  <g id="${esc(layer.id)}" fill="${st.fill ? esc(color(st.fill)) : "none"}" stroke="${esc(color(st.stroke))}" stroke-linejoin="round" stroke-linecap="round">`);
    for (const inst of instances) {
      lines.push(`    <use href="#${esc(figure.id)}" transform="${toSvgTransform(inst.matrix)}" stroke-width="${fmt(st.strokeWidth / scaleOf(inst.matrix))}"/>`);
    }
    lines.push("  </g>");
  }
  lines.push("</svg>");
  return lines.join("\n") + "\n";
}
