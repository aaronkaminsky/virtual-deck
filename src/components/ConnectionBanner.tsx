import { useState, useEffect } from 'react';

interface ConnectionBannerProps {
  connected: boolean;
}

export function ConnectionBanner({ connected }: ConnectionBannerProps) {
  const [visible, setVisible] = useState(false);
  const [escalated, setEscalated] = useState(false);

  useEffect(() => {
    if (connected) {
      setVisible(false);
      setEscalated(false);
      return;
    }

    // Brief delay before showing banner to avoid flicker on momentary drops
    const showTimer = setTimeout(() => setVisible(true), 1000);
    const escalateTimer = setTimeout(() => setEscalated(true), 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(escalateTimer);
    };
  }, [connected]);

  if (!visible) return null;

  return (
    <div className="w-full bg-amber-900/80 text-amber-200 text-center py-2 text-sm font-medium">
      &#9888;{' '}
      {escalated
        ? 'Connection lost \u2014 refresh to rejoin'
        : 'Connection lost. Reconnecting\u2026'}
    </div>
  );
}
