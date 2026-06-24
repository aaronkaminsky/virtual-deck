import { useEffect, useMemo, useRef, useState } from 'react';
import { generateBursts, CELEBRATION_BURST_COUNT, CELEBRATION_DURATION_MS } from '@/lib/celebrationBursts';
import { CardBack } from './CardBack';

export function JeerOverlay({ nonce }: { nonce: number }) {
  const [run, setRun] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nonce <= 0) return;
    setRun(nonce);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRun(0), CELEBRATION_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nonce]);

  // Reuse the existing burst position/timing generator — one droop per burst slot.
  const bursts = useMemo(() => generateBursts(CELEBRATION_BURST_COUNT), [run]);

  if (run === 0) return null;

  return (
    <div
      key={run}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}
      data-testid="jeer-overlay"
    >
      {bursts.map((b, bi) => (
        <div
          key={bi}
          className="jeer-droop"
          style={{
            position: 'absolute',
            left: `${b.xPct}%`,
            top: `${b.yPct}%`,
            animationDelay: `${b.delayMs}ms`,
            ['--jy' as string]: `${b.radius}px`,
            ['--jr' as string]: `${((bi * 37) % 40) - 20}deg`,
          }}
        >
          <CardBack className="w-[24px] h-[36px] opacity-70" />
        </div>
      ))}
    </div>
  );
}
