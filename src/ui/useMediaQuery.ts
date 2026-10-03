import { useSyncExternalStore } from "react";

/** True while the media query matches. False where matchMedia is unavailable (tests, SSR). */
export function useMediaQuery(query: string): boolean {
  const subscribe = (cb: () => void) => {
    if (typeof matchMedia !== "function") return () => {};
    const mq = matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
  const get = () => (typeof matchMedia === "function" ? matchMedia(query).matches : false);
  return useSyncExternalStore(subscribe, get, () => false);
}

export const PHONE_QUERY = "(max-width: 820px)";
