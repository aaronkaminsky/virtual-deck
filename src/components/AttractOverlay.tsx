import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import type { AttractAntic } from '@/shared/types';
import type { AttractState } from '@/hooks/usePartySocket';
import { loadCritter } from '@/lib/critterLottie';

export const ATTRACT_PERFORM_MS: Record<AttractAntic, number> = {
  peekaboo: 16000,
  nap: 20000,
  houseOfCards: 22000,
};
export const ATTRACT_LEAVE_MS = 600;

const CRITTER_SIZE = 72;

// Two-story card house built beside the pile; delays land one card at a time.
const HOUSE_CARDS: { left: number; bottom: number; rot: number; delayMs: number }[] = [
  { left: 0, bottom: 0, rot: -14, delayMs: 3000 },
  { left: 20, bottom: 0, rot: 14, delayMs: 4400 },
  { left: 40, bottom: 0, rot: -14, delayMs: 5800 },
  { left: 60, bottom: 0, rot: 14, delayMs: 7200 },
  { left: 8, bottom: 30, rot: 90, delayMs: 8800 },
  { left: 48, bottom: 30, rot: 90, delayMs: 10200 },
  { left: 20, bottom: 34, rot: -14, delayMs: 11800 },
  { left: 40, bottom: 34, rot: 14, delayMs: 13200 },
  { left: 30, bottom: 64, rot: 90, delayMs: 15000 },
];

interface AttractOverlayProps {
  attract: AttractState | null;
  onLocalDismiss: () => void;
  onExited: () => void;
}

export function AttractOverlay({ attract, onLocalDismiss, onExited }: AttractOverlayProps) {
  const critterRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const active = attract !== null;
  const nonce = attract?.nonce ?? 0;
  const antic = attract?.antic ?? null;
  const leaving = attract?.leaving ?? false;

  // Measure the pile anchor once per performance; skip the fire if no pile is on screen.
  useEffect(() => {
    if (!active) { setAnchor(null); return; }
    const el = document.querySelector('[data-attract-anchor]');
    if (!el) { onExited(); return; }
    setAnchor(el.getBoundingClientRect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, nonce]);

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

  // Lazy-load the Lottie critter; loadCritter resolves null on failure (silent no-op).
  useEffect(() => {
    if (!anchor || !antic || !critterRef.current) return;
    let cancelled = false;
    void loadCritter(critterRef.current, antic === 'nap' ? 0.4 : 1).then((anim) => {
      if (cancelled) { anim?.destroy(); return; }
      animRef.current = anim;
    });
    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, antic, nonce]);

  if (!active || !antic || !anchor) return null;

  const base = import.meta.env.BASE_URL || '/';
  const clipTop = Math.max(0, anchor.top - CRITTER_SIZE);

  return (
    <div
      aria-hidden="true"
      data-testid="attract-overlay"
      data-antic={antic}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000, overflow: 'hidden' }}
    >
      {/* Clip window above the pile: the critter translates up into it, appearing from behind the pile. */}
      <div style={{ position: 'absolute', left: anchor.left, top: clipTop, width: anchor.width, height: CRITTER_SIZE, overflow: 'hidden' }}>
        <div
          ref={critterRef}
          className={`attract-critter attract-${antic}${leaving ? ' attract-scurry' : ''}`}
          style={{ position: 'absolute', bottom: 0, left: '10%', width: CRITTER_SIZE, height: CRITTER_SIZE }}
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
          className={leaving ? 'attract-leaving' : undefined}
          style={{ position: 'absolute', left: anchor.right + 10, top: anchor.bottom - 100, width: 100, height: 100 }}
        >
          {HOUSE_CARDS.map((c, i) => (
            <img
              key={i}
              src={`${base}cards/jumbo/back.svg`}
              alt=""
              className="attract-house-card"
              style={{ left: c.left, bottom: c.bottom, ['--card-rot' as string]: `${c.rot}deg`, animationDelay: `${c.delayMs}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
