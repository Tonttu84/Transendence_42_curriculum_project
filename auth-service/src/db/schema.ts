import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  avatar: text('avatar'),
  googleOauthId: text('google_oauth_id'),
  twoFaToken: text('two_fa_token').default(''),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => new Date().getTime()),
});

export const friendsTable = sqliteTable(
  'friends',
  {
    userId: integer('user_id').references(() => usersTable.id),
    friendId: integer('friend_id').references(() => usersTable.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.friendId] })],
);

export const tokensTable = sqliteTable(
  'tokens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => usersTable.id),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at').$defaultFn(() => new Date().getTime()),
  },
  (t) => [index('tokens_ts_idx').on(t.createdAt)],
);

// Here I doesnot use FK, because redis is the better place to store such data.
// Tho it's a small project, so I still use sqlite for simplicity.
export const heartbeatTable = sqliteTable(
  'heartbeat',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id'),
    createdAt: integer('created_at').$defaultFn(() => new Date().getTime()),
  },
  (t) => [index('heartbeat_ts_idx').on(t.createdAt)],
);
