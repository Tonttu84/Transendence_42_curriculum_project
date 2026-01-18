import type { friendsTable, heartbeatTable, tokensTable, usersTable } from './schema.js';

export type NewUser = typeof usersTable.$inferInsert;

export type NewFriend = typeof friendsTable.$inferInsert;

export type NewToken = typeof tokensTable.$inferInsert;

export type NewHeartbeat = typeof heartbeatTable.$inferInsert;
