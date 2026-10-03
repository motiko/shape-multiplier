import type { Doc } from "./store";
import { useStore, docOf } from "./store";

export const STORAGE_KEY = "shape-multiplier:doc:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): StorageLike | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}

const isRect = (r: unknown) => !!r && typeof r === "object" && ["x", "y", "width", "height"].every((k) => typeof (r as Record<string, unknown>)[k] === "number");

/** Structural check so a corrupt or foreign value never reaches the store. */
export function isDoc(x: unknown): x is Doc {
  if (!x || typeof x !== "object") return false;
  const d = x as Partial<Doc>;
  if (!d.figures || typeof d.figures !== "object" || !Array.isArray(d.layers) || !d.canvas) return false;
  if (typeof d.canvas.width !== "number" || typeof d.canvas.height !== "number" || typeof d.canvas.background !== "string") return false;
  for (const f of Object.values(d.figures)) {
    if (!f || typeof f.id !== "string" || typeof f.pathData !== "string" || !isRect(f.bbox) || !Array.isArray(f.warnings)) return false;
  }
  for (const l of d.layers) {
    if (!l || typeof l.id !== "string" || typeof l.figureId !== "string" || !Array.isArray(l.base) || l.base.length !== 6 || !Array.isArray(l.rules) || !l.style) return false;
    if (!(l.figureId in d.figures)) return false;
  }
  return true;
}

export function readDocument(store: StorageLike | null = storage()): Doc | null {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDoc(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDocument(doc: Doc, store: StorageLike | null = storage()): boolean {
  try {
    if (!store) return false;
    if (Object.keys(doc.figures).length === 0 && doc.layers.length === 0) store.removeItem(STORAGE_KEY);
    else store.setItem(STORAGE_KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false; // quota or privacy mode: keep working without persistence
  }
}

/**
 * Restore the saved document (if any) and keep saving on every document change,
 * debounced. Returns an unsubscribe function.
 */
export function startPersistence(delay = 300, store: StorageLike | null = storage()): () => void {
  const saved = readDocument(store);
  if (saved) {
    useStore.getState().loadDocument(saved);
    useStore.temporal.getState().clear(); // the restore itself is not an undo step
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastDoc: Doc = docOf(useStore.getState());
  const unsub = useStore.subscribe((s) => {
    const doc = docOf(s);
    if (doc.figures === lastDoc.figures && doc.layers === lastDoc.layers && doc.canvas === lastDoc.canvas) return;
    lastDoc = doc;
    clearTimeout(timer);
    timer = setTimeout(() => writeDocument(doc, store), delay);
  });
  return () => { clearTimeout(timer); unsub(); };
}
