import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import type { ServerEvent } from "../src/shared/types";
import { makeMockRoom, makeMockConnection } from "./helpers";

function messagesOf(conn: ReturnType<typeof makeMockConnection>): ServerEvent[] {
  return conn.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent);
}

describe("EFFECT broadcasts", () => {
  it("CELEBRATE broadcasts EFFECT kind:celebrate to all connections", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["p1"] = [];

    await room.onMessage(JSON.stringify({ type: "CELEBRATE" }), conn1);

    for (const conn of [conn1, conn2]) {
      const effects = messagesOf(conn).filter(
        (e): e is { type: "EFFECT"; kind: "deal" | "celebrate" } => e.type === "EFFECT",
      );
      expect(effects).toHaveLength(1);
      expect(effects[0].kind).toBe("celebrate");
    }
  });

  it("CELEBRATE takes no undo snapshot", async () => {
    const conn1 = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn1]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["p1"] = [];

    await room.onMessage(JSON.stringify({ type: "CELEBRATE" }), conn1);

    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("DEAL_CARDS broadcasts EFFECT kind:deal to all connections", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = new GameRoom(makeMockRoom([conn1, conn2]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false });
    room.gameState.players.push({ id: "p2", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["p1"] = [];
    room.gameState.hands["p2"] = [];

    await room.onMessage(JSON.stringify({ type: "DEAL_CARDS", cardsPerPlayer: 1 }), conn1);

    for (const conn of [conn1, conn2]) {
      const dealEffects = messagesOf(conn).filter(
        (e): e is { type: "EFFECT"; kind: "deal" | "celebrate" } => e.type === "EFFECT" && e.kind === "deal",
      );
      expect(dealEffects).toHaveLength(1);
    }
  });
});
