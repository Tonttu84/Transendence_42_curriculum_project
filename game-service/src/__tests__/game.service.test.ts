import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Game used by game_service for deterministic behavior in tests
vi.mock("../logic/game-logic/Game", () => {
  class Game {
    playerOneId: number;
    playerTwoId: number;

    playerOneScore = 0;
    playerTwoScore = 0;

    playerOnePaddle = { y: 100 };
    playerTwoPaddle = { y: 100 };

    myBall = { x: 50, y: 50 };

    private ticks = 0;

    constructor(p1: number, p2: number) {
      this.playerOneId = p1;
      this.playerTwoId = p2;
    }

    updateGame() {
      // Move ball slightly so state changes
      this.myBall.x += 1;
      this.myBall.y += 1;

      this.ticks += 1;

      // End match on first tick deterministically
      // Make playerOne win
      this.playerOneScore = 3;
      this.playerTwoScore = 1;

      return true;
    }

    setFirstPaddleUp() {
      this.playerOnePaddle.y -= 5;
    }
    setFirstPaddleDown() {
      this.playerOnePaddle.y += 5;
    }
    setFirstPaddleNeutral() {}

    setSecondPaddleUp() {
      this.playerTwoPaddle.y -= 5;
    }
    setSecondPaddleDown() {
      this.playerTwoPaddle.y += 5;
    }
    setSecondPaddleNeutral() {}
  }

  return { Game };
});

type GameServiceModule = typeof import("../core/game_service");

describe("game_service", () => {
  let gs: GameServiceModule;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    // Make match IDs deterministic
    let n = 0;
    const originalCrypto = globalThis.crypto;
    const randomUUID = vi.fn(() => `match-${++n}`);

    // This works reliably in Vitest by stubbing the global.
    vi.stubGlobal("crypto", { ...(originalCrypto as any), randomUUID });

    vi.resetModules();
    gs = await import("../core/game_service");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("adds players to queue and prevents duplicates in waitingPlayers", () => {
    gs.joinQueue({ userId: 1, username: "alice" });
    gs.joinQueue({ userId: 1, username: "alice" });

    expect(gs.waitingPlayers).toHaveLength(1);
    expect(gs.waitingPlayers[0]).toEqual({ userId: 1, username: "alice" });
  });

  it("creates a match when 2 players join and returns 'starting' status with matchId", () => {
    gs.joinQueue({ userId: 1, username: "alice" });
    gs.joinQueue({ userId: 2, username: "bob" });

    const s1 = gs.getGameStatus(1);
    const s2 = gs.getGameStatus(2);

    expect(s1.status).toBe("starting");
    expect(s2.status).toBe("starting");
    expect((s1 as any).matchId).toBe("match-1");
    expect((s1 as any).leftPlayer).toBe("alice");
    expect((s1 as any).rightPlayer).toBe("bob");

    // Active match IDs should contain the created match
    expect(gs.getActiveMatchIds()).toEqual({
      matchIds: [
        {
          matchId: "match-1",
          left: "alice",
          right: "bob",
          started: false,
        },
      ],
    });

    // Game state should be "starting" during countdown
    const st = gs.getGameState("match-1");
    expect((st as any).status).toBe("starting");
  });

  it("rejects moves before match starts, allows after 5 seconds", () => {
    gs.joinQueue({ userId: 1, username: "alice" });
    gs.joinQueue({ userId: 2, username: "bob" });

    // before countdown ends
    expect(gs.applyMove(1, "UP")).toEqual({ error: "not_started" });

    // after countdown ends
    vi.advanceTimersByTime(5000);

    expect(gs.getGameStatus(1).status).toBe("running");
    expect(gs.applyMove(1, "UP")).toEqual({ status: "ok" });
    expect(gs.applyMove(2, "DOWN")).toEqual({ status: "ok" });
  });

  it("rejects invalid direction and user not in match", () => {
    gs.joinQueue({ userId: 1, username: "alice" });
    gs.joinQueue({ userId: 2, username: "bob" });

    vi.advanceTimersByTime(5000);

    expect(gs.applyMove(1, "LEFT")).toEqual({ error: "invalid_direction" });
    expect(gs.applyMove(999, "UP")).toEqual({ error: "no_match" }); // no match mapping
  });

  it("finishes a match after the first game tick and exposes 'finished' state for 15s", () => {
    gs.joinQueue({ userId: 1, username: "alice" });
    gs.joinQueue({ userId: 2, username: "bob" });

    // Start match after countdown
    vi.advanceTimersByTime(5000);

    // One tick of the 16ms loop ends the match (mock updateGame() returns true)
    vi.advanceTimersByTime(16);

    const s1 = gs.getGameStatus(1);
    const s2 = gs.getGameStatus(2);

    expect(s1.status).toBe("finished");
    expect(s2.status).toBe("finished");
    expect((s1 as any).matchId).toBe("match-1");

    // Active match IDs should be empty after finish
    expect(gs.getActiveMatchIds()).toEqual({ matchIds: [] });

    // getGameState should return finished for that matchId
    const st = gs.getGameState("match-1");
    expect((st as any).status).toBe("finished");
    expect((st as any).winner).toBe("alice"); // because playerOneScore > playerTwoScore in mock
  });

  it("returns idle after the 15s finished window expires", () => {
    gs.joinQueue({ userId: 1, username: "alice" });
    gs.joinQueue({ userId: 2, username: "bob" });

    vi.advanceTimersByTime(5000);
    vi.advanceTimersByTime(16);

    // Still finished within 15 seconds
    vi.advanceTimersByTime(14999);
    expect(gs.getGameStatus(1).status).toBe("finished");

    // After window expires, should become idle
    vi.advanceTimersByTime(2);
    expect(gs.getGameStatus(1).status).toBe("idle");
  });

  it("creates two matches when 4 players join", () => {
    gs.joinQueue({ userId: 1, username: "a" });
    gs.joinQueue({ userId: 2, username: "b" });
    gs.joinQueue({ userId: 3, username: "c" });
    gs.joinQueue({ userId: 4, username: "d" });

    // Immediately after joining, both matches exist in "starting"
    expect(gs.getActiveMatchIds()).toEqual({
      matchIds: [
        {
          matchId: "match-1",
          left: "a",
          right: "b",
          started: false,
        },
        {
          matchId: "match-2",
          left: "c",
          right: "d",
          started: false,
        },
      ],
    });

    // status for each player should be starting with the right matchId
    expect((gs.getGameStatus(1) as any).matchId).toBe("match-1");
    expect((gs.getGameStatus(2) as any).matchId).toBe("match-1");
    expect((gs.getGameStatus(3) as any).matchId).toBe("match-2");
    expect((gs.getGameStatus(4) as any).matchId).toBe("match-2");
  });
});
