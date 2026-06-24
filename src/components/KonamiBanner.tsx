export function KonamiBanner({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      data-testid="konami-banner"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'rgba(120, 0, 0, 0.9)',
        color: '#fff',
        fontWeight: 700,
        letterSpacing: '0.05em',
        padding: '8px 20px',
        borderRadius: 8,
        pointerEvents: 'none',
      }}
    >
      CHEATER DETECTED
    </div>
  );
}
