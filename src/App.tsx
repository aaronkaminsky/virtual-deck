import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { getOrCreatePlayerId, saveDisplayName } from './hooks/usePlayerId';
import { usePartySocket } from './hooks/usePartySocket';
import LobbyPanel from './components/LobbyPanel';
import { BoardDragLayer } from './components/BoardDragLayer';

function RoomView({ roomId }: { roomId: string }) {
  const [joinState, setJoinState] = useState<{ playerId: string; displayName: string } | null>(null);

  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds } = usePartySocket(
    roomId,
    joinState?.playerId ?? '',
    joinState?.displayName ?? '',
    { enabled: joinState !== null }
  );

  const handleJoin = (name: string) => {
    saveDisplayName(name);
    setJoinState({ playerId: getOrCreatePlayerId(), displayName: name });
  };

  if (joinState && gameState) {
    return (
      <BoardDragLayer
        gameState={gameState}
        playerId={joinState.playerId}
        roomId={roomId}
        connected={connected}
        sendAction={sendAction}
        setDragging={setDragging}
        shufflingPileIds={shufflingPileIds}
      />
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
