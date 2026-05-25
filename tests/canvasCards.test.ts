import { describe, it, expect, vi, beforeEach } from "vitest";
import GameRoom, { defaultGameState, viewFor } from "../party/index";
import type { Card, GameState, ServerEvent } from "../src/shared/types";
import type { CanvasCard } from "../src/shared/types";
import type * as Party from "partykit/server";

function makeCard(id: string): Card {
  return { id, suit: "spades", rank: "A", faceUp: false };
}

function makeMockRoom(overrides: Partial<Party.Room> = {}): Party.Room {
  const storage = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const connections: Party.Connection[] = [];
  return {
    id: "test-room",
    storage,
    getConnections: () => connections[Symbol.iterator](),
    ...overrides,
  } as unknown as Party.Room;
}

function makeMockConnection(id: string): Party.Connection & { send: ReturnType<typeof vi.fn> } {
  return {
    id,
    send: vi.fn(),
    close: vi.fn(),
    socket: {} as WebSocket,
    uri: "",
    state: { playerToken: id },
  } as unknown as Party.Connection & { send: ReturnType<typeof vi.fn> };
}

function getErrors(sender: { send: ReturnType<typeof vi.fn> }): Array<{ type: "ERROR"; code: string; message: string }> {
  const errorCalls: string[] = sender.send.mock.calls.map((c: string[]) => c[0]);
  return errorCalls
    .map(c => JSON.parse(c) as ServerEvent)
    .filter((e): e is { type: "ERROR"; code: string; message: string } => e.type === "ERROR");
}

describe("CanvasCard types compile", () => {
  it("CanvasCard literal compiles and has x, y, z, card fields", () => {
    const cc: CanvasCard = { card: makeCard("A-s"), x: 100, y: 50, z: 1 };
    expect(cc.x).toBe(100);
    expect(cc.y).toBe(50);
    expect(cc.z).toBe(1);
    expect(cc.card.id).toBe("A-s");
  });
});

