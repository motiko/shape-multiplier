import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useStore, resetStore, docOf, EMPTY_DOC } from "./store";
import { isDoc, readDocument, writeDocument, startPersistence, STORAGE_KEY } from "./persist";

function memStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), map: m };
}

describe("persistence", () => {
  beforeEach(() => { vi.useFakeTimers(); resetStore(); });
  afterEach(() => vi.useRealTimers());

  it("isDoc rejects malformed data and accepts a real document", () => {
    expect(isDoc(null)).toBe(false);
    expect(isDoc({})).toBe(false);
    expect(isDoc({ figures: {}, layers: [], canvas: { width: 1 } })).toBe(false);
    expect(isDoc(EMPTY_DOC)).toBe(true);
    useStore.getState().loadPreset("spiral");
    const doc = docOf(useStore.getState());
    expect(isDoc(JSON.parse(JSON.stringify(doc)))).toBe(true);
    // a layer pointing at a missing figure is rejected
    expect(isDoc({ ...doc, figures: {} })).toBe(false);
  });

  it("write / read round-trip, and an empty document removes the key", () => {
    const st = memStorage();
    useStore.getState().loadPreset("tile");
    const doc = docOf(useStore.getState());
    expect(writeDocument(doc, st)).toBe(true);
    expect(readDocument(st)).toEqual(JSON.parse(JSON.stringify(doc)));
    expect(writeDocument(EMPTY_DOC, st)).toBe(true);
    expect(st.map.has(STORAGE_KEY)).toBe(false);
    st.setItem(STORAGE_KEY, "{not json");
    expect(readDocument(st)).toBeNull();
    expect(readDocument(null)).toBeNull();
    expect(writeDocument(doc, null)).toBe(false);
  });

  it("startPersistence restores the saved document without an undo step, then autosaves debounced", () => {
    const st = memStorage();
    useStore.getState().loadPreset("rosette");
    writeDocument(docOf(useStore.getState()), st);
    const savedLayers = useStore.getState().layers;
    resetStore();
    expect(useStore.getState().layers).toHaveLength(0);

    const stop = startPersistence(300, st);
    expect(useStore.getState().layers).toEqual(JSON.parse(JSON.stringify(savedLayers)));
    expect(useStore.temporal.getState().pastStates).toHaveLength(0);
    expect(useStore.getState().selectedLayerId).toBe(useStore.getState().layers.at(-1)!.id); // restore selects the last layer

    const id = useStore.getState().layers[0].id;
    useStore.getState().addRule(id, { kind: "mirror", axis: "y" });
    useStore.getState().selectLayer(id); // not a document change: must not trigger a save by itself
    expect(readDocument(st)!.layers[0].rules).toHaveLength(1); // not yet written
    vi.advanceTimersByTime(299);
    expect(readDocument(st)!.layers[0].rules).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(readDocument(st)!.layers[0].rules).toHaveLength(2);

    stop();
    useStore.getState().removeLayer(id);
    vi.advanceTimersByTime(1000);
    expect(readDocument(st)!.layers).toHaveLength(1); // unsubscribed: nothing more written
  });

  it("swallows storage errors", () => {
    const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => {} };
    expect(readDocument(broken)).toBeNull();
    expect(writeDocument(EMPTY_DOC, broken)).toBe(true); // removeItem path
    useStore.getState().loadPreset("spiral");
    expect(writeDocument(docOf(useStore.getState()), broken)).toBe(false);
  });
});
