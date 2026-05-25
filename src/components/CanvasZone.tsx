import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { ClientCanvasCard } from '@/shared/types';
import { CanvasDraggableCard } from './CanvasDraggableCard';
import { cn } from '@/lib/utils';
import { coversMajority } from '@/lib/canvas-utils';

interface CanvasZoneProps {
  canvasCards: ClientCanvasCard[];
  draggingCardId: string | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function CanvasZone({ canvasCards, draggingCardId, canvasRef }: CanvasZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

  // Dual-ref: attach both dnd-kit's setNodeRef and the forwarded canvasRef so
  // BoardDragLayer.handleDragEnd can call getBoundingClientRect() for bounds clamping (D-15).
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  // D-04: static shadow — set of card IDs that cover >50% of a lower-z card at rest
  const coveringIds = useMemo(() => {
    const ids = new Set<string>();
    for (const card of canvasCards) {
      if (canvasCards.some(other => other.z < card.z && coversMajority(card, other))) {
        ids.add(card.card.id);
      }
    }
    return ids;
  }, [canvasCards]);

  return (
    <div
      ref={setRefs}
      aria-label="Play area"
      data-testid="canvas-zone"
      className={cn(
        'relative flex-1 min-w-0 self-stretch overflow-hidden bg-background',
        isOver && 'ring-1 ring-primary/30'
      )}
    >
      {canvasCards.map((cc) => (
        <CanvasDraggableCard
          key={cc.card.id}
          canvasCard={cc}
          isDraggingActive={draggingCardId === cc.card.id}
          coversAnother={coveringIds.has(cc.card.id)}
        />
      ))}
    </div>
  );
}
