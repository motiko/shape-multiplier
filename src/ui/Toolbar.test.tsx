import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { Toolbar } from "./Toolbar";
import { useStore, resetStore } from "../state/store";

describe("Toolbar export", () => {
  const downloads: { name: string; blob: Blob }[] = [];
  const origGet = HTMLCanvasElement.prototype.getContext, origBlob = HTMLCanvasElement.prototype.toBlob;
  beforeEach(() => {
    downloads.length = 0;
    resetStore();
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ name: this.download, blob: (this as unknown as { _blob: Blob })._blob });
    });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); HTMLCanvasElement.prototype.getContext = origGet; HTMLCanvasElement.prototype.toBlob = origBlob; });

  it("export buttons are disabled until a layer exists", () => {
    render(<Toolbar />);
    expect((screen.getByRole("button", { name: /export svg/i }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /^spiral$/i }));
    expect((screen.getByRole("button", { name: /export svg/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("Export SVG downloads an .svg with one use per instance", async () => {
    const texts: Promise<string>[] = [];
    (URL.createObjectURL as ReturnType<typeof vi.fn>).mockImplementation((b: Blob) => { texts.push(b.text()); return "blob:test"; });
    render(<Toolbar />);
    fireEvent.click(screen.getByRole("button", { name: /^spiral$/i }));
    fireEvent.click(screen.getByRole("button", { name: /export svg/i }));
    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toMatch(/^shape-multiplier-\d{8}-\d{6}\.svg$/);
    const svg = await texts[0];
    expect(svg.match(/<use /g)).toHaveLength(11);
    expect(svg).toContain("<defs>");
  });

  it("Export PNG uses the chosen scale and surfaces failures as a toast", async () => {
    let size: [number, number] = [0, 0];
    HTMLCanvasElement.prototype.getContext = (() => ({ setTransform() {}, clearRect() {}, fillRect() {}, fill() {}, stroke() {} })) as unknown as typeof origGet;
    HTMLCanvasElement.prototype.toBlob = function (this: HTMLCanvasElement, cb: BlobCallback) { size = [this.width, this.height]; cb(new Blob(["x"], { type: "image/png" })); };
    render(<Toolbar />);
    fireEvent.click(screen.getByRole("button", { name: /^spiral$/i }));
    fireEvent.change(screen.getByLabelText("PNG scale"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /export png/i }));
    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(size).toEqual([4000, 4000]);
    expect(downloads[0].name).toMatch(/^shape-multiplier@4x-.*\.png$/);

    HTMLCanvasElement.prototype.getContext = origGet; // jsdom: null context
    fireEvent.click(screen.getByRole("button", { name: /export png/i }));
    await waitFor(() => expect(useStore.getState().error).toMatch(/PNG export failed/));
  });
});
