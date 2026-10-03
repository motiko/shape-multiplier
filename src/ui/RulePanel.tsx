import { useStore } from "../state/store";
import { applyRulesDetailed, INSTANCE_CAP } from "../engine/applyRules";
import { DEFAULT_REPEAT } from "../engine/rules/repeat";
import type { Layer, Repeat, Rule } from "../model/types";

type SliderProps = {
  label: string; value: number; min: number; max: number; step?: number;
  format?: (v: number) => string; onChange: (v: number) => void;
};
function Slider({ label, value, min, max, step = 1, format = String, onChange }: SliderProps) {
  return (
    <div className="slider">
      <span className="lab"><span>{label}</span><output>{format(value)}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function RepeatForm({ rule, size, onChange }: { rule: Repeat; size: number; onChange: (patch: Partial<Repeat>) => void }) {
  const t = Math.max(10, Math.ceil(size));
  return (
    <>
      <Slider label="count" value={rule.count} min={0} max={40} onChange={(count) => onChange({ count })} />
      <Slider label="rotate step" value={rule.rotateStep} min={-180} max={180} format={(v) => `${v}°`}
        onChange={(rotateStep) => onChange({ rotateStep })} />
      <Slider label="scale step" value={rule.scaleStep} min={0.5} max={1.5} step={0.01} format={(v) => `×${v.toFixed(2)}`}
        onChange={(scaleStep) => onChange({ scaleStep })} />
      <Slider label="move x" value={rule.translateStep[0]} min={-t} max={t}
        onChange={(x) => onChange({ translateStep: [x, rule.translateStep[1]] })} />
      <Slider label="move y" value={rule.translateStep[1]} min={-t} max={t}
        onChange={(y) => onChange({ translateStep: [rule.translateStep[0], y] })} />
      <div className="field">
        <span className="lab"><span>pivot</span></span>
        <select value={typeof rule.pivot === "string" ? rule.pivot : "center"} aria-label="pivot"
          onChange={(e) => onChange({ pivot: e.target.value as "center" | "origin" })}>
          <option value="center">figure center</option>
          <option value="origin">figure origin</option>
        </select>
      </div>
    </>
  );
}

function RuleCard({ layer, index, rule }: { layer: Layer; index: number; rule: Rule }) {
  const figures = useStore((s) => s.figures);
  const updateRule = useStore((s) => s.updateRule);
  const removeRule = useStore((s) => s.removeRule);
  const bbox = figures[layer.figureId]?.bbox;
  const size = bbox ? Math.max(bbox.width, bbox.height) : 100;
  return (
    <li className="rule">
      <div className="rule-head">
        <span className="idx">{index + 1}</span>
        <span className="name">{rule.kind}</span>
        <button type="button" className="icon" onClick={() => removeRule(layer.id, index)} aria-label={`Remove ${rule.kind} rule`}>×</button>
      </div>
      {rule.kind === "repeat" ? (
        <RepeatForm rule={rule} size={size} onChange={(patch) => updateRule(layer.id, index, patch)} />
      ) : (
        <p className="hint">{rule.kind} parameters arrive in M3.</p>
      )}
    </li>
  );
}

export function RulePanel() {
  const layers = useStore((s) => s.layers);
  const figures = useStore((s) => s.figures);
  const selectedId = useStore((s) => s.selectedLayerId);
  const addRule = useStore((s) => s.addRule);
  const fitLayer = useStore((s) => s.fitLayer);
  const layer = layers.find((l) => l.id === selectedId);

  if (!layer) return <p className="hint">Select a layer to edit its rules.</p>;
  const { instances, cappedAtRule } = applyRulesDetailed(layer, figures[layer.figureId]);

  return (
    <div className="rules">
      <ul className="rule-list">
        {layer.rules.map((rule, i) => <RuleCard key={i} layer={layer} index={i} rule={rule} />)}
      </ul>
      <div className="rule-actions">
        <button type="button" onClick={() => addRule(layer.id, { ...DEFAULT_REPEAT })}>+ Repeat</button>
        <button type="button" onClick={() => fitLayer(layer.id)} title="Rescale the layer so every copy fits the canvas">Fit</button>
      </div>
      <p className="count" aria-live="polite">
        {instances.length} {instances.length === 1 ? "instance" : "instances"}
        {cappedAtRule !== null && <em> · capped at {INSTANCE_CAP} by rule {cappedAtRule + 1}</em>}
      </p>
    </div>
  );
}
