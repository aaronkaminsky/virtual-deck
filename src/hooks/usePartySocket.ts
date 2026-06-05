import PartySocket from 'partysocket';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientAction, ClientGameState, LastMoveHighlight, ServerEvent } from '../shared/types';
import { playSound } from '../lib/sound';

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST
  ?? (import.meta.env.DEV ? 'localhost:1999' : 'virtual-deck.aaronkaminsky.partykit.dev');

export function usePartySocket(roomId: string, playerId: string, displayName: string, options?: { enabled?: boolean }) {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shufflingPileIds, setShufflingPileIds] = useState<Set<string>>(new Set());
  const [celebrationNonce, setCelebrationNonce] = useState(0);
  const wsRef = useRef<PartySocket | null>(null);
  const isDraggingRef = useRef(false);
  const bufferRef = useRef<ClientGameState | null>(null);
  const shuffleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [highlightedMove, setHighlightedMove] = useState<LastMoveHighlight | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;

  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    const ws = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      query: { player: playerId, name: displayNameRef.current },
    });
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      setConnected(true);
      setError(null);
    });

    ws.addEventListener('close', () => {
      setConnected(false);
    });

    ws.addEventListener('message', (e: MessageEvent) => {
      const event: ServerEvent = JSON.parse(e.data as string);
      if (event.type === 'STATE_UPDATE') {
        if (isDraggingRef.current) {
          bufferRef.current = event.state;
        } else {
          setGameState(event.state);
        }
      } else if (event.type === 'ERROR') {
        setError(event.message);
      } else if (event.type === 'PILE_SHUFFLED') {
        // Fires for both explicit shuffles and deal-shuffles; deal sound follows via EFFECT.
        playSound('shuffle');
        const { pileId } = event;
        const existing = shuffleTimersRef.current.get(pileId);
        if (existing !== undefined) clearTimeout(existing);
        setShufflingPileIds(prev => new Set([...prev, pileId]));
        const timer = setTimeout(() => {
          setShufflingPileIds(prev => {
            const next = new Set(prev);
            next.delete(pileId);
            return next;
          });
          shuffleTimersRef.current.delete(pileId);
        }, 650);
        shuffleTimersRef.current.set(pileId, timer);
      } else if (event.type === 'EFFECT') {
        if (event.kind === 'deal') {
          playSound('deal');
        } else if (event.kind === 'celebrate') {
          playSound('celebrate');
          setCelebrationNonce((n) => n + 1);
        }
      } else if (event.type === 'LAST_MOVE') {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setHighlightedMove({ toZoneType: event.toZoneType, toZoneId: event.toZoneId, cardIds: event.cardIds });
        highlightTimerRef.current = setTimeout(() => setHighlightedMove(null), 8000);
      } else if (event.type === 'CLEAR_LAST_MOVE') {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setHighlightedMove(null);
      }
    });

    return () => {
      ws.close();
      wsRef.current = null;
      for (const t of shuffleTimersRef.current.values()) clearTimeout(t);
      shuffleTimersRef.current.clear();
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [roomId, playerId, enabled]);

  const sendAction = useCallback((action: ClientAction) => {
    wsRef.current?.send(JSON.stringify(action));
  }, []);

  const setDragging = useCallback((dragging: boolean) => {
    isDraggingRef.current = dragging;
    if (!dragging && bufferRef.current) {
      setGameState(bufferRef.current);
      bufferRef.current = null;
    }
  }, []);

  return { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, highlightedMove };
}
