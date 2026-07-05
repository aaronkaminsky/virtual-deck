import PartySocket from 'partysocket';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AttractAntic, ClientAction, ClientGameState, LastMoveHighlight, ServerEvent } from '../shared/types';
import { playSound } from '../lib/sound';
import { PARTYKIT_HOST } from '../lib/partyHost';

export type AttractState = { antic: AttractAntic; nonce: number; leaving: boolean };

export function usePartySocket(roomId: string, playerId: string, displayName: string, options?: { enabled?: boolean }) {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shufflingPileIds, setShufflingPileIds] = useState<Map<string, "normal" | "flourish">>(new Map());
  const [celebrationNonce, setCelebrationNonce] = useState(0);
  const [rickrollNonce, setRickrollNonce] = useState(0);
  const [tableFlipNonce, setTableFlipNonce] = useState(0);
  const [jeerNonce, setJeerNonce] = useState(0);
  const [konamiActive, setKonamiActive] = useState(false);
  const konamiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [attract, setAttract] = useState<AttractState | null>(null);
  const attractNonceRef = useRef(0);
  const attractRef = useRef<AttractState | null>(null);
  attractRef.current = attract;
  // Armed on load and by any action (STATE_UPDATE); disarmed after one play, so
  // looped attract re-fires stay silent until someone acts again.
  const attractSoundArmedRef = useRef(true);
  const wsRef = useRef<PartySocket | null>(null);
  const isDraggingRef = useRef(false);
  const bufferRef = useRef<ClientGameState | null>(null);
  const shuffleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [highlightedMove, setHighlightedMove] = useState<LastMoveHighlight | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightNonceRef = useRef(0);
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;

  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    const attractIdleMs = new URLSearchParams(window.location.search).get('attractIdleMs');

    const ws = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      query: { player: playerId, name: displayNameRef.current, ...(attractIdleMs ? { attractIdleMs } : {}) },
    });
    wsRef.current = ws;

    const connectTimeoutId = setTimeout(() => {
      if (!ws.OPEN) {
        setError(
          import.meta.env.DEV
            ? "Can't reach the game server — restart `npm run dev`"
            : "Can't reach the game server — try refreshing the page"
        );
      }
    }, 8000);

    ws.addEventListener('open', () => {
      clearTimeout(connectTimeoutId);
      setConnected(true);
      setError(null);
    });

    ws.addEventListener('close', () => {
      setConnected(false);
    });

    ws.addEventListener('message', (e: MessageEvent) => {
      const event: ServerEvent = JSON.parse(e.data as string);
      if (event.type === 'STATE_UPDATE') {
        // Any state change means someone acted — the critter flees on every screen
        // and the attract sound re-arms for the next first fire.
        attractSoundArmedRef.current = true;
        setAttract(prev => (prev && !prev.leaving ? { ...prev, leaving: true } : prev));
        if (isDraggingRef.current) {
          bufferRef.current = event.state;
        } else {
          setGameState(event.state);
        }
      } else if (event.type === 'ERROR') {
        setError(event.message);
      } else if (event.type === 'PILE_SHUFFLED') {
        // Fires for both explicit shuffles and deal-shuffles; deal sound follows via EFFECT.
        const { pileId, animationType } = event;
        playSound(animationType === 'flourish' ? 'shuffle-flourish' : 'shuffle');
        const existing = shuffleTimersRef.current.get(pileId);
        if (existing !== undefined) clearTimeout(existing);
        setShufflingPileIds(prev => new Map(prev).set(pileId, animationType));
        // Flourish: 2200ms animation + up to 160ms stagger (4 cards * 40ms delay) + 50ms margin.
        const clearDelay = animationType === 'flourish' ? 2410 : 650;
        const timer = setTimeout(() => {
          setShufflingPileIds(prev => {
            const next = new Map(prev);
            next.delete(pileId);
            return next;
          });
          shuffleTimersRef.current.delete(pileId);
        }, clearDelay);
        shuffleTimersRef.current.set(pileId, timer);
      } else if (event.type === 'EFFECT') {
        if (event.kind === 'deal') {
          playSound('deal');
        } else if (event.kind === 'celebrate') {
          playSound('celebrate');
          setCelebrationNonce((n) => n + 1);
        } else if (event.kind === 'chip-bet') {
          playSound('chip-bet');
        } else if (event.kind === 'chip-collect') {
          playSound('chip-collect');
        } else if (event.kind === 'rickroll') {
          setRickrollNonce((n) => n + 1);
        } else if (event.kind === 'tableflip') {
          setTableFlipNonce((n) => n + 1);
        } else if (event.kind === 'jeer') {
          playSound('jeer');
          setJeerNonce((n) => n + 1);
        } else if (event.kind === 'konami') {
          if (konamiTimerRef.current) clearTimeout(konamiTimerRef.current);
          setKonamiActive(true);
          konamiTimerRef.current = setTimeout(() => setKonamiActive(false), 3000);
        } else if (event.kind === 'attract') {
          const reducedMotion = typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          // A re-fire mid-performance would restart the critter from its hidden
          // position while the new antic's props render immediately — let the
          // running performance finish instead.
          const performing = attractRef.current !== null && !attractRef.current.leaving;
          if (event.antic && !reducedMotion && !performing) {
            if (attractSoundArmedRef.current) {
              attractSoundArmedRef.current = false;
              playSound('attract');
            }
            setAttract({ antic: event.antic, nonce: ++attractNonceRef.current, leaving: false });
          }
        }
      } else if (event.type === 'LAST_MOVE') {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setHighlightedMove({ toZoneType: event.toZoneType, toZoneId: event.toZoneId, cardIds: event.cardIds, nonce: ++highlightNonceRef.current });
        highlightTimerRef.current = setTimeout(() => setHighlightedMove(null), 8000);
      } else if (event.type === 'CLEAR_LAST_MOVE') {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setHighlightedMove(null);
      }
    });

    return () => {
      clearTimeout(connectTimeoutId);
      ws.close();
      wsRef.current = null;
      for (const t of shuffleTimersRef.current.values()) clearTimeout(t);
      shuffleTimersRef.current.clear();
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (konamiTimerRef.current) clearTimeout(konamiTimerRef.current);
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

  const dismissAttract = useCallback(() => {
    setAttract(prev => (prev && !prev.leaving ? { ...prev, leaving: true } : prev));
  }, []);

  const clearAttract = useCallback(() => setAttract(null), []);

  return { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, rickrollNonce, tableFlipNonce, jeerNonce, konamiActive, highlightedMove, attract, dismissAttract, clearAttract };
}
