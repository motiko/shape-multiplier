import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { totalInstances } from "../render/draw";
import { playDuration, prefersReducedMotion } from "./playback";

export function Timeline() {
  const figures = useStore((s) => s.figures);
  const layers = useStore((s) => s.layers);
  const shown = useStore((s) => s.shown);
  const setShown = useStore((s) => s.setShown);
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);
  const total = totalInstances({ figures, layers });
  const value = shown === null ? total : Math.min(shown, total);
  const raf = useRef(0);

  // playback: advance `shown` from where it is to `total`, then release the slider (null = all)
  useEffect(() => {
    if (!playing) return;
    const from = useStore.getState().shown;
    const start = from === null || from >= total ? 0 : from;
    const duration = playDuration(total - start);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const n = start + Math.floor(p * (total - start));
      if (p >= 1) { setShown(null); setPlaying(false); return; }
      setShown(n);
      raf.current = requestAnimationFrame(tick);
    };
    setShown(start);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, total, setShown, setPlaying]);

  if (total === 0) return null;

  return (
    <div className="timeline" role="group" aria-label="Timeline">
      <button type="button" className="btn play" aria-label={playing ? "Pause" : "Play"}
        onClick={() => {
          if (playing) { setPlaying(false); return; }
          if (prefersReducedMotion()) { setShown(null); return; } // no animation: just show everything
          setPlaying(true);
        }}>
        {playing ? "❚❚" : "▶"}
      </button>
      <input type="range" min={0} max={total} value={value} aria-label="Shown instances"
        onChange={(e) => { setPlaying(false); const n = Number(e.target.value); setShown(n >= total ? null : n); }} />
      <span className="count tl-count">{value} / {total}</span>
      <button type="button" className="btn" disabled={shown === null} onClick={() => { setPlaying(false); setShown(null); }}>All</button>
    </div>
  );
}
