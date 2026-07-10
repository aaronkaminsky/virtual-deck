import { CardBack } from './CardBack';

export function PileShuffleAnimation({ animationType }: { animationType: 'normal' | 'flourish' }) {
  return (
    <>
      {(animationType === 'flourish'
        ? ['flourish-cut-right-1', 'flourish-cut-right-2', 'flourish-cut-mid', 'flourish-cut-left-4', 'flourish-cut-left-5'] as const
        : ['shuffle-cut-right-1', 'shuffle-cut-right-2', 'shuffle-cut-mid', 'shuffle-cut-left-4', 'shuffle-cut-left-5'] as const
      ).map((animName, i) => (
        <div
          key={i}
          className={`absolute inset-0 pointer-events-none flex items-center justify-center shuffle-card-${i + 1}`}
          style={{
            animationName: animName,
            animationDuration: animationType === 'flourish' ? '2200ms' : '600ms',
            animationDelay: animationType === 'flourish' ? `${i * 40}ms` : '0ms',
            animationFillMode: 'forwards',
            animationTimingFunction: animationType === 'flourish' ? 'linear' : 'ease-in-out',
          } as React.CSSProperties}
        >
          <div className="relative w-[40px] h-[60px] sm:w-[60px] sm:h-[90px]">
            <CardBack />
            {animationType === 'flourish' && (
              <div
                className="absolute inset-0 rounded-md flourish-gleam-overlay"
                style={{
                  animationName: 'flourish-gleam',
                  animationDuration: '2200ms',
                  animationDelay: `${i * 40}ms`,
                  animationFillMode: 'forwards',
                  animationTimingFunction: 'linear',
                  background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.85) 48%, transparent 66%)',
                  backgroundSize: '300% 300%',
                  mixBlendMode: 'screen',
                } as React.CSSProperties}
              />
            )}
          </div>
        </div>
      ))}
    </>
  );
}
