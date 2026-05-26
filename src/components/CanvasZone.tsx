import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { ClientCanvasCard } from '@/shared/types';
import { CanvasDraggableCard } from './CanvasDraggableCard';
import { cn } from '@/lib/utils';
import { coversMajority } from '@/lib/canvas-utils';

interface CanvasZoneProps {
  canvasCards: ClientCanvasCard[];
  canvasRef: React.RefObject<HTMLDivElement | null>;
  selectedIds: Set<string>;
  groupIds: Set<string>;
  activeCardId: string | null;
  dragDelta: { x: number; y: number } | null;
  onToggleSelectCanvas: (id: string) => void;
  onDeselectAll: () => void;
}

export function CanvasZone({ canvasCards, canvasRef, selectedIds, groupIds, activeCardId, dragDelta: _dragDelta, onToggleSelectCanvas, onDeselectAll }: CanvasZoneProps) {
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
      onClick={onDeselectAll}
      className={cn(
        'relative flex-1 min-w-0 self-stretch overflow-hidden bg-background',
        isOver && 'ring-1 ring-primary/30'
      )}
    >
      {selectedIds.size >= 2 && (
        <span
          data-testid="canvas-selection-count"
          className="absolute top-2 left-2 z-10 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5"
        >
          {selectedIds.size} selected
        </span>
      )}
      {canvasCards.map((cc) => (
        <CanvasDraggableCard
          key={cc.card.id}
          canvasCard={cc}
          coversAnother={coveringIds.has(cc.card.id)}
          isSelected={selectedIds.has(cc.card.id)}
          isPassenger={groupIds.has(cc.card.id) && cc.card.id !== activeCardId}
          onToggleSelect={onToggleSelectCanvas}
        />
      ))}
    </div>
  );
}
