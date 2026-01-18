import { FastifySchema } from "fastify";

const errorResponse = {
  type: "object",
  additionalProperties: false,
  properties: {
    error: {
      type: "string",
      enum: [
        "Missing direction",
        "Invalid token",
        "no_match",
        "not_started",
        "not_in_match",
        "invalid_direction",
      ],
    },
  },
  required: ["error"],
};

const badRequestError = {
  type: "object",
  additionalProperties: false,
  properties: {
    error: {
      type: "string",
      enum: ["Missing direction"],
    },
  },
  required: ["error"],
};

const conflictError = {
  type: "object",
  additionalProperties: false,
  properties: {
    error: {
      type: "string",
      enum: ["no_match", "not_started", "not_in_match", "invalid_direction"],
    },
  },
  required: ["error"],
};

export const gameMoveSchema: FastifySchema = {
  summary: "Send paddle movement",
  description:
    "Sends a paddle movement input for the authenticated user. " +
    "This endpoint is fire-and-forget; the updated game state is retrieved via /gamestate.",
  tags: ["Game"],
  security: [{ bearerAuth: [] }],

  body: {
    type: "object",
    additionalProperties: false,
    required: ["direction"],
    properties: {
      direction: {
        type: "string",
        enum: ["UP", "DOWN", "STOP"],
        description: "Paddle movement direction",
      },
    },
  },

  response: {
    200: {
      description: "Movement input accepted",
      type: "null",
    },

    400: {
      description: "Bad request – missing direction",
      ...badRequestError,
    },

    401: {
      description: "Unauthorized – invalid bearer token",
      type: "null",
    },

    404: {
      description:
        "Conflict – user is not in a match, match has not started, or input is invalid for the current game state",
      ...conflictError,
    },
  },
};

export const gameStateSchema: FastifySchema = {
  summary: "Get game state",
  tags: ["Game"],
  security: [{ bearerAuth: [] }],

  querystring: {
    type: "object",
    required: ["matchId"],
    additionalProperties: false,
    properties: {
      matchId: {
        type: "string",
        description: "Match ID returned by /gamestatus",
      },
    },
  },

  response: {
    200: {
      oneOf: [
        // starting/running: full game state
        {
          type: "object",
          additionalProperties: false,
          properties: {
            status: { enum: ["starting", "running"] },
            matchId: { type: "string" },

            players: {
              type: "object",
              additionalProperties: false,
              properties: {
                left: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    username: { type: "string" },
                    y: { type: "number" },
                  },
                  required: ["username", "y"],
                },
                right: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    username: { type: "string" },
                    y: { type: "number" },
                  },
                  required: ["username", "y"],
                },
              },
              required: ["left", "right"],
            },

            ball: {
              type: "object",
              additionalProperties: false,
              properties: {
                x: { type: "number" },
                y: { type: "number" },
              },
              required: ["x", "y"],
            },

            score: {
              type: "object",
              additionalProperties: false,
              properties: {
                left: { type: "number" },
                right: { type: "number" },
              },
              required: ["left", "right"],
            },
          },
          required: ["status", "matchId", "players", "ball", "score"],
        },

        //finished
        {
          type: "object",
          additionalProperties: false,
          properties: {
            status: { const: "finished" },
            matchId: { type: "string" },
            winner: {
              type: "string",
              description: 'Winner username, or "no winner" if tied',
            },
          },
          required: ["status", "matchId", "winner"],
        },
      ],
    },

    401: {
      description: "Unauthorized – invalid bearer token",
      type: "null",
    },

    404: {
      description: "Player is not in a match",
      ...conflictError,
    },
  },
};

export const gameStatusSchema: FastifySchema = {
  summary: "Get player game status",
  description:
    "Returns the current matchmaking or game status for the authenticated user.\n\n" +
    "Possible values for `status`:\n" +
    "- `idle`: user is not queued and not in a match\n" +
    "- `waiting`: user is waiting in the matchmaking queue\n" +
    "- `starting`: match created but not yet started\n" +
    "- `running`: match is currently running",
  tags: ["Game"],
  security: [{ bearerAuth: [] }],

  response: {
    200: {
      description: "Current game or matchmaking status",
      oneOf: [
        {
          type: "object",
          properties: {
            status: { const: "idle" },
          },
          required: ["status"],
        },
        {
          type: "object",
          properties: {
            status: { const: "waiting" },
          },
          required: ["status"],
        },
        {
          type: "object",
          properties: {
            status: { const: "starting" },
            matchId: { type: "string" },
            leftPlayer: { type: "string" },
            rightPlayer: { type: "string" },
          },
          required: ["status", "matchId", "leftPlayer", "rightPlayer"],
        },
        {
          type: "object",
          properties: {
            status: { const: "running" },
            matchId: { type: "string" },
          },
          required: ["status", "matchId"],
        },
        {
          type: "object",
          properties: {
            status: { const: "finished" },
            matchId: { type: "string" },
          },
          required: ["status", "matchId"],
        },
      ],

      example: {
        status: "starting",
        matchId: "c7c9a4e3-1b9d-4a4b-9f77-7a45d9e2a001",
        leftPlayer: "alice",
        rightPlayer: "bob",
      },
    },

    401: {
      description: "Unauthorized – invalid or missing bearer token",
      type: "null",
    },

    404: {
      description: "Inconsistent match state",
      type: "object",
      properties: {
        status: { const: "error" },
      },
      required: ["status"],
    },
  },
};

export const joinGameSchema: FastifySchema = {
  summary: "Join matchmaking queue",
  description: "Adds the authenticated user to the matchmaking queue.",
  tags: ["Game"],
  security: [{ bearerAuth: [] }],

  response: {
    200: {
      description: "User successfully added to the matchmaking queue",
      type: "object",
      additionalProperties: false,
      properties: {
        status: { const: "queued" },
      },
      required: ["status"],
    },

    401: {
      description: "Unauthorized – invalid or missing bearer token",
      type: "null",
    },
  },
};

// schemas/matchhistory.schema.ts
export const matchHistorySchema: FastifySchema = {
  description: "Get last matches for authenticated user",
  tags: ["Game"],
  headers: {
    type: "object",
    required: ["authorization"],
    properties: {
      authorization: { type: "string" },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      type: "object",
      required: ["matches"],
      properties: {
        matches: {
          type: "array",
          items: {
            type: "object",
            required: ["winner", "loser", "playedAt"],
            properties: {
              winner: { type: "string" },
              loser: { type: "string" },
              playedAt: { type: "string" },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    401: {
      type: "object",
      additionalProperties: true,
    },

    502: {
      type: "object",
      required: ["error", "status"],
      properties: {
        error: { type: "string" },
        status: { type: "number" },
      },
      additionalProperties: false,
    },
  },
};

export const matchIdsSchema: FastifySchema = {
  description: "Get IDs of currently active matches and the player information",
  tags: ["Game"],
  headers: {
    type: "object",
    required: ["authorization"],
    properties: {
      authorization: { type: "string" },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      type: "object",
      required: ["matchIds"],
      additionalProperties: false,
      properties: {
        matchIds: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              matchId: { type: "string" },
              left: { type: "string" },
              right: { type: "string" },
              started: { type: "boolean" },
            },
            required: ["matchId", "left", "right", "started"],
          },
        },
        additionalProperties: false,
      },
    },
    401: {
      type: "object",
      additionalProperties: true,
    },
  },
};
