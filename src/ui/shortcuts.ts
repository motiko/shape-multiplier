import { useEffect } from "react";
import { useStore } from "../state/store";
import { totalInstances } from "../render/draw";
import { prefersReducedMotion } from "./playback";

export const SHORTCUTS: [keys: string, action: string][] = [
  ["⌘/Ctrl Z", "undo"],
  ["⇧⌘ Z · Ctrl Y", "redo"],
  ["Space", "play / pause"],
  ["F", "fit selected layer"],
  ["⌫ / Delete", "remove selected layer"],
  ["Esc", "deselect"],
];

const EDITABLE = new Set(["INPUT", "SELECT", "TEXTAREA", "BUTTON"]);

/** Returns true when the event was handled. Pure apart from store access, so it is unit-testable. */
export function handleShortcut(e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "target">): boolean {
  const s = useStore.getState();
  const t = e.target as HTMLElement | null;
  const editable = !!t && (EDITABLE.has(t.tagName) || t.isContentEditable);
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();

  if (key === "escape") {
    if (editable) t?.blur();
    else if (s.selectedLayerId) s.selectLayer(null);
    else return false;
    return true;
  }
  if (mod && key === "z") {
    if (e.shiftKey) useStore.temporal.getState().redo(); else useStore.temporal.getState().undo();
    return true;
  }
  if (mod && key === "y") { useStore.temporal.getState().redo(); return true; }
  if (mod || e.altKey || editable) return false;

  if (key === " ") {
    if (totalInstances(s) === 0) return false;
    if (s.playing) s.setPlaying(false);
    else if (prefersReducedMotion()) s.setShown(null);
    else s.setPlaying(true);
    return true;
  }
  if (key === "f") {
    if (!s.selectedLayerId) return false;
    s.fitLayer(s.selectedLayerId);
    return true;
  }
  if (key === "delete" || key === "backspace") {
    if (!s.selectedLayerId) return false;
    s.removeLayer(s.selectedLayerId);
    return true;
  }
  return false;
}

export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (handleShortcut(e)) e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
