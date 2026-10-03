import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useStore, resetStore, UNDO_BURST_MS } from "./store";
import { DEFAULT_REPEAT } from "../engine/rules/repeat";

const hist = () => useStore.temporal.getState();

describe("undo / redo", () => {
  beforeEach(() => { vi.useFakeTimers(); resetStore(); });
  afterEach(() => vi.useRealTimers());

  const place = () => {
    useStore.getState().loadPreset("spiral");
    vi.advanceTimersByTime(UNDO_BURST_MS + 1);
    return useStore.getState().layers[0].id;
  };

  it("records document edits and ignores selection, timeline and errors", () => {
    expect(hist().pastStates).toHaveLength(0);
    place();
    expect(hist().pastStates.length).toBeGreaterThan(0);
    const n = hist().pastStates.length;
    useStore.getState().selectLayer(null);
    useStore.getState().setShown(3);
    useStore.getState().setPlaying(true);
    useStore.getState().setError("x");
    expect(hist().pastStates).toHaveLength(n);
  });

  it("undo reverts a rule edit and redo re-applies it", () => {
    const id = place();
    useStore.getState().addRule(id, { kind: "mirror", axis: "x" });
    expect(useStore.getState().layers[0].rules).toHaveLength(2);
    hist().undo();
    expect(useStore.getState().layers[0].rules).toHaveLength(1);
    hist().redo();
    expect(useStore.getState().layers[0].rules).toHaveLength(2);
    expect(useStore.getState().layers[0].rules[1]).toEqual({ kind: "mirror", axis: "x" });
  });

  it("a slider drag (burst of edits) is one undo step", () => {
    const id = place();
    const before = hist().pastStates.length;
    for (let c = 9; c >= 3; c--) { useStore.getState().updateRule(id, 0, { count: c }); vi.advanceTimersByTime(50); }
    expect(useStore.getState().layers[0].rules[0]).toMatchObject({ count: 3 });
    expect(hist().pastStates.length).toBe(before + 1);
    hist().undo();
    expect(useStore.getState().layers[0].rules[0]).toMatchObject({ count: 10 });
  });

  it("edits spaced apart are separate steps; a new edit clears the redo stack", () => {
    const id = place();
    useStore.getState().updateRule(id, 0, { count: 5 });
    vi.advanceTimersByTime(UNDO_BURST_MS + 1);
    useStore.getState().updateRule(id, 0, { count: 7 });
    vi.advanceTimersByTime(UNDO_BURST_MS + 1);
    hist().undo();
    expect(useStore.getState().layers[0].rules[0]).toMatchObject({ count: 5 });
    expect(hist().futureStates).toHaveLength(1);
    useStore.getState().addRule(id, { ...DEFAULT_REPEAT });
    expect(hist().futureStates).toHaveLength(0);
  });

  it("New clears the document but can be undone", () => {
    place();
    useStore.getState().newDocument();
    expect(useStore.getState().layers).toHaveLength(0);
    expect(Object.keys(useStore.getState().figures)).toHaveLength(0);
    hist().undo();
    expect(useStore.getState().layers).toHaveLength(1);
  });

  it("resetStore clears the history", () => {
    place();
    resetStore();
    expect(hist().pastStates).toHaveLength(0);
    expect(hist().futureStates).toHaveLength(0);
  });

  it("discrete actions in quick succession are separate steps; a preset load is exactly one", () => {
    const id = place();
    expect(hist().pastStates).toHaveLength(1); // the whole spiral preset (figure + layer + rule + fit)
    useStore.getState().addRule(id, { kind: "mirror", axis: "x" });
    useStore.getState().addRule(id, { kind: "mirror", axis: "y" }, true); // add + fit = one step
    useStore.getState().loadPreset("rosette");
    expect(hist().pastStates).toHaveLength(4);
    hist().undo();
    expect(useStore.getState().layers).toHaveLength(1);
    hist().undo();
    expect(useStore.getState().layers[0].rules.map((r) => r.kind)).toEqual(["repeat", "mirror"]);
    hist().undo(); hist().undo();
    expect(useStore.getState().layers).toHaveLength(0);
    expect(hist().pastStates).toHaveLength(0);
    expect(hist().futureStates).toHaveLength(4);
  });

  it("importing a figure that auto-places itself is one step", () => {
    useStore.getState().addFigure({ id: "f", name: "sq", pathData: "M0 0H1V1H0Z", bbox: { x: 0, y: 0, width: 1, height: 1 }, warnings: [] });
    expect(useStore.getState().layers).toHaveLength(1);
    expect(hist().pastStates).toHaveLength(1);
    hist().undo();
    expect(Object.keys(useStore.getState().figures)).toHaveLength(0);
  });

  it("history is capped", () => {
    const id = place();
    for (let i = 0; i < 120; i++) useStore.getState().addRule(id, { kind: "mirror", axis: "x" }, i % 2 === 0);
    expect(hist().pastStates.length).toBeLessThanOrEqual(100);
  });
});
