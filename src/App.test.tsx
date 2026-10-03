import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import App from "./App";
import { useStore } from "./state/store";
import { applyRules } from "./engine/applyRules";
import { instancesBounds } from "./engine/bounds";
import { scaleOf } from "./engine/matrix";

describe("App", () => {
  afterEach(cleanup);
  beforeEach(() => {
    useStore.setState({ figures: {}, layers: [], selectedLayerId: null, error: null });
  });

  it("loads samples, places the first one as a layer, and shows it in both panels", () => {
    render(<App />);
    expect(screen.getByLabelText(/canvas with the combined figure/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /load the samples/i }));

    const { figures, layers } = useStore.getState();
    expect(Object.keys(figures)).toHaveLength(3);
    expect(layers).toHaveLength(1);
    expect(figures[layers[0].figureId].name).toBe("square");
    expect(screen.getAllByTitle("Add to canvas")).toHaveLength(3);
    expect(screen.getAllByText("square")).toHaveLength(2);
  });

  it("surfaces a parse error as a toast", () => {
    render(<App />);
    act(() => useStore.getState().setError("bad.svg: Not a valid SVG"));
    expect(screen.getByRole("alert").textContent).toContain("bad.svg");
  });

  it("spiral preset places a square with one Repeat rule that fits the canvas", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /spiral preset/i }));

    const { figures, layers, canvas } = useStore.getState();
    expect(layers).toHaveLength(1);
    const fig = figures[layers[0].figureId];
    expect(fig.name).toBe("square");
    expect(layers[0].rules).toEqual([
      { kind: "repeat", count: 10, rotateStep: 15, scaleStep: 1.15, translateStep: [0, 0], pivot: "center" },
    ]);
    const inst = applyRules(layers[0], fig);
    expect(inst).toHaveLength(11);
    expect(scaleOf(inst[10].matrix) / scaleOf(inst[0].matrix)).toBeCloseTo(Math.pow(1.15, 10), 6);
    const b = instancesBounds(inst, fig.bbox)!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(canvas.width);
    expect(Math.max(b.width, b.height)).toBeCloseTo(canvas.width * 0.8, 3);
    expect(screen.getByText(/11 instances/)).toBeTruthy();
    // loading it twice reuses the square figure
    fireEvent.click(screen.getByRole("button", { name: /spiral preset/i }));
    expect(Object.keys(useStore.getState().figures)).toHaveLength(1);
    expect(useStore.getState().layers).toHaveLength(2);
  });

  it("slider changes update the rule and the live instance count", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /load the samples/i }));
    expect(screen.getByText(/1 instance$/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /\+ repeat/i }));
    expect(screen.getByText(/11 instances/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("count"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("rotate step"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("scale step"), { target: { value: "0.9" } });
    fireEvent.change(screen.getByLabelText("pivot"), { target: { value: "origin" } });

    const rule = useStore.getState().layers[0].rules[0];
    expect(rule).toMatchObject({ kind: "repeat", count: 4, rotateStep: 30, scaleStep: 0.9, pivot: "origin" });
    expect(screen.getByText(/5 instances/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /remove repeat rule/i }));
    expect(useStore.getState().layers[0].rules).toHaveLength(0);
    expect(screen.getByText(/1 instance$/)).toBeTruthy();
  });
});
