import { useEffect, useRef } from "react";
import {
  buildKeyDownHandler,
  buildKeyUpHandler,
  computeTabStops,
  computeZoneLetterMap,
  buildLetterToZoneMap,
  type CursorPos,
  type TabStop,
} from "@/lib/keyboardUtils";
import type { ClientGameState, ClientAction, SelectionSource } from "@/shared/types";

export interface UseKeyboardShortcutsParams {
  connected: boolean;
  gameState: ClientGameState;
  sendAction: (action: ClientAction) => void;
  cursorPos: CursorPos | null;
  setCursorPos: (pos: CursorPos | null) => void;
  selectedIds: Set<string>;
  setSelectedIds: (
    ids: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => void;
  selectionSource: SelectionSource;
  setSelectionSource: (src: SelectionSource) => void;
  setAltHeld: (held: boolean) => void;
  showShortcuts: boolean;
  setShowShortcuts: (v: boolean | ((prev: boolean) => boolean)) => void;
  focusMenuTrigger?: () => void;
}

export function useKeyboardShortcuts(params: UseKeyboardShortcutsParams): void {
  // Stable ref — avoids re-registering listeners every render.
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const p = paramsRef.current;
      const tabStops: TabStop[] = computeTabStops(p.gameState);
      const zoneLetterMap = computeZoneLetterMap(
        p.gameState,
        p.gameState.myPlayerId
      );
      const letterToZoneMap = buildLetterToZoneMap(zoneLetterMap);

      buildKeyDownHandler({
        ...p,
        tabStops,
        letterToZoneMap,
        myPlayerId: p.gameState.myPlayerId,
      })(e);
    }

    function onKeyUp(e: KeyboardEvent) {
      buildKeyUpHandler({ setAltHeld: paramsRef.current.setAltHeld })(e);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []); // empty deps — paramsRef always has latest values
}
