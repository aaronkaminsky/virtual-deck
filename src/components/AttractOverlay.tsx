import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import type { AttractAntic } from '@/shared/types';
import type { AttractState } from '@/hooks/usePartySocket';
import { loadCritter } from '@/lib/critterLottie';

export const ATTRACT_PERFORM_MS: Record<AttractAntic, number> = {
  peekaboo: 16000,
  nap: 20000,
  houseOfCards: 24000,
};
export const ATTRACT_LEAVE_MS = 600;
// The house tumbles before the critter retreats (85% of the 24s house keyframes).
export const ATTRACT_HOUSE_COLLAPSE_MS = 20_500;

const CRITTER_SIZE = 72;
const PEEK_COUNT = 3;
const PEEK_INTERVAL_MS = 5333; // 16s performance / 3 peeks

// Two-story card house built beside the pile: two bottom A-frames (card pairs
// leaning into each other at ±30°) and one top A-frame whose feet land on the
// bottom apexes. Positions are tuned so tops touch and the structure reads as
// stacked triangles. Delays land one card at a time.
const HOUSE_CARDS: { left: number; bottom: number; rot: number; delayMs: number }[] = [
  { left: 0, bottom: 0, rot: 30, delayMs: 2800 },
  { left: 17, bottom: 0, rot: -30, delayMs: 4300 },
  { left: 34, bottom: 0, rot: 30, delayMs: 5800 },
  { left: 51, bottom: 0, rot: -30, delayMs: 7300 },
  { left: 17, bottom: 31, rot: 30, delayMs: 9200 },
  { left: 34, bottom: 31, rot: -30, delayMs: 11100 },
];

