import { FastifyInstance } from "fastify";
import { validateToken, getUsername, getUsernamesByIds } from "../utils/auth";
import {
  joinQueue,
  getGameStatus,
  getGameState,
  applyMove,
  getActiveMatchIds,
} from "../core/game_service";
import {
  getMatchHistoryForUser,
  GameRow,
} from "../logic/game-logic/gameDatabase";
import {
  joinGameSchema,
  gameStatusSchema,
  gameStateSchema,
  gameMoveSchema,
  matchHistorySchema,
  matchIdsSchema,
} from "../schemas/game.schema";

export default async function gameRoutes(app: FastifyInstance) {
  // Join matchmaking queue
  app.post("/join", { schema: joinGameSchema }, async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.code(401).send();
    }

    const user = await validateToken(authHeader);

    if (!user.userId) {
      return reply.code(401).send();
    }

    const username = await getUsername(authHeader);

    if (!username.username) {
      return reply.code(401).send();
    }

    joinQueue({
      userId: user.userId,
      username: username.username,
    });
    return reply.code(200).send({ status: "queued" });
  });

  // Record player movement
  app.post("/move", { schema: gameMoveSchema }, async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.code(401).send();
    }

    const user = await validateToken(authHeader);

    if (!user.userId) {
      return reply.code(401).send();
    }

    const { direction } = request.body as { direction: string };

    if (!direction) {
      return reply.code(400).send({ error: "Missing direction" });
    }

    const result = applyMove(user.userId, direction);

    if (result.error) {
      return reply.code(404).send(result);
    }

    return reply.code(200).send();
  });

  // Get the current game state
  app.get("/gamestate", { schema: gameStateSchema }, async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.code(401).send();
    }

    const user = await validateToken(authHeader);

    if (!user.userId) {
      return reply.code(401).send();
    }

    const { matchId } = request.query as { matchId?: string };
    if (!matchId) {
      return reply.code(400).send({ error: "missing_match_id" });
    }

    const result = getGameState(matchId);

    if ("error" in result) {
      return reply.code(404).send(result);
    }

    return reply.send(result);
  });

  // Status of the game (running, starting, waiting...)
  app.get(
    "/gamestatus",
    { schema: gameStatusSchema },
    async (request, reply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        return reply.code(401).send();
      }
      const user = await validateToken(authHeader);

      if (!user.userId) {
        return reply.code(401).send();
      }
      const result = getGameStatus(user.userId);

      if ("error" in result) {
        return reply.code(404).send(result);
      }

      return reply.send(result);
    },
  );

  // get match history
  app.get(
    "/matchhistory",
    { schema: matchHistorySchema },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) return reply.code(401).send();

      const user = await validateToken(authHeader);
      if (!user.userId) return reply.code(401).send();

      const me = await getUsername(authHeader);
      if (!me.username) return reply.code(401).send();

      const rows: GameRow[] = getMatchHistoryForUser(user.userId);

      const otherIds = new Set<number>();
      for (const r of rows) {
        if (r.winner_id !== user.userId) otherIds.add(r.winner_id);
        if (r.loser_id !== user.userId) otherIds.add(r.loser_id);
      }

      const idsToResolve = Array.from(otherIds);

      let usernameMap = new Map<number, string>();

      if (idsToResolve.length > 0) {
        const lookup = await getUsernamesByIds(authHeader, idsToResolve);

        if ("status" in lookup) {
          return reply
            .code(502)
            .send({ error: "Auth lookup failed", status: lookup.status });
        }

        usernameMap = lookup.usernames;
      }

      const matches = rows.map((row) => ({
        winner:
          row.winner_id === user.userId
            ? me.username
            : (usernameMap.get(row.winner_id) ?? String(row.winner_id)),
        loser:
          row.loser_id === user.userId
            ? me.username
            : (usernameMap.get(row.loser_id) ?? String(row.loser_id)),
        playedAt: row.played_at,
      }));

      return reply.code(200).send({ matches });
    },
  );

  app.get("/matchIds", { schema: matchIdsSchema }, async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) return reply.code(401).send();

    const user = await validateToken(authHeader);
    if (!user.userId) return reply.code(401).send();

    return reply.send(getActiveMatchIds());
  });
}
