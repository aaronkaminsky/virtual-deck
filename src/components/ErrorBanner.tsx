import { useEffect, useState } from 'react';
import type { SocketError } from '@/hooks/usePartySocket';

const DISMISS_MS = 6000;

interface ErrorBannerProps {
  error: SocketError | null;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  // Keyed on the nonce, not the message — the same error twice in a row must
  // re-show rather than stay dismissed.
  const [dismissedNonce, setDismissedNonce] = useState(0);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setDismissedNonce(error.nonce), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [error]);

  if (!error || error.nonce === dismissedNonce) return null;

  return (
    <div
      role="alert"
      data-testid="error-banner"
      onClick={() => setDismissedNonce(error.nonce)}
      className="w-full bg-red-900/80 text-red-200 text-center py-2 text-sm font-medium cursor-pointer"
    >
      &#9888; {error.message}
    </div>
  );
}
