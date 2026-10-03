# Shape Multiplier

Upload SVG figures, stack transform rules, see the combined figure live on a canvas.
Geometry is never edited: the engine only produces one placement matrix per copy.

Plan: https://claude.ai/artifact/YZuSAwHeqPjqPghv5NjApN

## Status

- [x] **M1** scaffold, SVG import, single figure on canvas
- [x] **M2** matrix engine + Repeat rule, memoised rule chain, live sliders, spiral preset
- [ ] **M3** Mirror, Ring, Grid + rule chain UI
- [ ] **M4** timeline + PNG/SVG export
- [ ] **M5** undo, presets, localStorage, phone layout

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest, 39 tests
npm run build
```

## Headless smoke check

Opens the app in headless Chrome, clicks "load the samples", optionally uploads an SVG
through the file input, and writes a screenshot:

```bash
npm run dev -- --port 5180 &
node .run/cdp-shot.mjs http://localhost:5180/ .run/shot.png test/fixtures/logo.svg
node .run/cdp-m2.mjs http://localhost:5180/        # M2: spiral preset + slider, writes .run/m2-*.png
```

## Layout

```
src/
  import/   svgParser.ts   SVG → Figure (path, rect, circle, ellipse, line, polyline, polygon, <g transform>)
            pathData.ts    path parsing, arcs → cubics, transform, bbox
            samples.ts     built-in sample figures
  model/    types.ts       Figure, Rule, Layer, Instance, Matrix
  engine/   matrix.ts      2D affine helpers + SVG transform parser
            rules/         repeat.ts (Mirror, Ring, Grid arrive in M3)
            applyRules.ts  layer → Instance[]: rules.reduce, memoised per layer, 5000-instance cap
            bounds.ts      instance bounds + fit-to-canvas transform
  presets.ts               spiral (square · 10 × 15° · ×1.15)
  render/   CanvasView.tsx Path2D + setTransform per instance, non-scaling stroke
  state/    store.ts       zustand store: figures, layers, rule add/update/remove, fitLayer, loadPreset
  ui/       DropZone, Library, Layers, RulePanel (per-rule sliders, live instance count)
test/fixtures/             square, star, multi-group logo
```
