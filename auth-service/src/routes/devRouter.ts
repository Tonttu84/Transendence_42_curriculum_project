import type { FastifyInstance } from 'fastify';
import config from '../config/config.js';
import { dbReset, dbSeed } from '../db/db.js';

export const devRouter = (server: FastifyInstance) => {
  if (config.env === 'production') {
    server.log.warn('devRoute is disabled under prod');
    return;
  }

  server.get('/reset', async () => {
    await dbReset();
    return { message: 'db reset ok' };
  });

  server.get('/reset-and-seed', async () => {
    await dbReset();
    await dbSeed();
    return { message: 'db reset + seed ok' };
  });
};
