import type { Rule } from "./model/types";
import { SAMPLES } from "./import/samples";

export type Preset = { id: string; name: string; figure: { name: string; svg: string }; rules: Rule[] };

const square = SAMPLES.find((s) => s.name === "square")!;

/** The square spiral from the reference GIF: 10 copies, 15° and ×1.15 per step about the center. */
export const SPIRAL: Preset = {
  id: "spiral",
  name: "Spiral",
  figure: square,
  rules: [{ kind: "repeat", count: 10, rotateStep: 15, scaleStep: 1.15, translateStep: [0, 0], pivot: "center" }],
};

export const PRESETS: Preset[] = [SPIRAL];
