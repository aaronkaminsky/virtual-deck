import { describe, it, expect, beforeEach } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function errorCodes(conn: ReturnType<typeof makeMockConnection>): string[] {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
    .filter((e): e is Extract<ServerEvent, { type: "ERROR" }> => e.type === "ERROR")
    .map(e => e.code);
}

describe("MOVE_ALL_PILE_CARDS with toZone: hand", () => {
  let room: GameRoom;
  let sender: ReturnType<typeof makeMockConnection>;

  beforeEach(() => {
    room = new GameRoom(makeMockRoom([]));
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    room.gameState.hands["player-1"] = [];
    room.gameState.piles.push({
      id: "canvas-pile-abc",
      name: "Stack",
      cards: [makeCard("A-s", false), makeCard("2-s", false)],
      faceUp: false,
      region: "canvas",
      ownerId: null,
      pos: { x: 0, y: 0, z: 1 },
    });
  });

  async function send(action: unknown) {
    await room.onMessage(JSON.stringify(action), sender);
  }

  it("moves all pile cards to the sender's hand, face-up, and prunes the pile", async () => {
    await send({ type: "MOVE_ALL_PILE_CARDS", fromId: "canvas-pile-abc", toId: "player-1", toZone: "hand" });
    expect(room.gameState.hands["player-1"].map(c => c.id)).toEqual(["A-s", "2-s"]);
    expect(room.gameState.hands["player-1"].every(c => c.faceUp)).toBe(true);
    expect(room.gameState.piles.some(p => p.id === "canvas-pile-abc")).toBe(false);
  });

  it("rejects moving into another player's hand with UNAUTHORIZED_MOVE", async () => {
    room.gameState.hands["player-2"] = [];
    await send({ type: "MOVE_ALL_PILE_CARDS", fromId: "canvas-pile-abc", toId: "player-2", toZone: "hand" });
    expect(errorCodes(sender)).toEqual(["UNAUTHORIZED_MOVE"]);
    expect(room.gameState.hands["player-2"]).toHaveLength(0);
    expect(room.gameState.piles.find(p => p.id === "canvas-pile-abc")!.cards).toHaveLength(2);
  });

  it("emits LAST_MOVE with toZoneType hand", async () => {
    const conn = makeMockConnection("player-1");
    const roomWithConn = new GameRoom(makeMockRoom([conn]));
    roomWithConn.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
    roomWithConn.gameState.hands["player-1"] = [];
    roomWithConn.gameState.piles.push({
      id: "canvas-pile-abc", name: "Stack", cards: [makeCard("A-s", false)],
      faceUp: false, region: "canvas", ownerId: null, pos: { x: 0, y: 0, z: 1 },
    });
    await roomWithConn.onMessage(JSON.stringify({ type: "MOVE_ALL_PILE_CARDS", fromId: "canvas-pile-abc", toId: "player-1", toZone: "hand" }), conn);
    const lastMoves = conn.send.mock.calls
      .map((c: unknown[]) => JSON.parse(c[0] as string))
      .filter((e: { type: string }) => e.type === "LAST_MOVE");
    expect(lastMoves).toHaveLength(1);
    expect(lastMoves[0].toZoneType).toBe("hand");
    expect(lastMoves[0].toZoneId).toBe("player-1");
  });

  it("default (no toZone) still moves pile to pile", async () => {
    await send({ type: "MOVE_ALL_PILE_CARDS", fromId: "canvas-pile-abc", toId: "discard" });
    expect(room.gameState.piles.find(p => p.id === "discard")!.cards).toHaveLength(2);
  });
});
