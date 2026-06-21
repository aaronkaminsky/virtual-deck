import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function messagesOf(conn: ReturnType<typeof makeMockConnection>): ServerEvent[] {
  return conn.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
}

function isEffectMessage(e: ServerEvent): e is { type: "EFFECT"; kind: "deal" | "celebrate" | "chip-bet" | "chip-collect" } {
  return e.type === "EFFECT";
}

function makeRoomWithPlayer(chipsInHand: number, chipsInSpread: number) {
  const conn = makeMockConnection("p1");
  const room = new GameRoom(makeMockRoom([conn]));
  room.gameState.chipsEnabled = true;
  room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand, chipsInSpread });
  return { conn, room };
}

describe("TRANSFER_CHIPS happy paths", () => {
  it("hand -> spread moves the amount and broadcasts EFFECT kind:chip-bet", async () => {
    const { conn, room } = makeRoomWithPlayer(1000, 0);

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 200 }), conn);

    const player = room.gameState.players[0];
    expect(player.chipsInHand).toBe(800);
    expect(player.chipsInSpread).toBe(200);
    const effects = messagesOf(conn).filter(isEffectMessage);
    expect(effects).toHaveLength(1);
    expect(effects[0].kind).toBe("chip-bet");
  });

  it("spread -> pot moves the amount and broadcasts EFFECT kind:chip-collect", async () => {
    const { conn, room } = makeRoomWithPlayer(800, 200);

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "spread", to: "pot", playerId: "p1", amount: 200 }), conn);

    expect(room.gameState.players[0].chipsInSpread).toBe(0);
    expect(room.gameState.pot).toBe(200);
    const effects = messagesOf(conn).filter(isEffectMessage);
    expect(effects[0].kind).toBe("chip-collect");
  });

  it("pot -> hand moves the amount and broadcasts EFFECT kind:chip-collect", async () => {
    const { conn, room } = makeRoomWithPlayer(800, 0);
    room.gameState.pot = 200;

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "pot", to: "hand", playerId: "p1", amount: 200 }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(1000);
    expect(room.gameState.pot).toBe(0);
    const effects = messagesOf(conn).filter(isEffectMessage);
    expect(effects[0].kind).toBe("chip-collect");
  });

  it("takes an undo snapshot before mutating, and UNDO_MOVE reverses the transfer", async () => {
    const { conn, room } = makeRoomWithPlayer(1000, 0);

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 200 }), conn);
    expect(room.gameState.undoSnapshots).toHaveLength(1);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(1000);
    expect(room.gameState.players[0].chipsInSpread).toBe(0);
  });
});
