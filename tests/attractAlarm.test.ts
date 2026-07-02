import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameRoom, { pickAttractAntic, ATTRACT_IDLE_MS, ATTRACT_REPEAT_MS, ATTRACT_MIN_OVERRIDE_MS } from "../party/index";
import { ATTRACT_ANTICS } from "../src/shared/types";
import type { AttractAntic, ServerEvent } from "../src/shared/types";
import { makeMockRoom, makeMockConnection } from "./helpers";

const NOW = 1_000_000;

function attractEffectsOf(conn: ReturnType<typeof makeMockConnection>) {
  return conn.send.mock.calls
    .map((c: unknown[]) => JSON.parse(c[0] as string) as ServerEvent)
    .filter((e): e is { type: "EFFECT"; kind: "attract"; antic: AttractAntic } => e.type === "EFFECT" && e.kind === "attract");
}

function addPlayer(gr: GameRoom, id: string) {
  gr.gameState.players.push({ id, connected: true, displayName: "", handRevealed: false, chipsInHand: 0, chipsInSpread: 0 });
  gr.gameState.hands[id] = [];
}

beforeEach(() => { vi.useFakeTimers({ now: NOW }); });
afterEach(() => { vi.useRealTimers(); });

describe("pickAttractAntic", () => {
  it("picks across the full antic list when there is no previous antic", () => {
    expect(pickAttractAntic(undefined, 0)).toBe(ATTRACT_ANTICS[0]);
    expect(pickAttractAntic(undefined, 0.999)).toBe(ATTRACT_ANTICS[ATTRACT_ANTICS.length - 1]);
  });

  it("never returns the previous antic", () => {
    for (const prev of ATTRACT_ANTICS) {
      for (const r of [0, 0.5, 0.999]) {
        expect(pickAttractAntic(prev, r)).not.toBe(prev);
      }
    }
  });
});

describe("idle attract alarm", () => {
  it("re-arms the idle alarm on every message", async () => {
    const conn = makeMockConnection("p1");
    const room = makeMockRoom([conn]);
    const gr = new GameRoom(room);
    addPlayer(gr, "p1");

    await gr.onMessage(JSON.stringify({ type: "CELEBRATE" }), conn);

    expect(room.storage.setAlarm).toHaveBeenCalledWith(NOW + ATTRACT_IDLE_MS);
  });

  it("arms the idle alarm on connect", async () => {
    const conn = makeMockConnection("p1");
    const room = makeMockRoom([conn]);
    const gr = new GameRoom(room);

    await gr.onConnect(conn, { request: { url: "https://test.local/party/room?player=p1" } } as never);

    expect(room.storage.setAlarm).toHaveBeenCalledWith(NOW + ATTRACT_IDLE_MS);
  });

  it("honors and clamps the attractIdleMs connection override", async () => {
    const conn = makeMockConnection("p1");
    const room = makeMockRoom([conn]);
    const gr = new GameRoom(room);

    await gr.onConnect(conn, { request: { url: "https://test.local/party/room?player=p1&attractIdleMs=1" } } as never);

    expect(room.storage.setAlarm).toHaveBeenCalledWith(NOW + ATTRACT_MIN_OVERRIDE_MS);
    expect(room.storage.put).toHaveBeenCalledWith("attractIdleMsOverride", ATTRACT_MIN_OVERRIDE_MS);
  });

  it("onAlarm broadcasts the same attract antic to every connection and re-arms with the repeat delay", async () => {
    const conn1 = makeMockConnection("p1");
    const conn2 = makeMockConnection("p2");
    const room = makeMockRoom([conn1, conn2]);
    const gr = new GameRoom(room);

    await gr.onAlarm();

    const e1 = attractEffectsOf(conn1);
    const e2 = attractEffectsOf(conn2);
    expect(e1).toHaveLength(1);
    expect(e2).toHaveLength(1);
    expect(ATTRACT_ANTICS).toContain(e1[0].antic);
    expect(e1[0].antic).toBe(e2[0].antic);
    expect(room.storage.put).toHaveBeenCalledWith("lastAttractAntic", e1[0].antic);
    expect(room.storage.setAlarm).toHaveBeenCalledWith(NOW + ATTRACT_REPEAT_MS);
  });

  it("onAlarm in an empty room neither broadcasts nor re-arms", async () => {
    const room = makeMockRoom([]);
    const gr = new GameRoom(room);

    await gr.onAlarm();

    expect(room.storage.setAlarm).not.toHaveBeenCalled();
    expect(room.storage.put).not.toHaveBeenCalledWith("lastAttractAntic", expect.anything());
  });

  it("onAlarm never repeats the stored previous antic", async () => {
    const conn = makeMockConnection("p1");
    const room = makeMockRoom([conn]);
    (room.storage.get as ReturnType<typeof vi.fn>).mockImplementation(
      async (key: string) => (key === "lastAttractAntic" ? "nap" : undefined)
    );
    const gr = new GameRoom(room);

    for (let i = 0; i < 10; i++) {
      await gr.onAlarm();
    }

    for (const effect of attractEffectsOf(conn)) {
      expect(effect.antic).not.toBe("nap");
    }
  });
});
