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

/**
 * Returns a registrar that reports `true` when the full `sequence` is typed
 * in order, each step within `windowMs` of the previous accepted step.
 * Resets to position 0 on a non-matching key (unless that key restarts the
 * sequence, i.e. matches `sequence[0]`) or when a step arrives outside the
 * window. Consumes the match so the next detection needs a fresh sequence.
 */
export function createSequenceDetector(sequence: string[], windowMs: number) {
  let position = 0;
  let lastTime = 0;

  return function register(key: string, now: number): boolean {
    const expected = sequence[position];
    const withinWindow = position === 0 || now - lastTime <= windowMs;

    if (withinWindow && key === expected) {
      position += 1;
      lastTime = now;
      if (position === sequence.length) {
        position = 0;
        return true;
      }
      return false;
    }

    // Mismatch or timeout: a key matching the sequence's first step restarts
    // it from position 1 rather than being lost entirely.
    if (key === sequence[0]) {
      position = 1;
      lastTime = now;
      return false;
    }

    position = 0;
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
