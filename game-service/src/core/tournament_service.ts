import { Tournament } from "../logic/tournament-logic/tournament";
import { Game } from "../logic/game-logic/Game";
import { log } from "../utils/logger";

interface TournamentMatch {
  //matchId: string;
  matchType: string;
  p1Id: number;
  p2Id: number;
  p1Username: string;
  p2Username: string;
  game: Game;
  interval: NodeJS.Timeout | null;
  started: boolean;
}

export class TournamentService {
  private activeTournament: Tournament | null = null;
  private currentMatch: TournamentMatch | null = null;
  private playerRegistry: Map<string, { id: number; username: string }> =
    new Map();
  private previousWinnerName: string | null = null;

  createTournament(userId: number, username: string): Tournament {
    if (this.activeTournament && !this.activeTournament.isComplete()) {
      throw new Error("Tournament already active");
    }

    const playerId = userId.toString();

    this.playerRegistry = new Map();
    this.playerRegistry.set(playerId, { id: userId, username });

    this.activeTournament = new Tournament(playerId, this.previousWinnerName);
    this.currentMatch = null;

    return this.activeTournament;
  }

  joinTournament(userId: number, username: string) {
    if (!this.activeTournament) {
      throw new Error("No active tournament");
    }

    const playerId = userId.toString();

    // If playerId has already joined, return early with tournament info
    if (this.activeTournament.getPlayers().includes(playerId)) {
      return this.activeTournament.getTournamentInfo();
    }

    this.activeTournament.join(playerId);
    this.playerRegistry.set(playerId, { id: userId, username });

    // Start first match if tournament is full
    if (this.activeTournament.status === "semifinal_1" && !this.currentMatch) {
      this.startNextMatch();
    }

    return this.activeTournament.getTournamentInfo();
  }

  private startNextMatch() {
    if (!this.activeTournament) return;
    if (this.currentMatch) return;

    const match = this.activeTournament.getCurrentMatch();
    if (!match) return;

    const p1 = this.playerRegistry.get(match.player1);
    const p2 = this.playerRegistry.get(match.player2);

    if (!p1 || !p2) {
      log.error({ match }, "TournamentService: missing player registry entry");
      return;
    }

    const game = new Game(p1.id, p2.id);

    this.currentMatch = {
      matchType: match.matchType,
      p1Id: p1.id,
      p2Id: p2.id,
      p1Username: p1.username,
      p2Username: p2.username,
      game,
      interval: null,
      started: false,
    };

    log.info(
      `Tournament ${match.matchType} created. Starting in 5 seconds: ${p1.username} vs ${p2.username}`,
    );

    setTimeout(() => {
      if (!this.currentMatch) return;
      if (this.currentMatch.game !== game) return;

      this.currentMatch.started = true;

      const interval = setInterval(() => {
        const done = game.updateGame();
        if (done) {
          clearInterval(interval);
          this.currentMatch = null;
          this.handleMatchComplete(game);
        }
      }, 16);

      this.currentMatch.interval = interval;
      log.info(
        `Tournament ${match.matchType} started: ${p1.username} vs ${p2.username}`,
      );
    }, 5000);
  }

  private handleMatchComplete(game: Game) {
    if (!this.activeTournament) return;

    const left = game.getPlayerOneScore();
    const right = game.getPlayerTwoScore();

    // Decide winner by score
    let winnerId: string;
    if (left > right) {
      winnerId = game.playerOneId.toString();
    } else if (right > left) {
      winnerId = game.playerTwoId.toString();
    } else {
      winnerId = game.playerOneId.toString();
    }

    this.activeTournament.recordWinner(winnerId);
    this.currentMatch = null;

    // If complete, resolve winner safely and store previousWinnerName
    if (this.activeTournament.isComplete()) {
      const winnerPid = this.activeTournament.getWinner();
      if (!winnerPid) {
        log.error("Tournament completed but winner is null");
        return;
      }

      const winner = this.playerRegistry.get(winnerPid);
      const winnerName = winner?.username ?? winnerPid;

      this.previousWinnerName = winnerName;
      this.activeTournament.previousWinner = winnerName;

      log.info(`Tournament complete! Winner: ${winnerName}`);
      return;
    }

    // Not complete: clear and start next match
    this.startNextMatch();
  }

  getStatus() {
    if (!this.activeTournament) {
      return { status: "no_tournament", currentMatch: null };
    }

    return {
      ...this.activeTournament.getTournamentInfo(),

      currentMatch: this.currentMatch
        ? {
            status: this.currentMatch.started ? "running" : "starting",
            matchType: this.currentMatch.matchType,

            players: {
              left: {
                userId: this.currentMatch.p1Id,
                username: this.currentMatch.p1Username,
                y: this.currentMatch.game.playerOnePaddle.y,
              },
              right: {
                userId: this.currentMatch.p2Id,
                username: this.currentMatch.p2Username,
                y: this.currentMatch.game.playerTwoPaddle.y,
              },
            },

            ball: {
              x: this.currentMatch.game.myBall.x,
              y: this.currentMatch.game.myBall.y,
            },

            score: {
              left: this.currentMatch.game.playerOneScore,
              right: this.currentMatch.game.playerTwoScore,
            },
          }
        : null,
    };
  }

  getCurrentMatch() {
    return this.currentMatch;
  }

  applyMove(userId: number, direction: string) {
    if (!this.currentMatch) return { error: "no_active_match" };
    if (!this.currentMatch.started) return { error: "not_started" };

    if (direction !== "UP" && direction !== "DOWN" && direction !== "STOP") {
      return { error: "invalid_direction" };
    }

    const game = this.currentMatch.game;

    const isP1 = userId === this.currentMatch.p1Id;
    const isP2 = userId === this.currentMatch.p2Id;
    if (!isP1 && !isP2) return { error: "not_in_match" };

    if (direction === "UP") {
      isP1 ? game.setFirstPaddleUp() : game.setSecondPaddleUp();
    } else if (direction === "DOWN") {
      isP1 ? game.setFirstPaddleDown() : game.setSecondPaddleDown();
    } else {
      isP1 ? game.setFirstPaddleNeutral() : game.setSecondPaddleNeutral();
    }

    return { status: "ok" };
  }
}

// Singleton instance
export const tournamentService = new TournamentService();
