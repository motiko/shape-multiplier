import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "../App";
import { resetStore } from "../state/store";
import { PHONE_QUERY } from "./useMediaQuery";

const realMM = window.matchMedia;
function mockPhone(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query === PHONE_QUERY ? matches : false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  })) as unknown as typeof window.matchMedia;
}

describe("phone layout", () => {
  beforeEach(resetStore);
  afterEach(() => { cleanup(); window.matchMedia = realMM; });

  it("desktop shows both side panels and no tabs", () => {
    mockPhone(false);
    render(<App />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText("Library")).toBeTruthy();
    expect(screen.getByText("Rules")).toBeTruthy();
  });

  it("phone collapses the panels into tabs under the canvas", () => {
    mockPhone(true);
    render(<App />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Library", "Layers & rules"]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText(/drop svg files/i)).toBeTruthy();
    expect(screen.queryByText("Rules")).toBeNull();

    fireEvent.click(tabs[1]);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Rules")).toBeTruthy();
    expect(screen.queryByText(/drop svg files/i)).toBeNull();
    // the canvas stays above the tabs
    const main = document.querySelector("main.center")!;
    const nav = screen.getByRole("tablist");
    expect(main.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector(".app")!.className).toContain("phone");
  });
});
