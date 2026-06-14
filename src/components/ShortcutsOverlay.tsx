import { Dialog } from '@base-ui/react/dialog';

interface ShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: '⌘Z / Ctrl+Z', action: 'Undo last move' },
  { keys: 'Escape', action: 'Clear cursor and selection' },
  { keys: '← →', action: 'Move cursor within zone' },
  { keys: 'Tab / Shift+Tab', action: 'Move cursor to next / previous zone' },
  { keys: 'Space', action: 'Toggle card selection (or open menu)' },
  { keys: '⌘A / Ctrl+A', action: 'Select all cards in cursor zone' },
  { keys: '⌥ (hold)', action: 'Show zone shortcut letters' },
  { keys: '⌥+letter', action: 'Move selected cards to that zone' },
  { keys: 'F', action: 'Toggle zone face-up / face-down (pile / spread)' },
  { keys: 'S', action: 'Shuffle pile / cycle sort order (hand)' },
  { keys: '⌘D / Ctrl+D', action: 'Deal (or re-deal) cards' },
  { keys: '?', action: 'Show / hide this cheat sheet' },
];

export function ShortcutsOverlay({ open, onClose }: ShortcutsOverlayProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-lg bg-popover p-5 shadow-lg ring-1 ring-foreground/10 max-w-sm w-full">
          <Dialog.Title className="text-base font-semibold mb-3">Keyboard shortcuts</Dialog.Title>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {SHORTCUTS.map(({ keys, action }) => (
                <tr key={keys} className="border-b border-border last:border-0">
                  <td className="py-1.5 pr-4">
                    <kbd className="font-mono text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 whitespace-nowrap">
                      {keys}
                    </kbd>
                  </td>
                  <td className="py-1.5 text-muted-foreground">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">Press <kbd className="font-mono text-xs bg-muted rounded px-1">?</kbd> or Escape to close.</p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
