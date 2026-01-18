import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock Game so tournament tests are deterministic and don't depend on real game physics
vi.mock("../logic/game-logic/Game", () => {
  class Game {
    playerOneId: number;
    playerTwoId: number;

    playerOneScore = 0;
    playerTwoScore = 0;

    playerOnePaddle = { y: 0 };
    playerTwoPaddle = { y: 0 };

    myBall = { x: 0, y: 0 };

    finished = false;

    constructor(p1: number, p2: number) {
      this.playerOneId = p1;
      this.playerTwoId = p2;
    }

    updateGame() {
      // Minimal state movement so the state isn't always identical
      this.myBall.x += 1;
      this.myBall.y += 1;
      return this.finished;
    }

    getPlayerOneScore() {
      return this.playerOneScore;
    }

    getPlayerTwoScore() {
      return this.playerTwoScore;
    }

    setFirstPaddleUp() {
      this.playerOnePaddle.y -= 1;
    }
    setFirstPaddleDown() {
      this.playerOnePaddle.y += 1;
    }
    setFirstPaddleNeutral() {}

    setSecondPaddleUp() {
      this.playerTwoPaddle.y -= 1;
    }
    setSecondPaddleDown() {
      this.playerTwoPaddle.y += 1;
    }
    setSecondPaddleNeutral() {}
  }

  return { Game };
});

import { TournamentService } from "../core/tournament_service";

