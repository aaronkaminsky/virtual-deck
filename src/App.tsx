import { useEffect } from 'react';
import { nanoid } from 'nanoid';
import { getOrCreatePlayerId } from './hooks/usePlayerId';
import { usePartySocket } from './hooks/usePartySocket';
import LobbyPanel from './components/LobbyPanel';

function RoomView({ roomId }: { roomId: string }) {
  const playerId = getOrCreatePlayerId();
  const { gameState, connected, error } = usePartySocket(roomId, playerId);

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
