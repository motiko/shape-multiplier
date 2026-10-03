import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { Timeline } from "./Timeline";
import { playDuration } from "./playback";
import { useStore, resetStore } from "../state/store";

describe("Timeline", () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"] });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("renders nothing without instances", () => {
    render(<Timeline />);
    expect(screen.queryByRole("group", { name: /timeline/i })).toBeNull();
  });

  it("scrubs the shown count; dragging to the end releases to 'all'", () => {
    useStore.getState().loadPreset("spiral");
    render(<Timeline />);
    const slider = screen.getByLabelText("Shown instances") as HTMLInputElement;
    expect(slider.max).toBe("11");
    expect(slider.value).toBe("11");
    fireEvent.change(slider, { target: { value: "4" } });
    expect(useStore.getState().shown).toBe(4);
    expect(screen.getByText("4 / 11")).toBeTruthy();
    fireEvent.change(slider, { target: { value: "11" } });
    expect(useStore.getState().shown).toBeNull();
    fireEvent.change(slider, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(useStore.getState().shown).toBeNull();
  });

  it("play grows the count in over time and ends at 'all'", () => {
    useStore.getState().loadPreset("spiral");
    render(<Timeline />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(useStore.getState().shown).toBe(0);
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    const d = playDuration(11);
    act(() => { vi.advanceTimersByTime(d / 2); });
    const mid = useStore.getState().shown!;
    expect(mid).toBeGreaterThan(2);
    expect(mid).toBeLessThan(9);
    act(() => { vi.advanceTimersByTime(d); });
    expect(useStore.getState().shown).toBeNull();
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  it("pause keeps the current count and a slider change stops playback", () => {
    useStore.getState().loadPreset("spiral");
    render(<Timeline />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => { vi.advanceTimersByTime(playDuration(11) / 2); });
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    const held = useStore.getState().shown;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(useStore.getState().shown).toBe(held);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.change(screen.getByLabelText("Shown instances"), { target: { value: "3" } });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(useStore.getState().shown).toBe(3);
  });

  it("playDuration is clamped", () => {
    expect(playDuration(1)).toBe(1200);
    expect(playDuration(20)).toBe(1800);
    expect(playDuration(5000)).toBe(8000);
  });
});
