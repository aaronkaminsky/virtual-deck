import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";
import type { ServerEvent } from "../src/shared/types";

function messagesOf(conn: ReturnType<typeof makeMockConnection>): ServerEvent[] {
  return conn.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
}

describe("TRANSFER_CHIPS validation", () => {
  it("rejects when chipsEnabled is false (no mutation, no error sent)", async () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 100 }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(1000);
    expect(room.gameState.players[0].chipsInSpread).toBe(0);
  });

  it("rejects from === to", async () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.chipsEnabled = true;
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "hand", playerId: "p1", amount: 100 }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(1000);
  });

  it("rejects non-integer and non-positive amounts", async () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.chipsEnabled = true;
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 0 }), conn);
    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: -50 }), conn);
    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 12.5 }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(1000);
    expect(room.gameState.players[0].chipsInSpread).toBe(0);
  });

  it("rejects insufficient funds at the source with an INSUFFICIENT_CHIPS error", async () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.chipsEnabled = true;
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 50, chipsInSpread: 0 });

    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 100 }), conn);

    expect(room.gameState.players[0].chipsInHand).toBe(50);
    const errors = messagesOf(conn).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { code: string }).code).toBe("INSUFFICIENT_CHIPS");
  });

  it("rejects a player moving another player's hand/spread chips with UNAUTHORIZED_CHIP_TRANSFER", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.chipsEnabled = true;
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });
    room.gameState.players.push({ id: "p2", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });

    // p2 tries to move p1's hand chips
    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "hand", to: "spread", playerId: "p1", amount: 100 }), conn2);

    const p1 = room.gameState.players.find(p => p.id === "p1")!;
    expect(p1.chipsInHand).toBe(1000);
    const errors = messagesOf(conn2).filter(e => e.type === "ERROR");
    expect(errors).toHaveLength(1);
    expect((errors[0] as { code: string }).code).toBe("UNAUTHORIZED_CHIP_TRANSFER");
  });

  it("allows any player to move chips into or out of the ownerless pot for themselves", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.chipsEnabled = true;
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });
    room.gameState.players.push({ id: "p2", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });
    room.gameState.pot = 500;

    // p2 (sender) takes chips into THEIR OWN hand from the shared pot — allowed.
    await room.onMessage(JSON.stringify({ type: "TRANSFER_CHIPS", from: "pot", to: "hand", playerId: "p2", amount: 200 }), conn2);

    expect(room.gameState.pot).toBe(300);
    expect(room.gameState.players.find(p => p.id === "p2")!.chipsInHand).toBe(1200);
  });
});
