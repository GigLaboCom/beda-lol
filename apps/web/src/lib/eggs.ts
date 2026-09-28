/**
 * Easter eggs (tactic 09 #19). When one is first seen, a `beda:find` event
 * goes out on `document` with its id; the tracker and accounts steps will
 * persist finds (#6). Nothing is stored now.
 */
export const FIND_EVENT = 'beda:find';

export interface FindDetail {
  id: string;
}

/** Calls `onSeen` and emits `beda:find` once, when half of `el` is on screen. */
export function watchEgg(el: Element, id: string, onSeen?: () => void): void {
  const found = () => {
    onSeen?.();
    document.dispatchEvent(new CustomEvent<FindDetail>(FIND_EVENT, { detail: { id } }));
  };
  if (typeof IntersectionObserver !== 'function') {
    found();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      found();
    },
    { threshold: 0.5 },
  );
  io.observe(el);
}
