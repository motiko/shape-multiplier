import { describe, it, expect, vi } from "vitest";
import { drawScene, visibleInstances, totalInstances } from "./draw";
import { SPIRAL } from "../presets";
import type { Figure, Layer } from "../model/types";

const fig: Figure = { id: "f", name: "sq", pathData: "M0 0H1V1H0Z", bbox: { x: 0, y: 0, width: 1, height: 1 }, warnings: [] };
const mk = (id: string, rules: Layer["rules"]): Layer => ({ id, figureId: "f", base: [1, 0, 0, 1, 0, 0], rules, style: { stroke: "currentColor", strokeWidth: 2, fill: null } });
const scene = { figures: { f: fig }, layers: [mk("a", SPIRAL.rules), mk("b", [])] };

function fakeCtx() {
  const calls: string[] = [];
  const widths: number[] = [];
  const ctx = {
    setTransform: () => {}, clearRect: () => calls.push("clear"), fillRect: () => calls.push("fillRect"),
    fill: () => calls.push("fill"), stroke: () => calls.push("stroke"),
    set lineWidth(v: number) { widths.push(v); }, lineJoin: "", lineCap: "", globalAlpha: 1, fillStyle: "", strokeStyle: "",
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, widths };
}

describe("draw", () => {
  it("totalInstances and visibleInstances share one budget across layers in order", () => {
    expect(totalInstances(scene)).toBe(12);
    expect(visibleInstances({ ...scene, shown: null }).map((l) => l.instances.length)).toEqual([11, 1]);
    expect(visibleInstances({ ...scene, shown: 5 }).map((l) => l.instances.length)).toEqual([5]);
    expect(visibleInstances({ ...scene, shown: 11 }).map((l) => l.instances.length)).toEqual([11]);
    expect(visibleInstances({ ...scene, shown: 0 })).toEqual([]);
    expect(visibleInstances({ ...scene, layers: [{ ...scene.layers[0], figureId: "missing" }] })).toEqual([]);
  });

  it("strokes once per visible instance and skips a transparent background", () => {
    const { ctx, calls } = fakeCtx();
    drawScene(ctx, { ...scene, shown: 7 }, { k: 1, strokeScale: 1, fg: "#000", background: "transparent", width: 10, height: 10 });
    expect(calls.filter((c) => c === "stroke")).toHaveLength(7);
    expect(calls).not.toContain("fillRect");
    expect(calls).not.toContain("fill");
  });

  it("paints the background and keeps strokes non-scaling", () => {
    const { ctx, calls, widths } = fakeCtx();
    drawScene(ctx, scene, { k: 4, strokeScale: 4, fg: "#000", background: "#fff", width: 10, height: 10 });
    expect(calls[1]).toBe("fillRect");
    // strokeWidth 2 CSS px × strokeScale 4 = 8 device px; divided by (instance scale × k)
    expect(widths[0]).toBeCloseTo(8 / 4, 9);
    expect(widths[10]).toBeCloseTo(8 / (Math.pow(1.15, 10) * 4), 9);
  });

  it("fills when a layer has a fill color", () => {
    const { ctx, calls } = fakeCtx();
    const filled = { ...scene, layers: [{ ...mk("c", []), style: { stroke: "#000", strokeWidth: 1, fill: "currentColor" } }] };
    drawScene(ctx, filled, { k: 1, strokeScale: 1, fg: "#000", width: 10, height: 10 });
    expect(calls).toEqual(["clear", "fill", "stroke"]);
    expect(vi.fn()).toBeDefined();
  });
});