describe("PLACE_ON_CANVAS handler", () => {
  let room: GameRoom;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [];
  });

  it("places hand card on canvas with z=1 when canvas empty", async () => {
    room.gameState.hands["player-1"] = [makeCard("A-s")];

    await room.onMessage(
      JSON.stringify({ type: "PLACE_ON_CANVAS", cardId: "A-s", fromZone: "hand", fromId: "player-1", x: 100, y: 50 }),
      sender,
    );

    expect(room.gameState.canvasCards).toHaveLength(1);
    expect(room.gameState.canvasCards[0].card.id).toBe("A-s");
    expect(room.gameState.canvasCards[0].x).toBe(100);
    expect(room.gameState.canvasCards[0].y).toBe(50);
    expect(room.gameState.canvasCards[0].z).toBe(1);
    expect(room.gameState.canvasCards[0].card.faceUp).toBe(true);
    expect(room.gameState.hands["player-1"]).toHaveLength(0);
  });

  it("assigns z = max + 1 when canvas has existing cards", async () => {
    room.gameState.canvasCards = [
      { card: makeCard("2-s"), x: 0, y: 0, z: 3 },
      { card: makeCard("3-s"), x: 0, y: 0, z: 7 },
    ];
    room.gameState.hands["player-1"] = [makeCard("A-s")];

    await room.onMessage(
      JSON.stringify({ type: "PLACE_ON_CANVAS", cardId: "A-s", fromZone: "hand", fromId: "player-1", x: 10, y: 20 }),
      sender,
    );

    const newEntry = room.gameState.canvasCards.find(cc => cc.card.id === "A-s");
    expect(newEntry?.z).toBe(8);
  });

  it("moves canvas card to new position (canvas → canvas)", async () => {
    room.gameState.canvasCards = [{ card: makeCard("A-s"), x: 10, y: 10, z: 1 }];

    await room.onMessage(
      JSON.stringify({ type: "PLACE_ON_CANVAS", cardId: "A-s", fromZone: "canvas", fromId: "A-s", x: 200, y: 300 }),
      sender,
    );

    expect(room.gameState.canvasCards).toHaveLength(1);
    expect(room.gameState.canvasCards[0].x).toBe(200);
    expect(room.gameState.canvasCards[0].y).toBe(300);
    expect(room.gameState.canvasCards[0].z).toBe(2);
  });

  it("places pile card on canvas", async () => {
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards = [makeCard("A-s")];

    await room.onMessage(
      JSON.stringify({ type: "PLACE_ON_CANVAS", cardId: "A-s", fromZone: "pile", fromId: "draw", x: 50, y: 60 }),
      sender,
    );

    expect(drawPile.cards).toHaveLength(0);
    expect(room.gameState.canvasCards).toHaveLength(1);
    expect(room.gameState.canvasCards[0].card.faceUp).toBe(true);
  });

  it("rejects NaN x with INVALID_COORDINATES, no mutation", async () => {
    room.gameState.hands["player-1"] = [makeCard("A-s")];

    await room.onMessage(
      JSON.stringify({ type: "PLACE_ON_CANVAS", cardId: "A-s", fromZone: "hand", fromId: "player-1", x: NaN, y: 50 }),
      sender,
    );

    const errors = getErrors(sender);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_COORDINATES");
    expect(room.gameState.canvasCards).toHaveLength(0);
    expect(room.gameState.hands["player-1"]).toHaveLength(1);
  });

  it("rejects Infinity y with INVALID_COORDINATES, no mutation", async () => {
    room.gameState.hands["player-1"] = [makeCard("A-s")];

    await room.onMessage(
      JSON.stringify({ type: "PLACE_ON_CANVAS", cardId: "A-s", fromZone: "hand", fromId: "player-1", x: 100, y: Infinity }),
      sender,
    );

    const errors = getErrors(sender);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("INVALID_COORDINATES");
    expect(room.gameState.canvasCards).toHaveLength(0);
    expect(room.gameState.hands["player-1"]).toHaveLength(1);
  });

  it("rejects hand source with mismatched senderToken (UNAUTHORIZED_MOVE)", async () => {
    room.gameState.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-2"] = [makeCard("A-s")];

    await room.onMessage(
      JSON.stringify({ type: "PLACE_ON_CANVAS", cardId: "A-s", fromZone: "hand", fromId: "player-2", x: 100, y: 50 }),
      sender,
    );

    const errors = getErrors(sender);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("UNAUTHORIZED_MOVE");
    expect(room.gameState.canvasCards).toHaveLength(0);
    expect(room.gameState.hands["player-2"]).toHaveLength(1);
  });

  it("rejects when card not in declared source (CARD_NOT_IN_SOURCE), no mutation", async () => {
    room.gameState.hands["player-1"] = [];

    await room.onMessage(
      JSON.stringify({ type: "PLACE_ON_CANVAS", cardId: "A-s", fromZone: "hand", fromId: "player-1", x: 100, y: 50 }),
      sender,
    );

    const errors = getErrors(sender);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("CARD_NOT_IN_SOURCE");
    expect(room.gameState.canvasCards).toHaveLength(0);
    expect(room.gameState.undoSnapshots).toHaveLength(0);
  });

  it("takes undo snapshot before mutation; UNDO_MOVE restores prior state", async () => {
    room.gameState.hands["player-1"] = [makeCard("A-s")];

    await room.onMessage(
      JSON.stringify({ type: "PLACE_ON_CANVAS", cardId: "A-s", fromZone: "hand", fromId: "player-1", x: 100, y: 50 }),
      sender,
    );

    expect(room.gameState.undoSnapshots).toHaveLength(1);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.hands["player-1"]).toHaveLength(1);
    expect(room.gameState.hands["player-1"][0].id).toBe("A-s");
    expect(room.gameState.canvasCards).toHaveLength(0);
  });
});

