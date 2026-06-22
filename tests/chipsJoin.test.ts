import { describe, it, expect } from "vitest";
import GameRoom, { viewFor } from "../party/index";
import { makeMockRoom, makeMockConnection } from "./helpers";

function makeMockCtx(url: string) {
  return { request: { url } } as any;
}

describe("chips exposed via viewFor", () => {
  it("includes pot, chipsEnabled, startingChips in the client view", () => {
    const conn = makeMockConnection("p1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.players.push({ id: "p1", connected: true, displayName: "", handRevealed: false, chipsInHand: 1000, chipsInSpread: 0 });
    room.gameState.pot = 250;
    room.gameState.chipsEnabled = true;
    room.gameState.startingChips = 1000;

    const view = viewFor(room.gameState, "p1");

    expect(view.pot).toBe(250);
    expect(view.chipsEnabled).toBe(true);
    expect(view.startingChips).toBe(1000);
  });
});

describe("onConnect chip initialization", () => {
  it("new player joining while chipsEnabled=true gets chipsInHand=startingChips", async () => {
    const conn = makeMockConnection("conn-1");
    const room = new GameRoom(makeMockRoom([conn]));
    room.gameState.chipsEnabled = true;
    room.gameState.startingChips = 500;

    await room.onConnect(conn, makeMockCtx("http://localhost?player=p1&name=Aaron"));

    const player = room.gameState.players.find(p => p.id === "p1");
    expect(player?.chipsInHand).toBe(500);
    expect(player?.chipsInSpread).toBe(0);
  });

  it("new player joining while chipsEnabled=false gets chipsInHand=0", async () => {
    const conn = makeMockConnection("conn-1");
    const room = new GameRoom(makeMockRoom([conn]));

    await room.onConnect(conn, makeMockCtx("http://localhost?player=p1&name=Aaron"));

    const player = room.gameState.players.find(p => p.id === "p1");
    expect(player?.chipsInHand).toBe(0);
    expect(player?.chipsInSpread).toBe(0);
  });
});