function shuffleRects(rects: DOMRect[]): DOMRect[] {
  const out = [...rects];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface AttractOverlayProps {
  attract: AttractState | null;
  onLocalDismiss: () => void;
  onExited: () => void;
}

export function AttractOverlay({ attract, onLocalDismiss, onExited }: AttractOverlayProps) {
  const critterRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [peekRects, setPeekRects] = useState<DOMRect[] | null>(null);
  const [peekIndex, setPeekIndex] = useState(0);
  const [houseCollapsed, setHouseCollapsed] = useState(false);

  const active = attract !== null;
  const nonce = attract?.nonce ?? 0;
  const antic = attract?.antic ?? null;
  const leaving = attract?.leaving ?? false;

  // Measure anchors once per performance; skip the fire if none are on screen.
  // Peek-a-boo hides behind a random sequence of objects that have enough
  // headroom above them for the critter to visibly emerge from behind; other
  // antics stay at the primary anchor (the top pile).
  useEffect(() => {
    if (!active) { setAnchor(null); setPeekRects(null); return; }
    const els = Array.from(document.querySelectorAll('[data-attract-anchor]'));
    const rects = els.map((el) => el.getBoundingClientRect());
    const primary = rects[0];
    if (!primary) { onExited(); return; }
    if (antic === 'peekaboo') {
      const roomy = rects.filter((r) =>
        r.width >= CRITTER_SIZE * 0.75 && r.top >= CRITTER_SIZE && r.bottom <= window.innerHeight
      );
      const pool = shuffleRects(roomy.length > 0 ? roomy : [primary]);
      setPeekRects(Array.from({ length: PEEK_COUNT }, (_, i) => pool[i % pool.length]));
      setPeekIndex(0);
    }
    setAnchor(primary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, nonce, antic]);

  // Startle on real input only. Mouse movement never scares it off, so a
  // returning player can watch the performance.
  useEffect(() => {
    if (!active || leaving) return;
    const startle = () => onLocalDismiss();
    window.addEventListener('pointerdown', startle);
    window.addEventListener('keydown', startle);
    window.addEventListener('wheel', startle);
    return () => {
      window.removeEventListener('pointerdown', startle);
      window.removeEventListener('keydown', startle);
      window.removeEventListener('wheel', startle);
    };
  }, [active, leaving, onLocalDismiss]);

  // Natural end of the performance (the retreat is baked into each antic's keyframes).
  useEffect(() => {
    if (!active || !antic || leaving) return;
    const t = setTimeout(onExited, ATTRACT_PERFORM_MS[antic]);
    return () => clearTimeout(t);
  }, [active, antic, nonce, leaving, onExited]);

  // Startled: play the scurry exit, then unmount.
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onExited, ATTRACT_LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving, onExited]);

  // Advance peek-a-boo to its next hiding spot.
  useEffect(() => {
    if (!active || antic !== 'peekaboo' || leaving) return;
    if (peekIndex >= PEEK_COUNT - 1) return;
    const t = setTimeout(() => setPeekIndex((i) => i + 1), PEEK_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [active, antic, leaving, peekIndex, nonce]);

  // The finished house collapses (staggered tumble) before the critter retreats.
  useEffect(() => {
    setHouseCollapsed(false);
    if (!active || antic !== 'houseOfCards' || leaving) return;
    const t = setTimeout(() => setHouseCollapsed(true), ATTRACT_HOUSE_COLLAPSE_MS);
    return () => clearTimeout(t);
  }, [active, antic, nonce, leaving]);

  // Lazy-load the Lottie critter; loadCritter resolves null on failure (silent no-op).
  // Peek-a-boo remounts the critter per hiding spot (keyed div), so reload per peek.
  useEffect(() => {
    if (!anchor || !antic || !critterRef.current) return;
    const variant = antic === 'nap' ? 'sleepy' : antic === 'houseOfCards' ? 'gaze' : 'idle';
    let cancelled = false;
    void loadCritter(critterRef.current, antic === 'nap' ? 0.4 : 1, variant).then((anim) => {
      if (cancelled) { anim?.destroy(); return; }
      animRef.current = anim;
    });
    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, antic, nonce, peekIndex]);

  if (!active || !antic || !anchor) return null;

  const clipRect = antic === 'peekaboo' ? (peekRects?.[peekIndex] ?? anchor) : anchor;
  const clipTop = Math.max(0, clipRect.top - CRITTER_SIZE);
  const critterLeft = Math.max(0, (clipRect.width - CRITTER_SIZE) / 2);
  const tumbling = leaving || houseCollapsed;

  return (
    <div
      aria-hidden="true"
      data-testid="attract-overlay"
      data-antic={antic}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000, overflow: 'hidden' }}
    >
      {/* Clip window above the anchored object: the critter translates up into it,
          appearing from behind the object's top edge. */}
      <div
        key={antic === 'peekaboo' ? `${nonce}-${peekIndex}` : nonce}
        style={{ position: 'absolute', left: clipRect.left, top: clipTop, width: clipRect.width, height: CRITTER_SIZE, overflow: 'hidden' }}
      >
        <div
          ref={critterRef}
          className={`attract-critter ${antic === 'peekaboo' ? 'attract-peek-once' : `attract-${antic}`}${leaving ? ' attract-scurry' : ''}`}
          style={{ position: 'absolute', bottom: 0, left: critterLeft, width: CRITTER_SIZE, height: CRITTER_SIZE }}
        />
      </div>
      {antic === 'nap' && !leaving && (
        <div style={{ position: 'absolute', left: anchor.left + anchor.width * 0.55, top: clipTop, width: 40, height: CRITTER_SIZE }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="attract-zzz" style={{ animationDelay: `${i * 0.9}s` }}>z</span>
          ))}
        </div>
      )}
      {antic === 'houseOfCards' && (
        <div
          className={tumbling ? 'attract-collapse' : undefined}
          style={{ position: 'absolute', left: anchor.right + 12, top: anchor.bottom - 76, width: 92, height: 76 }}
        >
          {HOUSE_CARDS.map((c, i) => (
            <div
              key={i}
              className="attract-house-card"
              style={{
                left: c.left,
                bottom: c.bottom,
                ['--card-rot' as string]: `${c.rot}deg`,
                // Tumble needs its own short stagger — the build delays would
                // otherwise postpone the collapse animation by seconds.
                animationDelay: tumbling ? `${i * 60}ms` : `${c.delayMs}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
