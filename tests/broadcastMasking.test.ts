import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ClientGameState, ServerEvent } from "../src/shared/types";

describe("broadcastState masking via viewFor", () => {
  it("local player connection receives STATE_UPDATE with myPlayerId equal to their own token", async () => {
    const localConn = makeMockConnection("player-1");
    const remoteConn = makeMockConnection("player-2");
    const connections = [localConn, remoteConn];
    const mockRoom = makeMockRoom(connections);
    const room = new GameRoom(mockRoom);

    room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "" });
    room.gameState.hands["player-1"] = [makeCard("A-s"), makeCard("K-s")];
    room.gameState.hands["player-2"] = [];

    await room.onMessage(
      JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "hand", fromId: "player-1", toZone: "pile", toId: "discard" }),
      localConn
    );

    const localMessages = localConn.send.mock.calls.map(
      (c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent
    );
    const localUpdate = localMessages.find(e => e.type === "STATE_UPDATE") as
      | { type: "STATE_UPDATE"; state: ClientGameState }
      | undefined;
    expect(localUpdate).toBeDefined();
    expect(localUpdate!.state.myPlayerId).toBe("player-1");
  });

  it("remote player connection receives STATE_UPDATE with masked opponent hand (opponentHandCounts, not cards)", async () => {
    const localConn = makeMockConnection("player-1");
    const remoteConn = makeMockConnection("player-2");
    const connections = [localConn, remoteConn];
    const mockRoom = makeMockRoom(connections);
    const room = new GameRoom(mockRoom);

    room.gameState.players.push({ id: "player-1", connected: true, displayName: "" });
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "" });
    room.gameState.hands["player-1"] = [makeCard("A-s"), makeCard("K-s")];
    room.gameState.hands["player-2"] = [];

    await room.onMessage(
      JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "hand", fromId: "player-1", toZone: "pile", toId: "discard" }),
      localConn
    );

    const remoteMessages = remoteConn.send.mock.calls.map(
      (c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent
    );
    const remoteUpdate = remoteMessages.find(e => e.type === "STATE_UPDATE") as
      | { type: "STATE_UPDATE"; state: ClientGameState }
      | undefined;
    expect(remoteUpdate).toBeDefined();
    expect(remoteUpdate!.state.myPlayerId).toBe("player-2");
    expect(remoteUpdate!.state.myHand).toHaveLength(0);
    expect(remoteUpdate!.state.opponentHandCounts["player-1"]).toBeDefined();
  });
});
