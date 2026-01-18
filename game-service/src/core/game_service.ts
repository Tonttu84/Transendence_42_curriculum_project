import { Game } from "../logic/game-logic/Game";
import { log } from "../utils/logger";

interface Player {
  userId: number;
  username: string;
}

interface MatchWrapper {
  game: Game;
  interval: NodeJS.Timeout | null;
  players: Player[];
  started: boolean;
}

export const waitingPlayers: Player[] = [];
const matches = new Map<string, MatchWrapper>();
const playerToMatch = new Map<number, string>();
const finishedMatches = new Map<
  number,
  { matchId: string; finishedAt: number }
>();
const finishedMatchesById = new Map<
  string,
  { finishedAt: number; winner?: string }
>();

//Start a match
export function tryStartMatch() {
  while (waitingPlayers.length >= 2) {
    const p1 = waitingPlayers.shift()!;
    const p2 = waitingPlayers.shift()!;
    const matchId = crypto.randomUUID();

    const game = new Game(p1.userId, p2.userId);

    // Register match in "starting" state
    matches.set(matchId, {
      game,
      interval: null,
      players: [p1, p2],
      started: false,
    });

    playerToMatch.set(p1.userId, matchId);
    playerToMatch.set(p2.userId, matchId);

    log.info(`Match ${matchId} created. Starting in 5 seconds...`);

    // Delay before starting the game loop
    setTimeout(() => {
      const match = matches.get(matchId);
      if (!match) return;

      match.started = true;

      const interval = setInterval(() => {
        const finished = match.game.updateGame();

        if (finished) {
          clearInterval(interval);

          const finishedAt = Date.now();

          const leftScore = match.game.playerOneScore;
          const rightScore = match.game.playerTwoScore;
          let winner: string | undefined;
          if (leftScore > rightScore) winner = p1.username;
          else if (rightScore > leftScore) winner = p2.username;
          else winner = "";

          finishedMatches.set(p1.userId, { matchId, finishedAt });
          finishedMatches.set(p2.userId, { matchId, finishedAt });
          finishedMatchesById.set(matchId, { finishedAt, winner });

          setTimeout(() => {
            // Delete per-user finished entries only if they still refer to THIS match/finish time
            const f1 = finishedMatches.get(p1.userId);
            if (f1 && f1.matchId === matchId && f1.finishedAt === finishedAt) {
              finishedMatches.delete(p1.userId);
            }

            const f2 = finishedMatches.get(p2.userId);
            if (f2 && f2.matchId === matchId && f2.finishedAt === finishedAt) {
              finishedMatches.delete(p2.userId);
            }

            // Delete per-match finished entry only if unchanged
            const fm = finishedMatchesById.get(matchId);
            if (fm && fm.finishedAt === finishedAt) {
              finishedMatchesById.delete(matchId);
            }
          }, 15000);

          matches.delete(matchId);
          playerToMatch.delete(p1.userId);
          playerToMatch.delete(p2.userId);
          log.info(`Match ${matchId} finished.`);
        }
      }, 16);

      match.interval = interval;
      log.info(`Match ${matchId} started.`);
    }, 5000);
  }
}

//Players join the que
export function joinQueue(player: Player): void {
  // Already in an active match, do not queue again
  if (playerToMatch.has(player.userId)) {
    return;
  }

  // Avoid duplicate entries
  if (!waitingPlayers.some((p) => p.userId === player.userId)) {
    waitingPlayers.push(player);
  }
  tryStartMatch();
}

// API call /ready (repeated calls from frontend to check the status of the game)
export function getGameStatus(userId: number) {
  // 1. Check if the user is in a match
  const matchId = playerToMatch.get(userId);

  if (matchId) {
    const match = matches.get(matchId);

    // Safety check
    if (!match) {
      return { status: "error" };
    }

    const [p1, p2] = match.players;

    if (!match.started) {
      return {
        status: "starting",
        matchId,
        leftPlayer: p1.username,
        rightPlayer: p2.username,
      };
    } else {
      return {
        status: "running",
        matchId,
      };
    }
  }

  // 2. Check if user is in the queue
  const isWaiting = waitingPlayers.some((p) => p.userId === userId);

  if (isWaiting) {
    return {
      status: "waiting",
    };
  }

  //3. Game is finished
  const finished = finishedMatches.get(userId);

  if (finished) {
    return {
      status: "finished",
      matchId: finished.matchId,
    };
  }

  // 4. User is neither queued nor in a match
  return {
    status: "idle",
  };
}

export function applyMove(userId: number, direction: string) {
  const matchId = playerToMatch.get(userId);
  if (!matchId) {
    return { error: "no_match" };
  }

  const match = matches.get(matchId);
  if (!match) {
    return { error: "no_match" };
  }

  if (!match.started) {
    return { error: "not_started" };
  }

  const game = match.game;
  const [p1, p2] = match.players;

  // Normalize direction
  switch (direction) {
    case "UP":
      if (userId === p1.userId) game.setFirstPaddleUp();
      else if (userId === p2.userId) game.setSecondPaddleUp();
      else return { error: "not_in_match" };
      break;

    case "DOWN":
      if (userId === p1.userId) game.setFirstPaddleDown();
      else if (userId === p2.userId) game.setSecondPaddleDown();
      else return { error: "not_in_match" };
      break;

    case "STOP":
      if (userId === p1.userId) game.setFirstPaddleNeutral();
      else if (userId === p2.userId) game.setSecondPaddleNeutral();
      else return { error: "not_in_match" };
      break;

    default:
      return { error: "invalid_direction" };
  }

  return { status: "ok" };
}

export function getGameState(matchId: string) {
  const match = matches.get(matchId);

  if (match) {
    const game = match.game;

    const [p1, p2] = match.players;

    return {
      status: match.started ? "running" : "starting",
      matchId,

      players: {
        left: {
          username: p1.username,
          y: game.playerOnePaddle.y,
        },
        right: {
          username: p2.username,
          y: game.playerTwoPaddle.y,
        },
      },

      ball: {
        x: game.myBall.x,
        y: game.myBall.y,
      },

      score: {
        left: game.playerOneScore,
        right: game.playerTwoScore,
      },
    };
  }

  // No active match, check recently finished matches
  const finished = finishedMatchesById.get(matchId);
  if (finished) {
    return {
      status: "finished",
      matchId,
      winner: finished.winner,
    };
  }

  return { error: "no_match" };
}

export function getActiveMatchIds() {
  return {
    matchIds: [...matches.entries()].map(([matchId, match]) => {
      const [left, right] = match.players;

      return {
        matchId,
        left: left.username,
        right: right.username,
        started: match.started,
      };
    }),
  };
}
