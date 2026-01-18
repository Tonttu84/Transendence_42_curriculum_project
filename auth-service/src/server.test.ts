import { describe, expect, test } from 'vitest';
import { server } from './server.js';

describe('Health check', () => {
  test('GET /api/ping returns pong', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/ping',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ message: 'pong' });
  });
});
