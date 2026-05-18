import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ClientGameState, ServerEvent } from "../src/shared/types";

function getStateUpdate(conn: { send: ReturnType<typeof import("vitest").vi.fn> }): ClientGameState | undefined {
  const messages = conn.send.mock.calls.map(
    (c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent
  );
  const update = messages.find(e => e.type === "STATE_UPDATE") as
    | { type: "STATE_UPDATE"; state: ClientGameState }
    | undefined;
  return update?.state;
}

describe("SET_HAND_REVEALED handler", () => {
  it("HAND-01: SET_HAND_REVEALED revealed:true sets player.handRevealed=true in GameState", async () => {
    const conn1 = makeMockConnection("player-1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [makeCard("A-s")];

    await room.onMessage(JSON.stringify({ type: "SET_HAND_REVEALED", revealed: true }), conn1);

    const player = room.gameState.players.find(p => p.id === "player-1");
    expect(player?.handRevealed).toBe(true);
  });

  it("HAND-02: SET_HAND_REVEALED revealed:false sets player.handRevealed=false in GameState", async () => {
    const conn1 = makeMockConnection("player-1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: true });
    room.gameState.hands["player-1"] = [makeCard("A-s")];

    await room.onMessage(JSON.stringify({ type: "SET_HAND_REVEALED", revealed: false }), conn1);

    const player = room.gameState.players.find(p => p.id === "player-1");
    expect(player?.handRevealed).toBe(false);
  });

  it("HAND-03: after reveal, remote connection sees full cards in opponentRevealedHands and player absent from opponentHandCounts", async () => {
    const conn1 = makeMockConnection("player-1");
    const conn2 = makeMockConnection("player-2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [makeCard("A-s"), makeCard("K-h")];
    room.gameState.hands["player-2"] = [makeCard("Q-d")];

    await room.onMessage(JSON.stringify({ type: "SET_HAND_REVEALED", revealed: true }), conn1);

    // Remote player-2 view: player-1 should be in opponentRevealedHands, not opponentHandCounts
    const remoteState = getStateUpdate(conn2);
    expect(remoteState).toBeDefined();
    expect(remoteState!.opponentRevealedHands["player-1"]).toHaveLength(2);
    expect(remoteState!.opponentRevealedHands["player-1"][0]).toMatchObject({ id: "A-s" });
    expect(remoteState!.opponentHandCounts["player-1"]).toBeUndefined();

    // Local player-1 view: myHandRevealed=true, opponentRevealedHands should not include player-1's own token
    const localState = getStateUpdate(conn1);
    expect(localState).toBeDefined();
    expect(localState!.myHandRevealed).toBe(true);
    expect(localState!.opponentRevealedHands["player-1"]).toBeUndefined();
  });

  it("HAND-04: viewFor() reflects handRevealed:true from persisted state (reconnect persistence)", async () => {
    const conn1 = makeMockConnection("player-1");
    const conn2 = makeMockConnection("player-2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    // Simulate state that was persisted with handRevealed:true (e.g. after reconnect)
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: true });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [makeCard("A-s"), makeCard("K-h")];
    room.gameState.hands["player-2"] = [makeCard("Q-d")];

    // Trigger a state broadcast by sending any no-op action
    await room.onMessage(JSON.stringify({ type: "PING" }), conn2);

    // player-1's own view should have myHandRevealed=true
    const p1State = getStateUpdate(conn1);
    expect(p1State).toBeDefined();
    expect(p1State!.myHandRevealed).toBe(true);

    // player-2's view should see player-1's cards in opponentRevealedHands
    const p2State = getStateUpdate(conn2);
    expect(p2State).toBeDefined();
    expect(p2State!.opponentRevealedHands["player-1"]).toHaveLength(2);
  });

  it("V4 access control: player cannot reveal another player's hand (server uses senderToken)", async () => {
    const conn1 = makeMockConnection("player-1");
    const conn2 = makeMockConnection("player-2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [makeCard("A-s")];
    room.gameState.hands["player-2"] = [makeCard("Q-d")];

    // player-2 sends SET_HAND_REVEALED — server ignores any playerId in body and uses senderToken
    // The message body does NOT include a playerId field; the server derives identity from the connection
    await room.onMessage(JSON.stringify({ type: "SET_HAND_REVEALED", revealed: true }), conn2);

    // Only player-2's handRevealed should be true; player-1 must be unaffected
    const p1 = room.gameState.players.find(p => p.id === "player-1");
    const p2 = room.gameState.players.find(p => p.id === "player-2");
    expect(p1?.handRevealed).toBe(false);
    expect(p2?.handRevealed).toBe(true);
  });

  it("V5 input validation: revealed:'true' (string) is treated as false (strict boolean check)", async () => {
    const conn1 = makeMockConnection("player-1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [makeCard("A-s")];

    // Send revealed as a string "true" instead of boolean true
    await room.onMessage(JSON.stringify({ type: "SET_HAND_REVEALED", revealed: "true" }), conn1);

    const player = room.gameState.players.find(p => p.id === "player-1");
    // Strict boolean check: "true" !== true, so handRevealed must remain false
    expect(player?.handRevealed).toBe(false);
  });
});
