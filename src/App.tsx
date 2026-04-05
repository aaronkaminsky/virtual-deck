import { useEffect } from 'react';
import { nanoid } from 'nanoid';
import { getOrCreatePlayerId } from './hooks/usePlayerId';
import { usePartySocket } from './hooks/usePartySocket';
import LobbyPanel from './components/LobbyPanel';
import { BoardDragLayer } from './components/BoardDragLayer';

function RoomView({ roomId }: { roomId: string }) {
  const playerId = getOrCreatePlayerId();
  const { gameState, connected, error, sendAction, setDragging } = usePartySocket(roomId, playerId);

  if (gameState) {
    return (
      <BoardDragLayer
        gameState={gameState}
        playerId={playerId}
        connected={connected}
        sendAction={sendAction}
        setDragging={setDragging}
      />
    );
  }

  return (
    <LobbyPanel
      roomId={roomId}
      playerId={playerId}
      gameState={gameState}
      connected={connected}
      error={error}
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
