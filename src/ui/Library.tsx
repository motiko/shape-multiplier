import { useStore } from "../state/store";
import type { Figure } from "../model/types";
import { SAMPLES } from "../import/samples";
import { parseSvg } from "../import/svgParser";

function Thumb({ fig }: { fig: Figure }) {
  const { x, y, width, height } = fig.bbox;
  const pad = Math.max(width, height) * 0.08 || 1;
  return (
    <svg viewBox={`${x - pad} ${y - pad} ${width + 2 * pad} ${height + 2 * pad}`} className="thumb" aria-hidden="true">
      <path d={fig.pathData} fill="none" stroke="currentColor" strokeWidth={Math.max(width, height) / 60} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Library() {
  const figures = useStore((s) => s.figures);
  const addLayer = useStore((s) => s.addLayer);
  const addFigure = useStore((s) => s.addFigure);
  const removeFigure = useStore((s) => s.removeFigure);
  const list = Object.values(figures);

  const loadSamples = () => {
    for (const s of SAMPLES) addFigure(parseSvg(s.svg, s.name));
  };

  if (list.length === 0)
    return (
      <p className="hint">
        No figures yet. Import an SVG, or{" "}
        <button type="button" className="link" onClick={loadSamples}>load the samples</button>.
      </p>
    );

  return (
    <ul className="library">
      {list.map((fig) => (
        <li key={fig.id}>
          <button type="button" className="fig" onClick={() => addLayer(fig.id)} title="Add to canvas">
            <Thumb fig={fig} />
            <span className="name">{fig.name}</span>
            <span className="meta">
              {Math.round(fig.bbox.width)} × {Math.round(fig.bbox.height)}
              {fig.warnings.length > 0 && <em title={`Skipped: ${fig.warnings.join(", ")}`}> · {fig.warnings.length} skipped</em>}
            </span>
          </button>
          <button type="button" className="icon" onClick={() => removeFigure(fig.id)} aria-label={`Remove ${fig.name}`}>×</button>
        </li>
      ))}
    </ul>
  );
}
