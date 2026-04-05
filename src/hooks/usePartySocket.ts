import PartySocket from 'partysocket';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientAction, ClientGameState, ServerEvent } from '../shared/types';

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST
  ?? (import.meta.env.DEV ? 'localhost:1999' : 'localhost:1999');

export function usePartySocket(roomId: string, playerId: string) {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<PartySocket | null>(null);
  const isDraggingRef = useRef(false);
  const bufferRef = useRef<ClientGameState | null>(null);

  useEffect(() => {
    const ws = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      query: { player: playerId },
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
      }
    });

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [roomId, playerId]);

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

  return { gameState, connected, error, sendAction, setDragging };
}
