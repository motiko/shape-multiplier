import { CanvasView } from "./render/CanvasView";
import { DropZone } from "./ui/DropZone";
import { Library } from "./ui/Library";
import { Layers } from "./ui/Layers";
import { RulePanel } from "./ui/RulePanel";
import { useStore } from "./state/store";
import { PRESETS } from "./presets";

export default function App() {
  const error = useStore((s) => s.error);
  const setError = useStore((s) => s.setError);
  const loadPreset = useStore((s) => s.loadPreset);

  return (
    <div className="app">
      <header className="bar">
        <h1>Shape Multiplier</h1>
        <span className="tag">M3 · rule chain</span>
        <div className="bar-actions">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="btn" onClick={() => loadPreset(p.id)}>{p.name} preset</button>
          ))}
        </div>
      </header>

      <aside className="panel left">
        <h2>Library</h2>
        <DropZone />
        <Library />
      </aside>

      <main className="center">
        <CanvasView />
        {error && (
          <div className="toast" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss">×</button>
          </div>
        )}
      </main>

      <aside className="panel right">
        <h2>Layers</h2>
        <Layers />
        <h2>Rules</h2>
        <RulePanel />
      </aside>
    </div>
  );
}
