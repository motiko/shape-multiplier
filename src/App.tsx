import { useState } from "react";
import { CanvasView } from "./render/CanvasView";
import { DropZone } from "./ui/DropZone";
import { Library } from "./ui/Library";
import { Layers } from "./ui/Layers";
import { RulePanel } from "./ui/RulePanel";
import { Timeline } from "./ui/Timeline";
import { Toolbar } from "./ui/Toolbar";
import { useShortcuts, SHORTCUTS } from "./ui/shortcuts";
import { useMediaQuery, PHONE_QUERY } from "./ui/useMediaQuery";
import { useStore } from "./state/store";

type Tab = "library" | "rules";

function LibraryPanel() {
  return (
    <>
      <h2>Library</h2>
      <DropZone />
      <Library />
    </>
  );
}

function RulesPanel() {
  return (
    <>
      <h2>Layers</h2>
      <Layers />
      <h2>Rules</h2>
      <RulePanel />
      <details className="shortcuts">
        <summary>Keyboard shortcuts</summary>
        <dl>
          {SHORTCUTS.map(([k, a]) => (<div key={a}><dt>{k}</dt><dd>{a}</dd></div>))}
        </dl>
      </details>
    </>
  );
}

export default function App() {
  const error = useStore((s) => s.error);
  const setError = useStore((s) => s.setError);
  const phone = useMediaQuery(PHONE_QUERY);
  const [tab, setTab] = useState<Tab>("library");
  useShortcuts();

  return (
    <div className={`app ${phone ? "phone" : ""}`}>
      <header className="bar">
        <h1>Shape Multiplier</h1>
        <span className="tag">M5 · polish</span>
        <Toolbar />
      </header>

      {!phone && <aside className="panel left"><LibraryPanel /></aside>}

      <main className="center">
        <CanvasView />
        <Timeline />
        {error && (
          <div className="toast" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss">×</button>
          </div>
        )}
      </main>

      {phone ? (
        <>
          <nav className="tabs" role="tablist" aria-label="Panels">
            <button type="button" role="tab" aria-selected={tab === "library"} onClick={() => setTab("library")}>Library</button>
            <button type="button" role="tab" aria-selected={tab === "rules"} onClick={() => setTab("rules")}>Layers &amp; rules</button>
          </nav>
          <aside className="panel right" role="tabpanel">{tab === "library" ? <LibraryPanel /> : <RulesPanel />}</aside>
        </>
      ) : (
        <aside className="panel right"><RulesPanel /></aside>
      )}
    </div>
  );
}
