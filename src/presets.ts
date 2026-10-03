import type { Rule } from "./model/types";
import { SAMPLES } from "./import/samples";

export type Preset = { id: string; name: string; figure: { name: string; svg: string }; rules: Rule[] };

const sample = (name: string) => SAMPLES.find((s) => s.name === name)!;

/** The square spiral from the reference GIF: 10 copies, 15° and ×1.15 per step about the center. */
export const SPIRAL: Preset = {
  id: "spiral",
  name: "Spiral",
  figure: sample("square"),
  rules: [{ kind: "repeat", count: 10, rotateStep: 15, scaleStep: 1.15, translateStep: [0, 0], pivot: "center" }],
};

/** Eight leaves around a center, each turned to point outward. */
export const ROSETTE: Preset = {
  id: "rosette",
  name: "Rosette",
  figure: sample("leaf"),
  rules: [{ kind: "ring", count: 8, radius: 220, alignToTangent: true }],
};

/** A star shrunk into itself twice, mirrored into four quadrants and tiled 3 × 3. */
export const TILE: Preset = {
  id: "tile",
  name: "Tile",
  figure: sample("star"),
  rules: [
    { kind: "repeat", count: 2, rotateStep: 36, scaleStep: 0.6, translateStep: [0, 0], pivot: "center" },
    { kind: "mirror", axis: "both" },
    { kind: "grid", cols: 3, rows: 3, gap: 30 },
  ],
};

export const PRESETS: Preset[] = [SPIRAL, ROSETTE, TILE];
