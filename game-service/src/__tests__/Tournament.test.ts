// Tournament.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { Tournament } from "../logic/tournament-logic/tournament";

describe("Tournament", () => {
  let tournament: Tournament;

  describe("Creation and Setup", () => {
    beforeEach(() => {
      tournament = new Tournament("arne");
    });

    it("should create tournament with first player", () => {
      expect(tournament.getPreviousWinner()).toBe("Chuck Norris");
      expect(tournament.getPlayers()).toEqual(["arne"]);
      expect(tournament.status).toBe("waiting");
      expect(tournament.isFull()).toBe(false);
    });

    it("should allow players to join sequentially", () => {
      tournament.join("daniel");
      expect(tournament.getPlayers()).toEqual(["arne", "daniel"]);
      expect(tournament.status).toBe("waiting");

      tournament.join("paula");
      expect(tournament.getPlayers()).toEqual(["arne", "daniel", "paula"]);
      expect(tournament.status).toBe("waiting");

      tournament.join("johannes");
      expect(tournament.getPlayers()).toEqual([
        "arne",
        "daniel",
        "paula",
        "johannes",
      ]);
      expect(tournament.status).toBe("semifinal_1");
      expect(tournament.isFull()).toBe(true);
    });

    it("should provide full tournament info when waiting", () => {
      const info = tournament.getTournamentInfo();

      expect(info.status).toBe("waiting");
      expect(info.previousWinner).toBe("Chuck Norris");
      expect(info.semifinal1.player1).toBe("arne");
      expect(info.semifinal1.player2).toBeNull();
      expect(info.semifinal1.winner).toBeNull();
    });
  });

  describe("Match Progression", () => {
    beforeEach(() => {
      tournament = new Tournament("arne");
      tournament.join("daniel");
      tournament.join("paula");
      tournament.join("johannes");
    });

    it("should return correct match info for semifinal 1", () => {
      const match = tournament.getCurrentMatch();

      expect(match).toEqual({
        player1: "arne",
        player2: "daniel",
        matchType: "Semifinal 1",
      });
    });

    it("should progress to semifinal 2 after first match", () => {
      tournament.recordWinner("arne");

      expect(tournament.status).toBe("semifinal_2");
      const match = tournament.getCurrentMatch();

      expect(match).toEqual({
        player1: "paula",
        player2: "johannes",
        matchType: "Semifinal 2",
      });
    });

    it("should progress to final after second semifinal", () => {
      tournament.recordWinner("arne");
      tournament.recordWinner("johannes");

      expect(tournament.status).toBe("final");
      const match = tournament.getCurrentMatch();

      expect(match).toEqual({
        player1: "arne",
        player2: "johannes",
        matchType: "Final",
      });
    });

    it("should complete tournament after final", () => {
      tournament.recordWinner("arne");
      tournament.recordWinner("johannes");
      tournament.recordWinner("johannes");

      expect(tournament.status).toBe("completed");
      expect(tournament.isComplete()).toBe(true);
      expect(tournament.getWinner()).toBe("johannes");
      expect(tournament.getCurrentMatch()).toBeNull();
    });

    it("should provide complete tournament info after completion", () => {
      tournament.recordWinner("arne");
      tournament.recordWinner("johannes");
      tournament.recordWinner("johannes");

      const info = tournament.getTournamentInfo();

      expect(info.status).toBe("completed");
      expect(info.semifinal1.winner).toBe("arne");
      expect(info.semifinal2.winner).toBe("johannes");
      expect(info.final.player1).toBe("arne");
      expect(info.final.player2).toBe("johannes");
      expect(info.final.winner).toBe("johannes");
    });
  });

  describe("Tournament Reset", () => {
    beforeEach(() => {
      tournament = new Tournament("arne");
      tournament.join("daniel");
      tournament.join("paula");
      tournament.join("johannes");
      tournament.recordWinner("arne");
      tournament.recordWinner("johannes");
      tournament.recordWinner("johannes");
    });

    it("should reset tournament and track previous winner", () => {
      tournament.reset("jack");

      expect(tournament.getPreviousWinner()).toBe("johannes");
      expect(tournament.getPlayers()).toEqual(["jack"]);
      expect(tournament.status).toBe("waiting");
      expect(tournament.isFull()).toBe(false);
    });

    it("should provide clean tournament info after reset", () => {
      tournament.reset("jack");
      const info = tournament.getTournamentInfo();

      expect(info.status).toBe("waiting");
      expect(info.previousWinner).toBe("johannes");
      expect(info.semifinal1.player1).toBe("jack");
      expect(info.semifinal1.player2).toBeNull();
      expect(info.semifinal1.winner).toBeNull();
      expect(info.semifinal2.player1).toBeNull();
      expect(info.final.winner).toBeNull();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      tournament = new Tournament("jack");
    });

    it("should reject duplicate player", () => {
      expect(() => tournament.join("jack")).toThrow(
        "Player already in tournamnet",
      );
    });

    it("should reject 5th player", () => {
      tournament.join("maria");
      tournament.join("sofia");
      tournament.join("lucas");

      expect(() => tournament.join("emma")).toThrow(
        "Tournament is not in waiting state",
      );
    });

    it("should reject join after tournament started", () => {
      tournament.join("maria");
      tournament.join("sofia");
      tournament.join("lucas");

      expect(tournament.status).toBe("semifinal_1");
      expect(() => tournament.join("peter")).toThrow(
        "Tournament is not in waiting state",
      );
    });

    it("should return null for current match when waiting", () => {
      expect(tournament.getCurrentMatch()).toBeNull();
    });

    it("should return null for current match when completed", () => {
      tournament.join("maria");
      tournament.join("sofia");
      tournament.join("lucas");
      tournament.recordWinner("jack");
      tournament.recordWinner("lucas");
      tournament.recordWinner("lucas");

      expect(tournament.getCurrentMatch()).toBeNull();
    });

    it("should return null for winner when not completed", () => {
      tournament.join("maria");
      tournament.join("sofia");

      expect(tournament.getWinner()).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle recording winner with player not validated (current behavior)", () => {
      tournament = new Tournament("arne");
      tournament.join("daniel");
      tournament.join("paula");
      tournament.join("johannes");

      // Current implementation doesn't validate if winner was actually in the match
      // This test documents current behavior - you might want to add validation later
      expect(() => tournament.recordWinner("fake_player")).not.toThrow();
      expect(tournament.status).toBe("semifinal_2");
    });
  });
});
