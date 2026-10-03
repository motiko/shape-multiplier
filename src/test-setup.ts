// jsdom has no canvas; give CanvasView a null context so it skips drawing.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement["getContext"];
if (typeof ResizeObserver === "undefined") {
  class RO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
}
// jsdom has no Path2D either; drawScene only hands it to the (mocked) context.
if (typeof Path2D === "undefined") {
  class P2D { d: string; constructor(d = "") { this.d = d; } }
  (globalThis as unknown as { Path2D: typeof P2D }).Path2D = P2D;
}
if (typeof CSS === "undefined" || !CSS.escape) {
  (globalThis as unknown as { CSS: { escape: (s: string) => string } }).CSS = {
    ...(globalThis as unknown as { CSS?: object }).CSS,
    escape: (s: string) => s.replace(/([^\w-])/g, "\\$1"),
  };
}
// matchMedia: default to "no match"; tests override it for the phone layout.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  })) as unknown as typeof window.matchMedia;
}
