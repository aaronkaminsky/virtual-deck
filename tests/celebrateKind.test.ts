import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import type { ServerEvent } from "../src/shared/types";
import { makeMockRoom, makeMockConnection } from "./helpers";

describe("CELEBRATE handler kind passthrough", () => {
  it("defaults to kind 'celebrate' when no kind is given", async () => {
    const sender = makeMockConnection("player-1");
    const room = new GameRoom(makeMockRoom([sender]));

    await room.onMessage(JSON.stringify({ type: "CELEBRATE" }), sender);

    const effects = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter((e): e is ServerEvent & { type: "EFFECT" } => e.type === "EFFECT");
    expect(effects).toHaveLength(1);
    expect(effects[0].kind).toBe("celebrate");
  });

  it("passes through a given kind (e.g. 'konami')", async () => {
    const sender = makeMockConnection("player-1");
    const room = new GameRoom(makeMockRoom([sender]));

    await room.onMessage(JSON.stringify({ type: "CELEBRATE", kind: "konami" }), sender);

    const effects = sender.send.mock.calls
      .map((c: string[]) => JSON.parse(c[0]) as ServerEvent)
      .filter((e): e is ServerEvent & { type: "EFFECT" } => e.type === "EFFECT");
    expect(effects).toHaveLength(1);
    expect(effects[0].kind).toBe("konami");
  });
});
