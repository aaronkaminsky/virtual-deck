import { SquareCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CanvasControlsProps {
  onSelectAll: () => void;
  onDiscardAll: () => void;
}

export function CanvasControls({ onSelectAll, onDiscardAll }: CanvasControlsProps) {
  return (
    <div
      data-testid="canvas-controls"
      className="absolute top-2 left-2 z-20 flex gap-1 rounded-md bg-card/80 p-1 backdrop-blur-sm elev-2"
      // Both stopPropagations keep the controls panel from reaching the viewport pan/deselect handler:
      // onClick prevents deselect on button clicks; onPointerDown prevents the viewport from arming
      // the drag-pan gesture when the panel's padding gap (not a button) is pressed.
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={onSelectAll}
        title="Select all cards on the canvas"
        aria-label="Select all canvas cards"
        data-testid="canvas-select-all"
      >
        <SquareCheck className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={onDiscardAll}
        title="Discard all cards on the canvas"
        aria-label="Discard all canvas cards"
        data-testid="canvas-discard-all"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
