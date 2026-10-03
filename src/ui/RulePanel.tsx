import { useStore } from "../state/store";
import { applyRulesDetailed, INSTANCE_CAP } from "../engine/applyRules";
import { defaultRule, RULE_KINDS } from "../engine/rules";
import type { Grid, Layer, Mirror, Repeat, Ring, Rule } from "../model/types";

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

function Select<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <div className="field">
      <span className="lab"><span>{label}</span></span>
      <select value={value} aria-label={label} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

type FormProps<R extends Rule> = { rule: R; size: number; onChange: (patch: Partial<R>) => void };

function RepeatForm({ rule, size, onChange }: FormProps<Repeat>) {
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
      <Select label="pivot" value={typeof rule.pivot === "string" ? rule.pivot : "center"}
        options={[["center", "figure center"], ["origin", "figure origin"]]}
        onChange={(pivot) => onChange({ pivot })} />
    </>
  );
}

function MirrorForm({ rule, onChange }: FormProps<Mirror>) {
  return (
    <Select label="axis" value={rule.axis}
      options={[["x", "x · flip sideways"], ["y", "y · flip downwards"], ["both", "both · four quadrants"]]}
      onChange={(axis) => onChange({ axis })} />
  );
}

function RingForm({ rule, onChange }: FormProps<Ring>) {
  return (
    <>
      <Slider label="count" value={rule.count} min={1} max={36} onChange={(count) => onChange({ count })} />
      <Slider label="radius" value={rule.radius} min={0} max={500} step={5} onChange={(radius) => onChange({ radius })} />
      <Toggle label="align to tangent" value={rule.alignToTangent} onChange={(alignToTangent) => onChange({ alignToTangent })} />
    </>
  );
}

function GridForm({ rule, onChange }: FormProps<Grid>) {
  return (
    <>
      <Slider label="columns" value={rule.cols} min={1} max={20} onChange={(cols) => onChange({ cols })} />
      <Slider label="rows" value={rule.rows} min={1} max={20} onChange={(rows) => onChange({ rows })} />
      <Slider label="gap" value={rule.gap} min={-100} max={200} step={5} onChange={(gap) => onChange({ gap })} />
    </>
  );
}

function RuleForm({ rule, size, onChange }: FormProps<Rule>) {
  switch (rule.kind) {
    case "repeat": return <RepeatForm rule={rule} size={size} onChange={onChange} />;
    case "mirror": return <MirrorForm rule={rule} size={size} onChange={onChange} />;
    case "ring": return <RingForm rule={rule} size={size} onChange={onChange} />;
    case "grid": return <GridForm rule={rule} size={size} onChange={onChange} />;
  }
}

function RuleCard({ layer, index, rule, count, status }: {
  layer: Layer; index: number; rule: Rule; count: number; status: "ok" | "capped" | "skipped";
}) {
  const figures = useStore((s) => s.figures);
  const updateRule = useStore((s) => s.updateRule);
  const removeRule = useStore((s) => s.removeRule);
  const moveRule = useStore((s) => s.moveRule);
  const bbox = figures[layer.figureId]?.bbox;
  const size = bbox ? Math.max(bbox.width, bbox.height) : 100;
  const last = layer.rules.length - 1;
  return (
    <li className={`rule ${status}`}>
      <div className="rule-head">
        <span className="idx">{index + 1}</span>
        <span className="name">{rule.kind}</span>
        <span className="out" title={status === "ok" ? "instances after this rule" : status === "capped" ? `would be ${count}, capped at ${INSTANCE_CAP}` : "not applied: an earlier rule hit the cap"}>
          {status === "ok" ? `→ ${count}` : status === "capped" ? `→ ${count} · capped` : "skipped"}
        </span>
        <span className="rule-tools">
          <button type="button" className="icon" disabled={index === 0} onClick={() => moveRule(layer.id, index, index - 1)} aria-label={`Move ${rule.kind} rule up`}>↑</button>
          <button type="button" className="icon" disabled={index === last} onClick={() => moveRule(layer.id, index, index + 1)} aria-label={`Move ${rule.kind} rule down`}>↓</button>
          <button type="button" className="icon" onClick={() => removeRule(layer.id, index)} aria-label={`Remove ${rule.kind} rule`}>×</button>
        </span>
      </div>
      <RuleForm rule={rule} size={size} onChange={(patch) => updateRule(layer.id, index, patch)} />
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
  const { instances, cappedAtRule, counts } = applyRulesDetailed(layer, figures[layer.figureId]);

  const add = (kind: Rule["kind"]) => addRule(layer.id, defaultRule(kind), true);

  return (
    <div className="rules">
      {layer.rules.length === 0 && <p className="hint">No rules yet. Add one below; they run top to bottom.</p>}
      <ul className="rule-list">
        {layer.rules.map((rule, i) => (
          <RuleCard key={i} layer={layer} index={i} rule={rule} count={counts[i]}
            status={cappedAtRule === null || i < cappedAtRule ? "ok" : i === cappedAtRule ? "capped" : "skipped"} />
        ))}
      </ul>
      <div className="rule-actions">
        {RULE_KINDS.map((k) => <button key={k} type="button" onClick={() => add(k)}>+ {k}</button>)}
        <button type="button" className="fit" onClick={() => fitLayer(layer.id)} title="Rescale the layer so every copy fits the canvas">Fit</button>
      </div>
      <p className="count" aria-live="polite">
        {instances.length} {instances.length === 1 ? "instance" : "instances"}
        {cappedAtRule !== null && <em> · capped at {INSTANCE_CAP} by rule {cappedAtRule + 1}</em>}
      </p>
    </div>
  );
}
