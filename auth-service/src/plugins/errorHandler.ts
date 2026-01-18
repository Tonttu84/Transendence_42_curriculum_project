import { DrizzleQueryError } from 'drizzle-orm/errors';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/AppError.js';

const isUniqueError = (error: DrizzleQueryError): boolean => {
  const cause = error.cause as unknown;

  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
};

const handleUniqueError = (error: DrizzleQueryError, reply: FastifyReply): { error: string } => {
  reply.log.warn(error.cause?.message);
  return { error: error.cause?.message || 'UNIQUE constraint failed' };
};

const errorHandler = (error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
  if (!(error instanceof Error)) throw error;

  if (error instanceof AppError)
    return reply.status(error.statusCode).send({ error: error.message });

  // Handles validation errors
  if ('validation' in error) return reply.status(400).send({ error: error.message });

  // Handles Drizzle errors
  if (!(error instanceof DrizzleQueryError)) throw error;

  if (isUniqueError(error)) return reply.status(409).send(handleUniqueError(error, reply));

  throw error;
};

export default errorHandler;
