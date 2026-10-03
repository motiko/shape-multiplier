# Shape Multiplier

Upload SVG figures, stack transform rules, see the combined figure live on a canvas.
Geometry is never edited: the engine only produces one placement matrix per copy.

Plan: https://claude.ai/artifact/YZuSAwHeqPjqPghv5NjApN

## Status

- [x] **M1** scaffold, SVG import, single figure on canvas
- [x] **M2** matrix engine + Repeat rule, memoised rule chain, live sliders, spiral preset
- [x] **M3** Mirror, Ring, Grid, rule chain UI (add / reorder / remove, per-rule counts, cap warning)
- [x] **M4** timeline scrubber + play, PNG export at 1×/2×/4×, lossless SVG export (defs + use), `<use>` re-import
- [x] **M5** undo/redo (zundo), spiral · rosette · tile presets, localStorage autosave + restore, keyboard shortcuts, phone tabs

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest, 102 tests
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
node .run/cdp-m4.mjs http://localhost:5180/        # M4: scrub, play, intercepted SVG/PNG downloads; writes .run/m4-*.png
node .run/cdp-m5.mjs http://localhost:5180/        # M5: presets, undo/redo, reload persistence, 400px phone tabs; writes .run/m5-*.png
```

## Rule semantics

- **Repeat** steps in figure space (translate, then rotate + scale about the pivot), so copies orbit their own center even after other rules.
- **Mirror** reflects the whole current group across its right edge (x), bottom edge (y) or both, so the reflection sits beside the original.
- **Ring** puts `count` copies of the group on a circle (canvas units) around the group center, first copy at the top; `alignToTangent` rotates each copy by its angle.
- **Grid** tiles the group `cols × rows`, one group bounds plus `gap` apart.
- Adding a rule re-fits the layer to the canvas; later slider changes don't, use **Fit**.

## Timeline and export

- The timeline under the canvas sets how many instances are drawn, counted across layers in draw order. Play grows them in (~90 ms per copy, 1.2–8 s total) and releases to "all" at the end; reduced-motion users jump straight to all.
- **Export PNG** renders through the same `drawScene` as the canvas on an offscreen canvas at 1×, 2× or 4× the 1000 × 1000 design size. Strokes scale with the image, colors match the current theme.
- **Export SVG** writes one `<path>` per figure in `<defs>` and one `<use transform="matrix(…)">` per instance, with `stroke-width` divided by the instance scale (non-scaling stroke). It is lossless and re-imports through the drop zone, since the parser resolves local `<use href="#id">`.
- Both exports respect the timeline position.

## Undo, persistence, shortcuts, phone

- **Undo/redo** tracks the document (figures, layers, canvas) only, not selection or the timeline. Discrete actions are one step each; a slider drag collapses into a single step (edits closer than 400 ms while dragging). Multi-write actions (preset load, import that auto-places, add rule + fit) are grouped into one step. History holds 100 steps.
- **Presets**: Spiral (square, Repeat 10 × 15° × 1.15), Rosette (leaf, Ring 8), Tile (star, Repeat → Mirror both → Grid 3 × 3). Loading a preset reuses a same-named figure and fits the layer.
- **Autosave** writes the document to `localStorage` 300 ms after the last change and restores it on load (validated structurally; corrupt data is ignored). **New** clears it and is undoable.
- **Shortcuts**: ⌘/Ctrl Z undo, ⇧⌘ Z or Ctrl Y redo, Space play/pause, F fit the selected layer, ⌫/Delete remove it, Esc deselect (or leave a focused control). Listed under "Keyboard shortcuts" in the rules panel.
- **Phone** (≤ 820 px): the toolbar wraps, the canvas and timeline sit on top, and the side panels collapse into two tabs below. No horizontal scroll at 400 px.

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
  presets.ts               spiral · rosette · tile
  render/   draw.ts        drawScene(ctx, scene, opts): shared by canvas and PNG export; visibleInstances applies the timeline budget
            CanvasView.tsx sizes the stage for devicePixelRatio and calls drawScene per animation frame
  export/   toSvg.ts       <defs><path> + <use transform> per instance
            toPng.ts       offscreen canvas at 1×/2×/4×
            download.ts    blob download helper
  state/    store.ts       zustand + zundo: document (figures, layers, canvas) with undo history; selection, timeline, playing
            persist.ts     localStorage read/write/validate, debounced autosave, restore on boot
  ui/       DropZone, Library, Layers, RulePanel (add menu, per-kind forms, ↑↓ reorder, → count per rule)
            Timeline (scrubber, play/pause, All), Toolbar (undo/redo, New, presets, PNG scale + export, SVG export)
            shortcuts.ts (keyboard), useMediaQuery.ts (phone tabs), playback.ts
test/fixtures/             square, star, multi-group logo
```
