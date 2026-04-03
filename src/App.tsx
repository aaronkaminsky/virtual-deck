import { useEffect } from 'react';
import { nanoid } from 'nanoid';

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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-foreground">Room: {roomId}</p>
    </div>
  );
}
