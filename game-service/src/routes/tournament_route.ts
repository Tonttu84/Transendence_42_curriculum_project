// routes/tournament.ts
import { FastifyInstance } from "fastify";
import { validateToken, getUsername } from "../utils/auth";
import { tournamentService } from "../core/tournament_service";
import {
  tournamentCreateSchema,
  tournamentJoinSchema,
  tournamentStatusSchema,
  tournamentMoveSchema,
} from "../schemas/tournament.schema";

export default async function tournamentRoutes(app: FastifyInstance) {
  // Create a new tournament
  app.post(
    "/create",
    { schema: tournamentCreateSchema },
    async (request, reply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader) return reply.code(401).send();

      const user = await validateToken(authHeader);

      if (!user.userId) {
        return reply.code(401).send();
      }

      const me = await getUsername(authHeader);
      if (!me.username) return reply.code(401).send();

      try {
        const tournament = tournamentService.createTournament(
          user.userId,

          me.username,
        );
        return reply
          .code(201)
          .send({ tournament: tournament.getTournamentInfo() });
      } catch (err: any) {
        return reply.code(409).send({ error: "Tournament already active" });
      }
    },
  );

  // Join existing tournament
  app.post(
    "/join",
    { schema: tournamentJoinSchema },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) return reply.code(401).send();

      const user = await validateToken(authHeader);
      if (!user.userId) {
        return reply.code(401).send();
      }

      const me = await getUsername(authHeader);

      if (!me.username) {
        return reply.code(401).send();
      }

      try {
        const info = tournamentService.joinTournament(user.userId, me.username);

        return reply.code(200).send({
          message: `${me.username} joined tournament`,
          tournament: info,
        });
      } catch (error: any) {
        return reply.code(400).send({ error: error.message }); //might reply with different error codes (No tournament, already joined the tournament, Active tournament etc.)
      }
    },
  );

  // Get tournament status
  app.get(
    "/status",
    { schema: tournamentStatusSchema },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) return reply.code(401).send();

      const user = await validateToken(authHeader);
      if (!user.userId) {
        return reply.code(401).send();
      }

      const status = tournamentService.getStatus();
      return reply.send(status);
    },
  );

  app.post(
    "/move",
    { schema: tournamentMoveSchema },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) return reply.code(401).send();

      const user = await validateToken(authHeader);
      if (!user.userId)
        return reply
          .code(204)
          .send({ message: "Player not participating in current match" });

      const { direction } = request.body as { direction?: unknown };
      if (typeof direction !== "string") {
        return reply.code(400).send({ error: "Missing direction" });
      }

      const result = tournamentService.applyMove(user.userId, direction);
      if ("error" in result) return reply.code(400).send(result);

      return reply.code(200).send();
    },
  );
}
