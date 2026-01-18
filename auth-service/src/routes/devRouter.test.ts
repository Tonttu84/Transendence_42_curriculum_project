import { describe, expect, test } from 'vitest';
import getDb from '../db/db.js';
import { friendsTable, usersTable } from '../db/schema.js';
import { server } from '../server.js';

describe('dev router testing', () => {
  test('reset db', async () => {
    await server.inject({
      method: 'GET',
      url: '/api/dev/reset',
    });

    const db = getDb();

    const users = await db.select().from(usersTable);
    expect(users.length).toBe(0);
    const friends = await db.select().from(friendsTable);
    expect(friends.length).toBe(0);
  });

  test('seed db', async () => {
    await server.inject({
      method: 'GET',
      url: '/api/dev/reset-and-seed',
    });

    const db = getDb();

    const users = await db.select().from(usersTable);
    expect(users.length).toBe(2);
    const friends = await db.select().from(friendsTable);
    expect(friends.length).toBe(1);
  });
});
