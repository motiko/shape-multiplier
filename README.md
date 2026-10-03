# Shape Multiplier

Upload SVG figures, stack transform rules, see the combined figure live on a canvas.
Geometry is never edited: the engine only produces one placement matrix per copy.

Plan: https://claude.ai/artifact/YZuSAwHeqPjqPghv5NjApN

## Status

- [x] **M1** scaffold, SVG import, single figure on canvas
- [x] **M2** matrix engine + Repeat rule, memoised rule chain, live sliders, spiral preset
- [x] **M3** Mirror, Ring, Grid, rule chain UI (add / reorder / remove, per-rule counts, cap warning)
- [ ] **M4** timeline + PNG/SVG export
- [ ] **M5** undo, presets, localStorage, phone layout

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest, 57 tests
npm run build
```

## Headless smoke check

Opens the app in headless Chrome, clicks "load the samples", optionally uploads an SVG
through the file input, and writes a screenshot:

```bash
npm run dev -- --port 5180 &
node .run/cdp-shot.mjs http://localhost:5180/ .run/shot.png test/fixtures/logo.svg
node .run/cdp-m2.mjs http://localhost:5180/        # M2: spiral preset + slider, writes .run/m2-*.png
node .run/cdp-m3.mjs http://localhost:5180/        # M3: spiral → mirror → ring chain, reorder, grid; writes .run/m3-*.png
```

## Rule semantics

- **Repeat** steps in figure space (translate, then rotate + scale about the pivot), so copies orbit their own center even after other rules.
- **Mirror** reflects the whole current group across its right edge (x), bottom edge (y) or both, so the reflection sits beside the original.
- **Ring** puts `count` copies of the group on a circle (canvas units) around the group center, first copy at the top; `alignToTangent` rotates each copy by its angle.
- **Grid** tiles the group `cols × rows`, one group bounds plus `gap` apart.
- Adding a rule re-fits the layer to the canvas; later slider changes don't, use **Fit**.

## Layout

```
src/
  import/   svgParser.ts   SVG → Figure (path, rect, circle, ellipse, line, polyline, polygon, <g transform>)
            pathData.ts    path parsing, arcs → cubics, transform, bbox
            samples.ts     built-in sample figures
  model/    types.ts       Figure, Rule, Layer, Instance, Matrix
  engine/   matrix.ts      2D affine helpers + SVG transform parser
            rules/         repeat.ts mirror.ts ring.ts grid.ts, index.ts (defaults, output counts)
            applyRules.ts  layer → Instance[]: rules in order, memoised per layer, 5000-instance cap
                           (rules build at most the cap; later rules are predicted, not applied)
            bounds.ts      instance bounds + fit-to-canvas transform
  presets.ts               spiral (square · 10 × 15° · ×1.15)
  render/   CanvasView.tsx Path2D + setTransform per instance, non-scaling stroke
  state/    store.ts       zustand store: figures, layers, rule add/update/remove/move, fitLayer, loadPreset
  ui/       DropZone, Library, Layers, RulePanel (add menu, per-kind forms, ↑↓ reorder, → count per rule)
test/fixtures/             square, star, multi-group logo
```
