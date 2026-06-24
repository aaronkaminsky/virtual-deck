import { useEffect, useState } from 'react';
import { getOrCreatePlayerId, saveDisplayName, getDisplayName } from './hooks/usePlayerId';
import { usePartySocket } from './hooks/usePartySocket';
import LobbyPanel from './components/LobbyPanel';
import HomeView from './components/HomeView';
import { BoardDragLayer } from './components/BoardDragLayer';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { RickrollOverlay } from './components/RickrollOverlay';
import { TableFlipWrapper } from './components/TableFlipWrapper';
import { JeerOverlay } from './components/JeerOverlay';
import { createDoubleKeyDetector, createSequenceDetector, isEditableTarget } from './lib/celebrationHotkey';
import { preloadSounds } from './lib/sound';
import { consumeAutojoin } from './lib/autojoin';

function RoomView({ roomId }: { roomId: string }) {
  const [joinState, setJoinState] = useState<{ playerId: string; displayName: string } | null>(null);

  const { gameState, connected, error, sendAction, setDragging, shufflingPileIds, celebrationNonce, rickrollNonce, tableFlipNonce, jeerNonce, highlightedMove } = usePartySocket(
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

  // One-shot auto-join: if we arrived from HomeView's create/quick action, skip
  // the lobby and join straight onto the board with the saved name. A direct URL
  // visit or refresh has no intent flag and falls through to the lobby.
  useEffect(() => {
    if (!consumeAutojoin()) return;
    const savedName = getDisplayName();
    if (savedName) handleJoin(savedName);
    // run once on mount; consumeAutojoin is one-shot so re-runs are no-ops anyway
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-running on reconnect intentionally resets the double-press detector.
  useEffect(() => {
    if (!connected) return;
    const detect = createDoubleKeyDetector(500);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'g' || e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (detect(performance.now())) {
        sendAction({ type: 'CELEBRATE' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);

  // 1012: rr double-tap triggers a rickroll.
  useEffect(() => {
    if (!connected) return;
    const detect = createDoubleKeyDetector(500);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'r' || e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (detect(performance.now())) {
        sendAction({ type: 'CELEBRATE', kind: 'rickroll' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);

  // 1015: 99 double-tap triggers a table-flip.
  useEffect(() => {
    if (!connected) return;
    const detect = createDoubleKeyDetector(500);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '9' || e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (detect(performance.now())) {
        sendAction({ type: 'CELEBRATE', kind: 'tableflip' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);

  // 1016: bg triggers the bad-game jeer.
  useEffect(() => {
    if (!connected) return;
    const detect = createSequenceDetector(['b', 'g'], 500);
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      const key = e.key.toLowerCase();
      if (key !== 'b' && key !== 'g') return;
      if (detect(key, performance.now())) {
        sendAction({ type: 'CELEBRATE', kind: 'jeer' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);

  // 1014: Konami code (up up down down left right left right) triggers the all-aces cheat.
  useEffect(() => {
    if (!connected) return;
    const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
    const detect = createSequenceDetector(sequence, 2000);
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (isEditableTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      if (!sequence.includes(e.key)) return;
      if (detect(e.key, performance.now())) {
        sendAction({ type: 'CELEBRATE', kind: 'konami' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connected, sendAction]);

  if (joinState && gameState) {
    return (
      <>
        <TableFlipWrapper nonce={tableFlipNonce}>
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
        </TableFlipWrapper>
        <CelebrationOverlay nonce={celebrationNonce} />
        <RickrollOverlay nonce={rickrollNonce} />
        <JeerOverlay nonce={jeerNonce} />
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
  if (!roomId) return <HomeView />;
  return <RoomView roomId={roomId} />;
}
