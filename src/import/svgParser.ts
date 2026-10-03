/**
 * SVG → Figure. Supports path, rect, circle, ellipse, line, polyline, polygon,
 * nested <g> with transform attributes, and <use> of local symbols is NOT supported (warned).
 * All geometry is flattened into one absolute path string in the root user space.
 */
import type { Figure, Matrix } from "../model/types";
import { compose, parseTransform, IDENTITY } from "../engine/matrix";
import { parsePath, transformPath, serializePath, pathBBox, type Cmd } from "./pathData";

const SUPPORTED = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);
const CONTAINERS = new Set(["svg", "g", "a", "switch"]);
const IGNORED = new Set(["defs", "title", "desc", "metadata", "style", "script", "clipPath", "mask", "marker", "pattern", "linearGradient", "radialGradient", "symbol", "filter"]);

const num = (el: Element, name: string, fallback = 0) => {
  const v = el.getAttribute(name);
  if (v == null) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Convert a basic shape to path data (SVG 2 "equivalent path"). */
export function shapeToPathData(el: Element): string | null {
  switch (el.localName) {
    case "path":
      return el.getAttribute("d") ?? "";
    case "rect": {
      const x = num(el, "x"), y = num(el, "y"), w = num(el, "width"), h = num(el, "height");
      let rx = num(el, "rx", NaN), ry = num(el, "ry", NaN);
      if (Number.isNaN(rx) && Number.isNaN(ry)) rx = ry = 0;
      else if (Number.isNaN(rx)) rx = ry; else if (Number.isNaN(ry)) ry = rx;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (rx <= 0 || ry <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return [
        `M${x + rx} ${y}`, `H${x + w - rx}`, `A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}`,
        `V${y + h - ry}`, `A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}`,
        `H${x + rx}`, `A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}`,
        `V${y + ry}`, `A${rx} ${ry} 0 0 1 ${x + rx} ${y}`, "Z",
      ].join("");
    }
    case "circle":
    case "ellipse": {
      const cx = num(el, "cx"), cy = num(el, "cy");
      const r = num(el, "r");
      const rx = el.localName === "circle" ? r : num(el, "rx"), ry = el.localName === "circle" ? r : num(el, "ry");
      if (rx <= 0 || ry <= 0) return null;
      return `M${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}Z`;
    }
    case "line":
      return `M${num(el, "x1")} ${num(el, "y1")}L${num(el, "x2")} ${num(el, "y2")}`;
    case "polyline":
    case "polygon": {
      const pts = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (pts.length < 4) return null;
      let d = `M${pts[0]} ${pts[1]}`;
      for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
      return el.localName === "polygon" ? d + "Z" : d;
    }
    default:
      return null;
  }
}

function walk(el: Element, ctm: Matrix, cmds: Cmd[], warnings: Set<string>) {
  const name = el.localName;
  if (IGNORED.has(name)) return;
  const local = compose(ctm, parseTransform(el.getAttribute("transform")));
  if (CONTAINERS.has(name)) {
    for (const child of Array.from(el.children)) walk(child, local, cmds, warnings);
    return;
  }
  if (SUPPORTED.has(name)) {
    const d = shapeToPathData(el);
    if (d) cmds.push(...transformPath(parsePath(d), local));
    return;
  }
  warnings.add(name);
}

let counter = 0;
export function newId(prefix = "fig") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export function parseSvg(source: string, name = "figure"): Figure {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error(`Not a valid SVG: ${err.textContent?.split("\n")[0] ?? "parse error"}`);
  const root = doc.documentElement;
  if (root.localName !== "svg") throw new Error("Root element is not <svg>");

  const cmds: Cmd[] = [];
  const warnings = new Set<string>();
  // root <svg> may carry a viewBox; we keep user units as-is (viewBox origin becomes figure origin)
  for (const child of Array.from(root.children)) walk(child, IDENTITY, cmds, warnings);

  if (cmds.length === 0) throw new Error("No drawable geometry found in this SVG");

  return {
    id: newId(),
    name: name.replace(/\.svg$/i, ""),
    pathData: serializePath(cmds),
    bbox: pathBBox(cmds),
    warnings: Array.from(warnings).sort(),
  };
}
