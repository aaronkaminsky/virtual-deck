import { useEffect, useRef, useState } from 'react';
import type React from 'react';

export function TableFlipWrapper({ nonce, children }: { nonce: number; children: React.ReactNode }) {
  const [run, setRun] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nonce <= 0) return;
    setRun(nonce);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRun(0), 1200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nonce]);

  return (
    <div key={run} data-testid="table-flip-wrapper" className={run !== 0 ? 'table-flip' : undefined}>
      {children}
    </div>
  );
}
