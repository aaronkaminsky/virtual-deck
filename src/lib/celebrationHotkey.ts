/**
 * Returns a registrar that reports `true` when called twice within `windowMs`.
 * Each successful double-press consumes the pair, so the next detection needs
 * two fresh presses.
 */
export function createDoubleKeyDetector(windowMs = 500) {
  let last = 0;
  return function register(now: number): boolean {
    if (last !== 0 && now - last <= windowMs) {
      last = 0;
      return true;
    }
    last = now;
    return false;
  };
}

type EditableLike = { tagName?: string; isContentEditable?: boolean } | null;

export function isEditableTarget(target: EditableLike): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
