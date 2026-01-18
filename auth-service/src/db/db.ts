import { eq } from 'drizzle-orm';
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import config from '../config/config.js';
import { friendsTable, heartbeatTable, tokensTable, usersTable } from './schema.js';
import type { NewFriend, NewHeartbeat, NewUser } from './types.js';

let db: LibSQLDatabase | null = null;

export const dbMigrate = async (): Promise<void> => {
  await migrate(getDb(), { migrationsFolder: './drizzle' }).catch((err) => {
    console.error('Failed to run migrations:', err);
    process.exit(1);
  });
};

export const dbReset = async (): Promise<void> => {
  try {
    const dbInstance = getDb();
    await dbInstance.delete(tokensTable);
    await dbInstance.delete(friendsTable);
    await dbInstance.delete(heartbeatTable);
    await dbInstance.delete(usersTable);
  } catch (err) {
    console.error('Failed to reset db:', err);
    process.exit(1);
  }
};

export const dbSeed = async (): Promise<void> => {
  const db = getDb();

  // Seed userTable
  const users: NewUser[] = [
    {
      username: 'john',
      email: 'john@example.com',
    },
    {
      username: 'mike',
      email: 'mike@example.com',
    },
  ];
  await db.insert(usersTable).values(users);

  // Seed friendsTable
  const john = await db.select().from(usersTable).where(eq(usersTable.username, 'john')).get();
  const mike = await db.select().from(usersTable).where(eq(usersTable.username, 'mike')).get();
  if (!john || !mike) throw new Error('failed to get seeded data from userTable');

  const friend: NewFriend = { userId: john.id, friendId: mike.id };
  await db.insert(friendsTable).values(friend);

  // Seed haartbeatTable
  const heartbeat: NewHeartbeat = { userId: john.id };
  await db.insert(heartbeatTable).values(heartbeat);
};

const getDb = (): LibSQLDatabase => {
  if (!db) {
    db = drizzle(`file:${config.dbAddress}`);
  }

  return db;
};

export default getDb;
