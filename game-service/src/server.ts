import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import cors from "@fastify/cors";
import gameRoutes from "./routes/game_route";
import tournamentRoutes from "./routes/tournament_route";

export const server = Fastify({ logger: true });

server.register(cors, {
  origin: true, //allow requests from frontend server from any location
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
});

// Swagger / OpenAPI
server.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Game Service API",
      description: "API documentation for the Pong game service",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  exposeRoute: true,
  routePrefix: "/docs",
});

// Routes
server.register(gameRoutes, { prefix: "/api/game" });
server.register(tournamentRoutes, { prefix: "/api/tournament" });

// Optional health check
server.get("/api/ping", async () => {
  return { message: "pong" };
});
