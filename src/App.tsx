import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { getOrCreatePlayerId, saveDisplayName } from './hooks/usePlayerId';
import { usePartySocket } from './hooks/usePartySocket';
import LobbyPanel from './components/LobbyPanel';
import { BoardDragLayer } from './components/BoardDragLayer';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { createDoubleKeyDetector, isEditableTarget } from './lib/celebrationHotkey';
import { preloadSounds } from './lib/sound';

function RoomView({ roomId }: { roomId: string }) {
  const [joinState, setJoinState] = useState<{ playerId: string; displayName: string } | null>(null);

  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, highlightedMove } = usePartySocket(
    roomId,
    joinState?.playerId ?? '',
    joinState?.displayName ?? '',
    { enabled: joinState !== null }
  );

  const handleJoin = (name: string) => {
    saveDisplayName(name);
    preloadSounds(); // warm audio inside the join gesture so first shuffle/deal plays instantly
    setJoinState({ playerId: getOrCreatePlayerId(), displayName: name });
  };

  // Re-running on reconnect intentionally resets the double-press detector.
  useEffect(() => {
    if (!connected) return;
    const detect = createDoubleKeyDetector(500);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'w' || e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (detect(performance.now())) {
        sendAction({ type: 'CELEBRATE' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);

  if (joinState && gameState) {
    return (
      <>
        <BoardDragLayer
          gameState={gameState}
          playerId={joinState.playerId}
          roomId={roomId}
          connected={connected}
          sendAction={sendAction}
          setDragging={setDragging}
          shufflingPileIds={shufflingPileIds}
          highlightedMove={highlightedMove}
        />
        <CelebrationOverlay nonce={celebrationNonce} />
      </>
    );
  }

  return (
    <LobbyPanel
      roomId={roomId}
      onJoin={handleJoin}
      connected={joinState !== null && connected}
      error={error}
      joining={joinState !== null}
    />
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('room');

  useEffect(() => {
    if (!roomId) {
      const id = nanoid(8);
      window.location.replace(`${window.location.pathname}?room=${id}`);
    }
  }, [roomId]);

  if (!roomId) return null;

  return <RoomView roomId={roomId} />;
}
