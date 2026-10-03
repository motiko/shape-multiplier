import { useState } from "react";
import { useStore as useZustand } from "zustand";
import { useStore } from "../state/store";
import { PRESETS } from "../presets";
import { toSvg } from "../export/toSvg";
import { toPng, PNG_SCALES, type PngScale } from "../export/toPng";
import { downloadBlob, timestampName } from "../export/download";

/** The stage's current text color, so exports match what is on screen. */
function stageColor(): string {
  const el = document.querySelector<HTMLElement>(".stage") ?? document.body;
  return getComputedStyle(el).color || "#000";
}

export function Toolbar() {
  const loadPreset = useStore((s) => s.loadPreset);
  const newDocument = useStore((s) => s.newDocument);
  const setError = useStore((s) => s.setError);
  const layers = useStore((s) => s.layers);
  const figures = useStore((s) => s.figures);
  const canUndo = useZustand(useStore.temporal, (t) => t.pastStates.length > 0);
  const canRedo = useZustand(useStore.temporal, (t) => t.futureStates.length > 0);
  const [scale, setScale] = useState<PngScale>(2);
  const empty = layers.length === 0;
  const blank = empty && Object.keys(figures).length === 0;

  const scene = () => {
    const { figures, layers, shown } = useStore.getState();
    return { figures, layers, shown };
  };

  const exportSvg = () => {
    const { canvas } = useStore.getState();
    const svg = toSvg(scene(), { ...canvas, fg: stageColor() });
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), timestampName("shape-multiplier", "svg"));
  };

  const exportPng = async () => {
    const { canvas } = useStore.getState();
    try {
      const blob = await toPng(scene(), { ...canvas, fg: stageColor(), scale });
      downloadBlob(blob, timestampName(`shape-multiplier@${scale}x`, "png"));
    } catch (e) {
      setError(`PNG export failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="bar-actions">
      <button type="button" className="btn" disabled={!canUndo} onClick={() => useStore.temporal.getState().undo()} aria-label="Undo" title="Undo (⌘Z)">↶</button>
      <button type="button" className="btn" disabled={!canRedo} onClick={() => useStore.temporal.getState().redo()} aria-label="Redo" title="Redo (⇧⌘Z)">↷</button>
      <button type="button" className="btn" disabled={blank} onClick={newDocument} title="Clear the document (undoable)">New</button>
      <span className="sep" aria-hidden="true" />
      {PRESETS.map((p) => (
        <button key={p.id} type="button" className="btn" onClick={() => loadPreset(p.id)}>{p.name}</button>
      ))}
      <span className="sep" aria-hidden="true" />
      <select className="btn" value={scale} aria-label="PNG scale" onChange={(e) => setScale(Number(e.target.value) as PngScale)}>
        {PNG_SCALES.map((s) => <option key={s} value={s}>{s}×</option>)}
      </select>
      <button type="button" className="btn" disabled={empty} onClick={() => void exportPng()}>Export PNG</button>
      <button type="button" className="btn" disabled={empty} onClick={exportSvg}>Export SVG</button>
    </div>
  );
}