describe("MOVE_CARD with fromZone: 'canvas'", () => {
  let room: GameRoom;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [];
  });

  it("moves card from canvas to discard pile at insertPosition=top", async () => {
    room.gameState.canvasCards = [{ card: { ...makeCard("A-s"), faceUp: true }, x: 10, y: 10, z: 1 }];

    await room.onMessage(
      JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "canvas", fromId: "A-s", toZone: "pile", toId: "discard", insertPosition: "top" }),
      sender,
    );

    expect(room.gameState.canvasCards).toHaveLength(0);
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discard.cards[discard.cards.length - 1].id).toBe("A-s");
  });

  it("moves card from canvas to discard at insertPosition=bottom", async () => {
    room.gameState.canvasCards = [{ card: { ...makeCard("A-s"), faceUp: true }, x: 10, y: 10, z: 1 }];
    room.gameState.piles.find(p => p.id === "discard")!.cards = [makeCard("K-h")];

    await room.onMessage(
      JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "canvas", fromId: "A-s", toZone: "pile", toId: "discard", insertPosition: "bottom" }),
      sender,
    );

    expect(room.gameState.canvasCards).toHaveLength(0);
    const discard = room.gameState.piles.find(p => p.id === "discard")!;
    expect(discard.cards[0].id).toBe("A-s");
  });

  it("rejects MOVE_CARD canvas source when card not found", async () => {
    room.gameState.canvasCards = [];

    await room.onMessage(
      JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "canvas", fromId: "A-s", toZone: "pile", toId: "discard" }),
      sender,
    );

    const errors = getErrors(sender);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("CARD_NOT_IN_SOURCE");
    expect(room.gameState.canvasCards).toHaveLength(0);
  });

  it("takes undo snapshot for canvas → pile move; UNDO_MOVE restores canvasCards", async () => {
    room.gameState.canvasCards = [{ card: { ...makeCard("A-s"), faceUp: true }, x: 10, y: 10, z: 1 }];

    await room.onMessage(
      JSON.stringify({ type: "MOVE_CARD", cardId: "A-s", fromZone: "canvas", fromId: "A-s", toZone: "pile", toId: "discard" }),
      sender,
    );

    expect(room.gameState.canvasCards).toHaveLength(0);

    await room.onMessage(JSON.stringify({ type: "UNDO_MOVE" }), sender);

    expect(room.gameState.canvasCards).toHaveLength(1);
    expect(room.gameState.canvasCards[0].card.id).toBe("A-s");
    expect(room.gameState.canvasCards[0].x).toBe(10);
    expect(room.gameState.canvasCards[0].y).toBe(10);
    expect(room.gameState.canvasCards[0].z).toBe(1);
  });
});

describe("RESET_TABLE canvas sweep", () => {
  let room: GameRoom;
  let sender: Party.Connection & { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const mockRoom = makeMockRoom();
    room = new GameRoom(mockRoom);
    sender = makeMockConnection("player-1");
    room.gameState.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    room.gameState.hands["player-1"] = [];
  });

  it("moves all canvasCards into draw pile and empties canvasCards", async () => {
    room.gameState.canvasCards = [
      { card: { ...makeCard("A-s"), faceUp: true }, x: 0, y: 0, z: 1 },
      { card: { ...makeCard("K-h"), faceUp: true }, x: 10, y: 10, z: 2 },
      { card: { ...makeCard("Q-d"), faceUp: true }, x: 20, y: 20, z: 3 },
    ];
    const drawPile = room.gameState.piles.find(p => p.id === "draw")!;
    drawPile.cards = [];

    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    expect(room.gameState.canvasCards).toHaveLength(0);
    expect(drawPile.cards.some(c => c.id === "A-s")).toBe(true);
    expect(drawPile.cards.some(c => c.id === "K-h")).toBe(true);
    expect(drawPile.cards.some(c => c.id === "Q-d")).toBe(true);
    for (const card of drawPile.cards) {
      expect(card.faceUp).toBe(false);
    }
  });

  it("RESET_TABLE keeps canvasCards empty after sweep even if hands+piles also non-empty", async () => {
    room.gameState.hands["player-1"] = [makeCard("2-c")];
    room.gameState.piles.find(p => p.id === "discard")!.cards = [makeCard("3-d")];
    room.gameState.canvasCards = [
      { card: makeCard("A-s"), x: 0, y: 0, z: 1 },
    ];

    await room.onMessage(JSON.stringify({ type: "RESET_TABLE" }), sender);

    expect(room.gameState.canvasCards).toHaveLength(0);
  });
});

