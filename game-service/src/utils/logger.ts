import type { FastifyBaseLogger } from "fastify";

export let log: FastifyBaseLogger = console as any;

export function setLogger(l: FastifyBaseLogger) {
  log = l;
}
