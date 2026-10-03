/** 2D affine matrix, same layout as DOMMatrix / canvas setTransform: [a, b, c, d, e, f]. */
export type Matrix = [number, number, number, number, number, number];

export type Rect = { x: number; y: number; width: number; height: number };

/** An imported figure. pathData is absolute, flattened SVG path data in figure space. */
export type Figure = {
  id: string;
  name: string;
  pathData: string;
  bbox: Rect;
  /** Elements the importer could not convert (tag names). */
  warnings: string[];
};

export type Repeat = {
  kind: "repeat";
  count: number;
  rotateStep: number;
  scaleStep: number;
  translateStep: [number, number];
  pivot: "center" | "origin" | [number, number];
};
export type Mirror = { kind: "mirror"; axis: "x" | "y" | "both" };
export type Ring = { kind: "ring"; count: number; radius: number; alignToTangent: boolean };
export type Grid = { kind: "grid"; cols: number; rows: number; gap: number };
export type Rule = Repeat | Mirror | Ring | Grid;

export type Style = { stroke: string; strokeWidth: number; fill: string | null };

export type Layer = {
  id: string;
  figureId: string;
  base: Matrix;
  rules: Rule[];
  style: Style;
};

export type Instance = { figureId: string; matrix: Matrix; order: number };
