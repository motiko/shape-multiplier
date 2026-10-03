import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import App from "../App";
import { handleShortcut } from "./shortcuts";
import { useStore, resetStore, UNDO_BURST_MS } from "../state/store";

describe("keyboard shortcuts", () => {
  beforeEach(() => { vi.useFakeTimers(); resetStore(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  const key = (key: string, extra: Partial<KeyboardEventInit> = {}) => fireEvent.keyDown(window, { key, ...extra });

  it("undo / redo with the modifier combos", () => {
    render(<App />);
    useStore.getState().loadPreset("spiral");
    vi.advanceTimersByTime(UNDO_BURST_MS + 1);
    const id = useStore.getState().layers[0].id;
    useStore.getState().addRule(id, { kind: "mirror", axis: "x" });
    key("z", { metaKey: true });
    expect(useStore.getState().layers[0].rules).toHaveLength(1);
    key("z", { metaKey: true, shiftKey: true });
    expect(useStore.getState().layers[0].rules).toHaveLength(2);
    key("z", { ctrlKey: true });
    expect(useStore.getState().layers[0].rules).toHaveLength(1);
    key("y", { ctrlKey: true });
    expect(useStore.getState().layers[0].rules).toHaveLength(2);
  });

  it("space toggles playback, F fits, Escape deselects, Delete removes the layer", () => {
    render(<App />);
    expect(handleShortcut({ key: " ", metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, target: document.body })).toBe(false); // nothing to play
    useStore.getState().loadPreset("spiral");
    key(" ");
    expect(useStore.getState().playing).toBe(true);
    key(" ");
    expect(useStore.getState().playing).toBe(false);

    const id = useStore.getState().layers[0].id;
    const base = useStore.getState().layers[0].base;
    useStore.getState().setLayerBase(id, [1, 0, 0, 1, 0, 0]);
    key("f");
    const fitted = useStore.getState().layers[0].base;
    expect(fitted).not.toEqual([1, 0, 0, 1, 0, 0]);
    fitted.forEach((v, i) => expect(v).toBeCloseTo(base[i], 6)); // F reproduces the preset's own fit

    key("Escape");
    expect(useStore.getState().selectedLayerId).toBeNull();
    key("Delete");
    expect(useStore.getState().layers).toHaveLength(1); // nothing selected
    useStore.getState().selectLayer(id);
    key("Backspace");
    expect(useStore.getState().layers).toHaveLength(0);
  });

  it("ignores plain keys while a control is focused, but Escape blurs it", () => {
    useStore.getState().loadPreset("spiral");
    render(<App />);
    const slider = screen.getByLabelText("count") as HTMLInputElement;
    slider.focus();
    fireEvent.keyDown(slider, { key: " " });
    expect(useStore.getState().playing).toBe(false);
    fireEvent.keyDown(slider, { key: "Delete" });
    expect(useStore.getState().layers).toHaveLength(1);
    fireEvent.keyDown(slider, { key: "Escape" });
    expect(document.activeElement).not.toBe(slider);
    expect(useStore.getState().selectedLayerId).not.toBeNull(); // Escape in a control only blurs
  });

  it("the shortcut list is shown in the rules panel", () => {
    render(<App />);
    expect(screen.getByText("Keyboard shortcuts")).toBeTruthy();
    expect(screen.getByText("play / pause")).toBeTruthy();
  });
});