describe("viewFor canvas broadcast", () => {
  let state: GameState;

  beforeEach(() => {
    state = defaultGameState("test-room");
    state.players.push({ id: "player-1", connected: true, displayName: "", handRevealed: false });
    state.players.push({ id: "player-2", connected: true, displayName: "", handRevealed: false });
    state.hands["player-1"] = [];
    state.hands["player-2"] = [];
  });

  it("includes canvasCards array on returned ClientGameState", () => {
    const view = viewFor(state, "player-1");
    expect(view.canvasCards).toBeDefined();
    expect(Array.isArray(view.canvasCards)).toBe(true);
  });

  it("broadcasts canvasCards entries with x, y, z, card shape", () => {
    state.canvasCards = [{ card: makeCard("A-s"), x: 100, y: 50, z: 1 }];

    const view = viewFor(state, "player-1");
    expect(view.canvasCards).toHaveLength(1);
    expect(view.canvasCards[0].x).toBe(100);
    expect(view.canvasCards[0].y).toBe(50);
    expect(view.canvasCards[0].z).toBe(1);
    expect(view.canvasCards[0].card.id).toBe("A-s");
  });

  it("broadcasts canvas to ALL players without masking", () => {
    state.canvasCards = [{ card: makeCard("A-s"), x: 100, y: 50, z: 1 }];

    const view1 = viewFor(state, "player-1");
    const view2 = viewFor(state, "player-2");
    expect(view1.canvasCards).toHaveLength(1);
    expect(view2.canvasCards).toHaveLength(1);
    expect(view1.canvasCards[0].card.id).toBe(view2.canvasCards[0].card.id);
  });
});

describe("onStart migration", () => {
  it("adds canvasCards: [] when missing from persisted state", async () => {
    const persistedStateWithoutCanvas = {
      ...defaultGameState("test-room"),
    } as Record<string, unknown>;
    delete persistedStateWithoutCanvas.canvasCards;

    const mockRoom = makeMockRoom({
      storage: {
        get: vi.fn().mockResolvedValue(persistedStateWithoutCanvas),
        put: vi.fn().mockResolvedValue(undefined),
      } as unknown as Party.Storage,
    });
    const room = new GameRoom(mockRoom);
    await room.onStart();

    expect(room.gameState.canvasCards).toBeDefined();
    expect(Array.isArray(room.gameState.canvasCards)).toBe(true);
    expect(room.gameState.canvasCards).toHaveLength(0);
  });

  it("leaves canvasCards untouched when already present", async () => {
    const persistedStateWithCanvas = {
      ...defaultGameState("test-room"),
      canvasCards: [{ card: makeCard("A-s"), x: 1, y: 1, z: 1 }],
    };

    const mockRoom = makeMockRoom({
      storage: {
        get: vi.fn().mockResolvedValue(persistedStateWithCanvas),
        put: vi.fn().mockResolvedValue(undefined),
      } as unknown as Party.Storage,
    });
    const room = new GameRoom(mockRoom);
    await room.onStart();

    expect(room.gameState.canvasCards).toHaveLength(1);
    expect(room.gameState.canvasCards[0].card.id).toBe("A-s");
  });
});

describe("defaultGameState", () => {
  it("returns canvasCards as empty array", () => {
    const state = defaultGameState("room");
    expect(state.canvasCards).toBeDefined();
    expect(Array.isArray(state.canvasCards)).toBe(true);
    expect(state.canvasCards).toHaveLength(0);
  });
});
