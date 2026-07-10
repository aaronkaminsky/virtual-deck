import { useEffect, useRef, useState } from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { FLAP_ROW_HEIGHT, flapPlacement } from '@/lib/pileDrop';

interface PileDropFlapsProps {
  pileId: string;
  pileIsOver: boolean; // isOver of the pile's own droppable, from the parent zone
  dragEligible: boolean; // a flap-eligible card drag is in progress (isFlapEligibleDrag)
}

function Flap({
  setNodeRef,
  isOver,
  testId,
  label,
}: {
  setNodeRef: (node: HTMLElement | null) => void;
  isOver: boolean;
  testId: string;
  label: string;
}) {
  return (
    <div
      ref={setNodeRef}
      data-testid={testId}
      className={cn(
        'flex-1 flex items-center justify-center rounded text-xs font-medium border border-dashed',
        isOver
          ? 'border-primary bg-primary/20 text-primary'
          : 'border-muted-foreground/50 bg-card/90 text-muted-foreground'
      )}
    >
      {label}
    </div>
  );
}

// Drag-over placement flaps (1039): while an eligible card drag hovers the pile,
// Bottom/Random drop targets slide out against it; a plain drop on the pile
// itself inserts at top. `armed` keeps the flaps mounted while the pointer crosses
// from the pile onto a flap and disarms when the pointer leaves both. The flap
// rects deliberately overlap the pile edge by 2px so the isOver handoff has no
// dead band — a merely-flush layout left a 1px sub-pixel-rounding gap where both
// pileIsOver and flapIsOver read false for a tick, disarming the flaps mid-crossing.
// Overlap is safe: isOver derives from the single collision result, so exactly one
// of pile/flap is over at any point in the band. The refs only attach while armed,
// so an unarmed flap has no rect and can never swallow a drop the player didn't aim at.
export function PileDropFlaps({ pileId, pileIsOver, dragEligible }: PileDropFlapsProps) {
  const [armed, setArmed] = useState(false);
  const [placement, setPlacement] = useState<'below' | 'above'>('below');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { measureDroppableContainers } = useDndContext();

  const bottomFlap = useDroppable({
    id: `pile-flap-${pileId}-bottom`,
    data: { toZone: 'pile' as const, toId: pileId, insertPosition: 'bottom' as const },
  });
  const randomFlap = useDroppable({
    id: `pile-flap-${pileId}-random`,
    data: { toZone: 'pile' as const, toId: pileId, insertPosition: 'random' as const },
  });
  const flapIsOver = bottomFlap.isOver || randomFlap.isOver;

  useEffect(() => {
    if (!dragEligible) {
      setArmed(false);
    } else if (pileIsOver) {
      const anchor = wrapperRef.current?.parentElement;
      if (anchor) {
        setPlacement(flapPlacement(anchor.getBoundingClientRect().bottom, window.innerHeight));
      }
      setArmed(true);
    } else if (!flapIsOver) {
      setArmed(false);
    }
  }, [dragEligible, pileIsOver, flapIsOver]);

  // The flap nodes only attach to their droppables after arming — mid-drag, after
  // dnd-kit's registration/drag-start measurements have already run — so their rects
  // stay null (and isOver can never fire) unless we explicitly request a measure.
  useEffect(() => {
    if (armed) {
      measureDroppableContainers([`pile-flap-${pileId}-bottom`, `pile-flap-${pileId}-random`]);
    }
  }, [armed, measureDroppableContainers, pileId]);

  if (!dragEligible) return null;

  return (
    // pointer-events-none: dnd-kit collision is rect-based, and the flaps must never
    // intercept clicks or arm the parent pile's own drag listeners.
    <div
      ref={wrapperRef}
      className={cn(
        'absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none',
        placement === 'below' ? 'top-[calc(100%-4px)]' : 'bottom-[calc(100%-4px)]'
      )}
    >
      {armed && (
        <div className="flex w-28 gap-0.5 p-0.5 rounded-md bg-popover/90 backdrop-blur-sm shadow-md" style={{ height: FLAP_ROW_HEIGHT }}>
          <Flap setNodeRef={bottomFlap.setNodeRef} isOver={bottomFlap.isOver} testId={`pile-flap-${pileId}-bottom`} label="Bottom" />
          <Flap setNodeRef={randomFlap.setNodeRef} isOver={randomFlap.isOver} testId={`pile-flap-${pileId}-random`} label="Random" />
        </div>
      )}
    </div>
  );
}
