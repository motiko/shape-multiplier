import { describe, it, expect } from "vitest";
import { toSvg } from "./toSvg";
import { parseSvg } from "../import/svgParser";
import { applyRules } from "../engine/applyRules";
import { instancesBounds } from "../engine/bounds";
import { SPIRAL } from "../presets";
import type { Figure, Layer } from "../model/types";

const fig: Figure = { id: "fig_a", name: "square", pathData: "M10 10H90V90H10Z", bbox: { x: 10, y: 10, width: 80, height: 80 }, warnings: [] };
const layer: Layer = { id: "layer_1", figureId: "fig_a", base: [2, 0, 0, 2, 100, 100], rules: SPIRAL.rules, style: { stroke: "currentColor", strokeWidth: 1.5, fill: null } };
const canvas = { width: 1000, height: 1000 };

describe("toSvg", () => {
  it("writes one <path> in defs and one <use> per instance with exact matrices", () => {
    const svg = toSvg({ figures: { fig_a: fig }, layers: [layer] }, { ...canvas, fg: "#123456" });
    expect(svg).toContain('viewBox="0 0 1000 1000"');
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('<path id="fig_a" d="M10 10H90V90H10Z"/>');
    expect(svg.match(/<use /g)).toHaveLength(11);
    expect(svg).toContain('<use href="#fig_a" transform="matrix(2 0 0 2 100 100)" stroke-width="0.75"/>');
    expect(svg).toContain('stroke="#123456"');
    expect(svg).toContain('fill="none"');
    const inst = applyRules(layer, fig);
    const s10 = Math.hypot(inst[10].matrix[0], inst[10].matrix[1]);
    expect(svg).toContain(`stroke-width="${+(1.5 / s10).toFixed(4)}"`);
  });

  it("honours the timeline (shown) and the background", () => {
    const svg = toSvg({ figures: { fig_a: fig }, layers: [layer], shown: 4 }, { ...canvas, background: "#fff" });
    expect(svg.match(/<use /g)).toHaveLength(4);
    expect(svg).toContain('<rect width="1000" height="1000" fill="#fff"/>');
    expect(toSvg({ figures: { fig_a: fig }, layers: [layer], shown: 0 }, canvas)).not.toContain("<use");
  });

  it("round-trips through the importer: same bounds, one subpath per instance", () => {
    const svg = toSvg({ figures: { fig_a: fig }, layers: [layer] }, canvas);
    const back = parseSvg(svg, "export.svg");
    expect(back.warnings).toEqual([]);
    expect(back.pathData.match(/M/g)).toHaveLength(11);
    const b = instancesBounds(applyRules(layer, fig), fig.bbox)!;
    for (const k of ["x", "y", "width", "height"] as const) expect(back.bbox[k]).toBeCloseTo(b[k], 3);
  });

  it("escapes attribute values", () => {
    const weird: Figure = { ...fig, id: 'f"<&', pathData: "M0 0" };
    const svg = toSvg({ figures: { [weird.id]: weird }, layers: [{ ...layer, figureId: weird.id, rules: [] }] }, canvas);
    expect(svg).toContain('id="f&quot;&lt;&amp;"');
    expect(svg).not.toContain('id="f"<&"');
  });
});
