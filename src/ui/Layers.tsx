import { useStore } from "../state/store";

export function Layers() {
  const layers = useStore((s) => s.layers);
  const figures = useStore((s) => s.figures);
  const selected = useStore((s) => s.selectedLayerId);
  const select = useStore((s) => s.selectLayer);
  const remove = useStore((s) => s.removeLayer);

  if (layers.length === 0) return <p className="hint">Click a figure in the library to place it.</p>;

  return (
    <ul className="layers">
      {layers.map((l, i) => (
        <li key={l.id} className={l.id === selected ? "sel" : ""}>
          <button type="button" className="row" onClick={() => select(l.id === selected ? null : l.id)}>
            <span className="idx">{i + 1}</span>
            <span className="name">{figures[l.figureId]?.name ?? "?"}</span>
            <span className="meta">{l.rules.length} rules</span>
          </button>
          <button type="button" className="icon" onClick={() => remove(l.id)} aria-label="Remove layer">×</button>
        </li>
      ))}
    </ul>
  );
}
