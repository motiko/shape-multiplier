import { describe, it, expect } from "vitest";
import squareSvg from "../../test/fixtures/square.svg?raw";
import starSvg from "../../test/fixtures/star.svg?raw";
import logoSvg from "../../test/fixtures/logo.svg?raw";
import { parseSvg, shapeToPathData } from "./svgParser";

const fx = (n: string) => ({ "square.svg": squareSvg, "star.svg": starSvg, "logo.svg": logoSvg })[n]!;

describe("parseSvg", () => {
  it("imports a plain square", () => {
    const f = parseSvg(fx("square.svg"), "square.svg");
    expect(f.name).toBe("square");
    expect(f.bbox).toEqual({ x: 10, y: 10, width: 80, height: 80 });
    expect(f.warnings).toEqual([]);
  });
  it("imports a polygon star", () => {
    const f = parseSvg(fx("star.svg"));
    expect(f.pathData.startsWith("M50 5")).toBe(true);
    expect(f.pathData.endsWith("Z")).toBe(true);
    expect(f.bbox.width).toBeCloseTo(94, 6);
  });
  it("flattens nested group transforms and reports unsupported elements", () => {
    const f = parseSvg(fx("logo.svg"));
    // rect 20×20 scaled ×2 and rotated 45° about (100,100): half-diagonal = 20*√2 ≈ 28.28
    expect(f.pathData).toMatch(/^M/);
    expect(f.warnings).toEqual(["image", "text"]);
    // the line from (0,0) to (200,200) sets the bbox
    expect(f.bbox).toEqual({ x: 0, y: 0, width: 200, height: 200 });
  });
  it("rotated group lands in the right place", () => {
    const f = parseSvg(`<svg xmlns="http://www.w3.org/2000/svg"><g transform="translate(100 100)"><g transform="rotate(45) scale(2)"><rect x="-10" y="-10" width="20" height="20"/></g></g></svg>`);
    const r = 20 * Math.SQRT2;
    expect(f.bbox.x).toBeCloseTo(100 - r, 3);
    expect(f.bbox.width).toBeCloseTo(2 * r, 3);
  });
  it("rejects non-SVG and empty SVG", () => {
    expect(() => parseSvg("<html></html>")).toThrow();
    expect(() => parseSvg(`<svg xmlns="http://www.w3.org/2000/svg"><text>x</text></svg>`)).toThrow(/No drawable/);
  });
  it("converts basic shapes to path data", () => {
    const doc = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="10" height="10" rx="2"/><line x1="1" y1="2" x2="3" y2="4"/></svg>`,
      "image/svg+xml",
    );
    const [rect, line] = Array.from(doc.documentElement.children);
    expect(shapeToPathData(rect)).toContain("A2 2 0 0 1");
    expect(shapeToPathData(line)).toBe("M1 2L3 4");
  });

  it("resolves local <use href=\"#id\"> with x/y and transform, and warns on external ones", () => {
    const fig = parseSvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs><path id="sq" d="M0 0H10V10H0Z"/></defs>
      <use href="#sq"/>
      <use href="#sq" x="20" y="0"/>
      <use xlink:href="#sq" transform="translate(0 20) scale(2)"/>
      <use href="other.svg#sq"/>
    </svg>`);
    expect(fig.pathData.match(/M/g)).toHaveLength(3);
    expect(fig.bbox).toEqual({ x: 0, y: 0, width: 30, height: 40 });
    expect(fig.warnings).toEqual(["use"]);
  });

  it("does not loop on a <use> that references its own ancestor", () => {
    const fig = parseSvg(`<svg xmlns="http://www.w3.org/2000/svg"><g id="g"><rect width="1" height="1"/><use href="#g"/></g></svg>`);
    expect(fig.warnings).toEqual(["use"]);
    expect(fig.bbox.width).toBe(1);
  });
});
