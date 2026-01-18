import { FastifySchema } from "fastify";

const authHeaders = {
  type: "object",
  required: ["authorization"],
  properties: {
    authorization: { type: "string" },
  },
  additionalProperties: true,
} as const;

export const tournamentInfoSchema = {
  type: "object",
  required: [
    "status",
    "previousWinner",
    "players",
    "semifinal1",
    "semifinal2",
    "final",
  ],
  properties: {
    status: {
      type: "string",
      enum: ["waiting", "semifinal_1", "semifinal_2", "final", "completed"],
    },
    previousWinner: { anyOf: [{ type: "string" }, { type: "null" }] },

    players: {
      type: "array",
      items: { type: "string" },
    },

    semifinal1: {
      type: "object",
      required: ["player1", "player2", "winner"],
      properties: {
        player1: { anyOf: [{ type: "string" }, { type: "null" }] },
        player2: { anyOf: [{ type: "string" }, { type: "null" }] },
        winner: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      additionalProperties: false,
    },

    semifinal2: {
      type: "object",
      required: ["player1", "player2", "winner"],
      properties: {
        player1: { anyOf: [{ type: "string" }, { type: "null" }] },
        player2: { anyOf: [{ type: "string" }, { type: "null" }] },
        winner: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      additionalProperties: false,
    },

    final: {
      type: "object",
      required: ["player1", "player2", "winner"],
      properties: {
        player1: { anyOf: [{ type: "string" }, { type: "null" }] },
        player2: { anyOf: [{ type: "string" }, { type: "null" }] },
        winner: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

const tournamentCreateResponseSchema = {
  type: "object",
  required: ["tournament"],
  properties: {
    tournament: tournamentInfoSchema,
  },
  additionalProperties: false,
} as const;

const tournamentJoinResponseSchema = {
  type: "object",
  required: ["message", "tournament"],
  properties: {
    message: { type: "string" },
    tournament: tournamentInfoSchema,
  },
  additionalProperties: false,
} as const;

const tournamentStatusResponseSchema = {
  oneOf: [
    // 1) no tournament
    {
      type: "object",
      required: ["status", "currentMatch"],
      properties: {
        status: { const: "no_tournament" },
        currentMatch: { type: "null" },
      },
      additionalProperties: false,
    },

    // 2) tournament exists
    {
      type: "object",
      required: [
        "status",
        "previousWinner",
        "players",
        "semifinal1",
        "semifinal2",
        "final",
        "currentMatch",
      ],
      properties: {
        // tournamentInfo fields:
        status: tournamentInfoSchema.properties.status,
        previousWinner: tournamentInfoSchema.properties.previousWinner,
        players: tournamentInfoSchema.properties.players,
        semifinal1: tournamentInfoSchema.properties.semifinal1,
        semifinal2: tournamentInfoSchema.properties.semifinal2,
        final: tournamentInfoSchema.properties.final,

        // currentMatch can be null or the live gamestate object
        currentMatch: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              required: ["status", "matchType", "players", "ball", "score"],
              properties: {
                status: {
                  type: "string",
                  enum: ["starting", "running"],
                },
                matchType: { type: "string" },

                players: {
                  type: "object",
                  required: ["left", "right"],
                  properties: {
                    left: {
                      type: "object",
                      required: ["userId", "username", "y"],
                      properties: {
                        userId: { type: "number" },
                        username: { type: "string" },
                        y: { type: "number" },
                      },
                      additionalProperties: false,
                    },
                    right: {
                      type: "object",
                      required: ["userId", "username", "y"],
                      properties: {
                        userId: { type: "number" },
                        username: { type: "string" },
                        y: { type: "number" },
                      },
                      additionalProperties: false,
                    },
                  },
                  additionalProperties: false,
                },

                ball: {
                  type: "object",
                  required: ["x", "y"],
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                  },
                  additionalProperties: false,
                },

                score: {
                  type: "object",
                  required: ["left", "right"],
                  properties: {
                    left: { type: "number" },
                    right: { type: "number" },
                  },
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
          ],
        },
      },
      additionalProperties: false,
    },
  ],
} as const;

const moveBodySchema = {
  type: "object",
  required: ["direction"],
  properties: {
    direction: { type: "string", enum: ["UP", "DOWN", "STOP"] },
  },
  additionalProperties: false,
} as const;

export const tournamentCreateSchema: FastifySchema = {
  description: "Create a new tournament (creator joins automatically)",
  tags: ["tournament"],
  headers: authHeaders,
  response: {
    201: tournamentCreateResponseSchema,
    401: { type: "object", additionalProperties: true },
    409: {
      type: "object",
      required: ["error"],
      properties: { error: { type: "string" } },
      additionalProperties: false,
    },
  },
};

export const tournamentJoinSchema: FastifySchema = {
  description: "Join the active tournament (or rejoin if already joined)",
  tags: ["tournament"],
  headers: authHeaders,
  response: {
    200: tournamentJoinResponseSchema,
    401: { type: "object", additionalProperties: true },
    400: {
      type: "object",
      required: ["error"],
      properties: { error: { type: "string" } },
      additionalProperties: false,
    },
  },
};

export const tournamentStatusSchema: FastifySchema = {
  description: "Get tournament info and (if present) current match gamestate",
  tags: ["tournament"],
  headers: authHeaders,
  response: {
    200: tournamentStatusResponseSchema,
    401: { type: "object", additionalProperties: true },
  },
};

export const tournamentMoveSchema: FastifySchema = {
  description: "Apply a paddle move for the current tournament match",
  tags: ["tournament"],
  headers: authHeaders,
  body: moveBodySchema,
  response: {
    200: { type: "object", additionalProperties: true },
    401: { type: "object", additionalProperties: true },
    400: {
      type: "object",
      required: ["error"],
      properties: { error: { type: "string" } },
      additionalProperties: false,
    },
  },
};
