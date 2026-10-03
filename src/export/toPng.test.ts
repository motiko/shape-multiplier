import { describe, it, expect, vi, afterEach } from "vitest";
import { toPng } from "./toPng";
import type { Figure, Layer } from "../model/types";

const fig: Figure = { id: "f", name: "sq", pathData: "M0 0H1V1H0Z", bbox: { x: 0, y: 0, width: 1, height: 1 }, warnings: [] };
const layer: Layer = { id: "l", figureId: "f", base: [1, 0, 0, 1, 0, 0], rules: [], style: { stroke: "#000", strokeWidth: 1, fill: null } };
const scene = { figures: { f: fig }, layers: [layer] };
const proto = HTMLCanvasElement.prototype;
const origGet = proto.getContext, origBlob = proto.toBlob;

afterEach(() => { proto.getContext = origGet; proto.toBlob = origBlob; });

describe("toPng", () => {
  it("rejects when 2D canvas is unavailable", async () => {
    await expect(toPng(scene, { width: 10, height: 10, fg: "#000", scale: 1 })).rejects.toThrow(/not available/);
  });

  it("draws at scale × design size and resolves the encoded blob", async () => {
    const strokes = vi.fn();
    const ctx = { setTransform() {}, clearRect() {}, fillRect() {}, fill() {}, stroke: strokes, lineWidth: 0, lineJoin: "", lineCap: "", globalAlpha: 1, fillStyle: "", strokeStyle: "" };
    proto.getContext = (() => ctx) as unknown as typeof proto.getContext;
    let size: [number, number] = [0, 0];
    proto.toBlob = function (this: HTMLCanvasElement, cb: BlobCallback) { size = [this.width, this.height]; cb(new Blob(["png"], { type: "image/png" })); };
    const blob = await toPng(scene, { width: 300, height: 200, fg: "#000", scale: 4 });
    expect(blob.type).toBe("image/png");
    expect(size).toEqual([1200, 800]);
    expect(strokes).toHaveBeenCalledTimes(1);
  });

  it("rejects when encoding yields no blob", async () => {
    proto.getContext = (() => ({ setTransform() {}, clearRect() {}, stroke() {}, fill() {}, fillRect() {} })) as unknown as typeof proto.getContext;
    proto.toBlob = (cb: BlobCallback) => cb(null);
    await expect(toPng(scene, { width: 1, height: 1, fg: "#000", scale: 1 })).rejects.toThrow(/encoding/);
  });
});
