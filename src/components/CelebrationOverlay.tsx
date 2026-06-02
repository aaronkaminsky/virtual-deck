import { useEffect, useRef, useState } from 'react';
import { generateBursts, CELEBRATION_BURST_COUNT, CELEBRATION_DURATION_MS } from '@/lib/celebrationBursts';

const SUITS = ['♠', '♥', '♦', '♣'] as const;
const RED = new Set(['♥', '♦']);

export function CelebrationOverlay({ nonce }: { nonce: number }) {
  // `run` is the active instance key (0 = idle). Bumping it restarts the animation.
  const [run, setRun] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nonce <= 0) return;
    setRun(nonce); // restart on each trigger
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRun(0), CELEBRATION_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nonce]);

  if (run === 0) return null;

  const bursts = generateBursts(CELEBRATION_BURST_COUNT);

  return (
    <div
      key={run}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}
      data-testid="celebration-overlay"
    >
      {bursts.map((b, bi) => (
        <div key={bi} style={{ position: 'absolute', left: `${b.xPct}%`, top: `${b.yPct}%`, width: 0, height: 0 }}>
          {Array.from({ length: b.particles }).map((_, pi) => {
            const sym = SUITS[pi % 4];
            const angle = (pi / b.particles) * Math.PI * 2;
            const cx = Math.cos(angle) * b.radius;
            const cy = Math.sin(angle) * b.radius;
            const rot = `${((bi * 53 + pi * 97) % 720) - 360}deg`;
            return (
              <span
                key={pi}
                className="celebration-suit"
                style={{
                  color: RED.has(sym) ? '#ff5b5b' : '#ffffff',
                  ['--cx' as string]: `${cx}px`,
                  ['--cy' as string]: `${cy}px`,
                  ['--cr' as string]: rot,
                  animationDelay: `${b.delayMs}ms`,
                }}
              >
                {sym}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