describe("TournamentService", () => {
  let service: TournamentService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new TournamentService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Tournament Creation and Joining", () => {
    it("should create a tournament with first player", () => {
      const tournament = service.createTournament(1, "alice");

      expect(tournament.status).toBe("waiting");
      expect(tournament.getPlayers()).toEqual(["1"]);
    });

    it("should reject creating a tournament if one is already active (not completed)", () => {
      service.createTournament(1, "alice");

      expect(() => service.createTournament(99, "zara")).toThrow(
        "Tournament already active",
      );
    });

    it("should allow multiple players to join while waiting", () => {
      service.createTournament(1, "alice");
      service.joinTournament(2, "bob");

      const status = service.getStatus();
      expect(status.status).toBe("waiting");
      expect(status.currentMatch).toBeNull();
    });

    it("should create first match (starting) when 4th player joins", () => {
      service.createTournament(1, "alice");
      service.joinTournament(2, "bob");
      service.joinTournament(3, "charlie");

      const consoleSpy = vi.spyOn(console, "info");

      service.joinTournament(4, "diana");

      const status = service.getStatus();
      expect(status.status).toBe("semifinal_1");
      expect(status.currentMatch).not.toBeNull();
      expect(status.currentMatch?.status).toBe("starting");
      expect(status.currentMatch?.matchType).toBe("Semifinal 1");

      // immediate log is "created", not "started"
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("created. Starting in 5 seconds"),
      );
    });

    it("should start the game loop after 5 seconds", () => {
      service.createTournament(1, "alice");
      service.joinTournament(2, "bob");
      service.joinTournament(3, "charlie");
      service.joinTournament(4, "diana");

      const consoleSpy = vi.spyOn(console, "info");

      // still starting before 5 seconds
      expect(service.getStatus().currentMatch?.status).toBe("starting");

      // after 5 seconds, match becomes running and logs "started"
      vi.advanceTimersByTime(5000);

      expect(service.getStatus().currentMatch?.status).toBe("running");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("started:"),
      );
    });

    it("should reject join when no tournament exists", () => {
      expect(() => service.joinTournament(1, "alice")).toThrow(
        "No active tournament",
      );
    });

    it("should not add a duplicate player entry on rejoin", () => {
      service.createTournament(1, "alice");
      service.joinTournament(1, "alice");

      const tournamentInfo = service.getStatus();

      // Narrow by existence of the tournament fields
      if (!("semifinal1" in tournamentInfo)) {
        throw new Error("Expected an active tournament");
      }

      expect(tournamentInfo.semifinal1.player1).toBe("1");
      expect(tournamentInfo.semifinal1.player2).toBeNull();
    });
  });

  describe("Status Reporting", () => {
    it("should report no tournament when none exists", () => {
      const status = service.getStatus();
      expect(status).toEqual({ status: "no_tournament", currentMatch: null });
    });

    it("should provide detailed tournament info", () => {
      service.createTournament(1, "alice");
      service.joinTournament(2, "bob");

      const status = service.getStatus();

      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("previousWinner");
      expect(status).toHaveProperty("semifinal1");
      expect(status).toHaveProperty("semifinal2");
      expect(status).toHaveProperty("final");
      expect(status).toHaveProperty("currentMatch");
      expect(status.currentMatch).toBeNull();
    });

    it("should include current match gamestate when match exists", () => {
      service.createTournament(1, "alice");
      service.joinTournament(2, "bob");
      service.joinTournament(3, "charlie");
      service.joinTournament(4, "diana");

      const status = service.getStatus();

      expect(status.currentMatch).toBeTruthy();
      expect(status.currentMatch?.status).toBe("starting");
      expect(status.currentMatch?.matchType).toBe("Semifinal 1");

      expect(status.currentMatch?.players.left).toEqual(
        expect.objectContaining({
          userId: 1,
          username: "alice",
          y: expect.any(Number),
        }),
      );

      expect(status.currentMatch?.players.right).toEqual(
        expect.objectContaining({
          userId: 2,
          username: "bob",
          y: expect.any(Number),
        }),
      );

      expect(status.currentMatch?.ball).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );

      expect(status.currentMatch?.score).toEqual(
        expect.objectContaining({
          left: expect.any(Number),
          right: expect.any(Number),
        }),
      );
    });
  });

  describe("Match Progression", () => {
    beforeEach(() => {
      service.createTournament(1, "alice");
      service.joinTournament(2, "bob");
      service.joinTournament(3, "charlie");
      service.joinTournament(4, "diana");
    });

    it("should be in starting state immediately after match is created", () => {
      const status = service.getStatus();
      expect(status.status).toBe("semifinal_1");
      expect(status.currentMatch?.status).toBe("starting");
    });

    it("should progress to next match after completion (semifinal_1 -> semifinal_2)", () => {
      const consoleSpy = vi.spyOn(console, "info");

      // start the interval
      vi.advanceTimersByTime(5000);

      const match = service.getCurrentMatch();
      expect(match).toBeDefined();

      const game = match!.game as any;

      // Make player1 win semifinal 1
      game.playerOneScore = 3;
      game.playerTwoScore = 1;
      game.finished = true;

      // Next tick ends match and triggers next match creation
      vi.advanceTimersByTime(16);

      const status = service.getStatus();
      expect(status.status).toBe("semifinal_2");
      expect(status.currentMatch).not.toBeNull();
      expect(status.currentMatch?.matchType).toBe("Semifinal 2");
      expect(status.currentMatch?.status).toBe("starting");

      // Next match log is "created. Starting in 5 seconds..."
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("created. Starting in 5 seconds"),
      );
    });
  });

  describe("Tournament Completion", () => {
    beforeEach(() => {
      service.createTournament(1, "alice");
      service.joinTournament(2, "bob");
      service.joinTournament(3, "charlie");
      service.joinTournament(4, "diana");
    });

    it("should complete tournament after all matches", () => {
      const consoleSpy = vi.spyOn(console, "info");

      // ---- Semifinal 1 (alice vs bob): alice wins ----
      vi.advanceTimersByTime(5000); // start SF1
      let match = service.getCurrentMatch()!;
      (match.game as any).playerOneScore = 3;
      (match.game as any).playerTwoScore = 0;
      (match.game as any).finished = true;
      vi.advanceTimersByTime(16); // finish SF1 -> creates SF2 (starting)

      // ---- Semifinal 2 (charlie vs diana): charlie wins ----
      vi.advanceTimersByTime(5000); // start SF2
      match = service.getCurrentMatch()!;
      (match.game as any).playerOneScore = 3;
      (match.game as any).playerTwoScore = 2;
      (match.game as any).finished = true;
      vi.advanceTimersByTime(16); // finish SF2 -> creates Final (starting)

      // ---- Final (alice vs charlie): alice wins ----
      vi.advanceTimersByTime(5000); // start Final
      match = service.getCurrentMatch()!;
      (match.game as any).playerOneScore = 5;
      (match.game as any).playerTwoScore = 4;
      (match.game as any).finished = true;
      vi.advanceTimersByTime(16); // finish Final -> completes tournament

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Tournament complete! Winner: alice"),
      );

      const status = service.getStatus();
      expect(status.status).toBe("completed");
      expect(status.currentMatch).toBeNull();
    });
  });

  describe("Tournament Move", () => {
    beforeEach(() => {
      service.createTournament(1, "alice");
      service.joinTournament(2, "bob");
      service.joinTournament(3, "charlie");
      service.joinTournament(4, "diana");
    });

    it("should reject move during countdown", () => {
      const res = service.applyMove(1, "UP");
      expect(res).toEqual({ error: "not_started" });
    });

    it("should allow active players to move once running", () => {
      vi.advanceTimersByTime(5000); // start match

      const before = service.getStatus().currentMatch?.players.left.y!;
      const res = service.applyMove(1, "DOWN");
      expect(res).toEqual({ status: "ok" });

      const after = service.getStatus().currentMatch?.players.left.y!;
      expect(after).toBeGreaterThan(before);
    });

    it("should reject move from non-participant", () => {
      vi.advanceTimersByTime(5000); // start match
      const res = service.applyMove(999, "UP");
      expect(res).toEqual({ error: "not_in_match" });
    });

    it("should reject invalid direction", () => {
      vi.advanceTimersByTime(5000); // start match
      const res = service.applyMove(1, "LEFT");
      expect(res).toEqual({ error: "invalid_direction" });
    });
  });
});
