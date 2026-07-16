import { useEffect, useRef, useState } from 'react';

export function RickrollOverlay({ nonce }: { nonce: number }) {
  const [run, setRun] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nonce <= 0) return;
    setRun(nonce);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRun(0), 30_000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nonce]);

  if (run === 0) return null;

  return (
    <div
      key={run}
      data-testid="rickroll-overlay"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: 320,
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}
    >
      <iframe
        width="320"
        height="200"
        src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1"
        title="Rickroll"
        frameBorder="0"
        allow="autoplay"
      />
      <button
        type="button"
        aria-label="Dismiss"
        data-testid="rickroll-dismiss"
        onClick={() => setRun(0)}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
