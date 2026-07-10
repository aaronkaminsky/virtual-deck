import { useEffect, useRef, useState } from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { FLAP_ROW_HEIGHT, FLAP_ROW_WIDTH, flapPlacement, flapShiftX } from '@/lib/pileDrop';

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

// Walks up from a clipping-check starting element to find the tightest bounds imposed
// by clipping ancestors (any ancestor whose computed overflow isn't 'visible' on either
// axis — e.g. CanvasZone's overflow-hidden viewport, or the board scroll area's
// overflow-x-hidden; per CSS, a non-visible overflow on one axis forces the other to
// clip too). getBoundingClientRect() ignores CSS clipping, so the placement/shift math
// needs these bounds explicitly rather than trusting the anchor's own rect against the
// raw viewport.
function computeClipBounds(start: HTMLElement): { top: number; bottom: number; left: number; right: number } {
  let top = 0;
  let left = 0;
  let bottom = window.innerHeight;
  let right = window.innerWidth;
  let ancestor: HTMLElement | null = start.parentElement;
  while (ancestor) {
    const style = window.getComputedStyle(ancestor);
    if (style.overflowY !== 'visible' || style.overflowX !== 'visible') {
      const rect = ancestor.getBoundingClientRect();
      bottom = Math.min(bottom, rect.bottom);
      top = Math.max(top, rect.top);
      right = Math.min(right, rect.right);
      left = Math.max(left, rect.left);
    }
    ancestor = ancestor.parentElement;
  }
  return { top, bottom, left, right };
}

// Drag-over placement flaps (1039): while an eligible card drag hovers the pile,
// Bottom/Random drop targets slide out against it; a plain drop on the pile
// itself inserts at top. `armed` keeps the flaps mounted while the pointer crosses
// from the pile onto a flap and disarms when the pointer leaves both. The flap
// rects deliberately overlap the pile edge by 2px so the isOver handoff has no
// dead band — a merely-flush layout left a 1px sub-pixel-rounding gap where both
// pileIsOver and flapIsOver read false for a tick, disarming the flaps mid-crossing.
// Overlap is safe: isOver derives from the single collision result, so exactly one
// of pile/flap is over at any point in the band. Flap rects are re-measured on every
// arm/disarm transition (see the measure effect below), so a disarmed flap's rect is
// cleared and can never swallow a drop the player didn't aim at. Belt-and-braces:
// both droppables are also `disabled` unless armed, so dnd-kit excludes them from
// collision detection entirely while disarmed — a phantom rect swallowing a drop is
// impossible by construction, not just by the re-measure cleanup. Placement is
// clip-aware (see computeClipBounds/flapPlacement): if neither below nor above fits
// within the nearest clipping ancestor's bounds, the flaps do not arm at all, since an
// armed-but-fully-clipped row would be an invisible yet still-active drop target.
// Horizontally the row shifts sideways (flapShiftX) instead of clipping — the row is
// wider than the pile, so piles hugging a clipping edge (the pile rail at the window's
// left) would otherwise poke past it.
export function PileDropFlaps({ pileId, pileIsOver, dragEligible }: PileDropFlapsProps) {
  const [armed, setArmed] = useState(false);
  const [placement, setPlacement] = useState<'below' | 'above'>('below');
  const [shiftX, setShiftX] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { measureDroppableContainers } = useDndContext();

  const bottomFlap = useDroppable({
    id: `pile-flap-${pileId}-bottom`,
    data: { toZone: 'pile' as const, toId: pileId, insertPosition: 'bottom' as const },
    disabled: !armed,
  });
  const randomFlap = useDroppable({
    id: `pile-flap-${pileId}-random`,
    data: { toZone: 'pile' as const, toId: pileId, insertPosition: 'random' as const },
    disabled: !armed,
  });
  const flapIsOver = bottomFlap.isOver || randomFlap.isOver;

  useEffect(() => {
    if (!dragEligible) {
      setArmed(false);
    } else if (pileIsOver) {
      const anchor = wrapperRef.current?.parentElement;
      if (anchor) {
        const anchorRect = anchor.getBoundingClientRect();
        const bounds = computeClipBounds(anchor);
        const nextPlacement = flapPlacement({
          anchorTop: anchorRect.top,
          anchorBottom: anchorRect.bottom,
          boundsTop: bounds.top,
          boundsBottom: bounds.bottom,
        });
        if (nextPlacement === 'none') {
          setArmed(false);
        } else {
          setPlacement(nextPlacement);
          setShiftX(flapShiftX({
            anchorCenterX: (anchorRect.left + anchorRect.right) / 2,
            boundsLeft: bounds.left,
            boundsRight: bounds.right,
          }));
          setArmed(true);
        }
      }
    } else if (!flapIsOver) {
      setArmed(false);
    }
  }, [dragEligible, pileIsOver, flapIsOver]);

  // Re-measure the flap rects on every arm/disarm transition. Arming: the flap
  // nodes only attach after arming — mid-drag, after dnd-kit's registration/
  // drag-start measurements have already run — so without an explicit measure
  // their rects stay null and isOver can never fire. Disarming: dnd-kit keeps a
  // droppable's last-measured rect when its node unmounts, so without a
  // re-measure (detached nodes measure to null) a phantom flap rect at the old
  // screen position could silently swallow a later drop.
  useEffect(() => {
    measureDroppableContainers([`pile-flap-${pileId}-bottom`, `pile-flap-${pileId}-random`]);
  }, [armed, measureDroppableContainers, pileId]);

  if (!dragEligible) return null;

  return (
    // pointer-events-none: dnd-kit collision is rect-based, and the flaps must never
    // intercept clicks or arm the parent pile's own drag listeners.
    <div
      ref={wrapperRef}
      className={cn(
        'absolute z-50 pointer-events-none',
        placement === 'below' ? 'top-[calc(100%-4px)]' : 'bottom-[calc(100%-4px)]'
      )}
      // Centered on the pile, then shifted sideways to stay inside clipping bounds.
      style={{ left: '50%', transform: `translateX(calc(-50% + ${shiftX}px))` }}
    >
      {/* No gap between the flaps: a gap column at the pile's center X would sit exactly
          on a straight-down drag path and momentarily disarm the row; the dashed borders
          provide the visual separation instead. */}
      {armed && (
        <div className="flex p-0.5 rounded-md bg-popover/90 backdrop-blur-sm shadow-md" style={{ height: FLAP_ROW_HEIGHT, width: FLAP_ROW_WIDTH }}>
          <Flap setNodeRef={bottomFlap.setNodeRef} isOver={bottomFlap.isOver} testId={`pile-flap-${pileId}-bottom`} label="Bottom" />
          <Flap setNodeRef={randomFlap.setNodeRef} isOver={randomFlap.isOver} testId={`pile-flap-${pileId}-random`} label="Random" />
        </div>
      )}
    </div>
  );
}
