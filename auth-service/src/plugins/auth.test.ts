import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import Fastify from 'fastify';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import config from '../config/config.js';
import getDb, { dbMigrate, dbReset } from '../db/db.js';
import { tokensTable, usersTable } from '../db/schema.js';
import {
  OauthStateJwtPayloadSchema,
  TwoFaJwtPayloadSchema,
  TwoFaSetupJwtPayloadSchema,
  UserJwtPayloadSchema,
} from '../schemas/userSchema.js';
import { auth } from './index.js';

type User = typeof usersTable.$inferSelect;

interface ResType {
  message: string;
}

const authTestRouter = (server: FastifyInstance) => {
  server.get('/non-auth', (request: FastifyRequest) => {
    const user = request.userId || 'guest';
    return { message: user };
  });

  server.get(
    '/optional-auth',
    {
      config: { auth: 'optional' },
    },
    (request: FastifyRequest) => {
      const user = request.userId || 'guest';
      return { message: user };
    },
  );

  server.get(
    '/mandatory-auth',
    {
      config: { auth: 'mandatory' },
    },
    (request: FastifyRequest) => {
      return { message: request.userId };
    },
  );
};

const initServer = async () => {
  const testServer = Fastify();
  testServer.register(auth);
  testServer.register(authTestRouter, { prefix: '/auth-test' });
  await testServer.ready();
  return testServer;
};

let testServer: FastifyInstance;
let db: LibSQLDatabase;

beforeAll(async () => {
  await dbMigrate();
  await dbReset();
  db = getDb();
  testServer = await initServer();
});

describe('Token generation tests', () => {
  test('Access token generation', () => {
    const token = testServer.signAccessToken(999);
    const decoded = UserJwtPayloadSchema.parse(testServer.jwt.verify(token));
    expect(decoded.userId).toBe(999);
    expect(decoded.type).toBe('USER');
  });

  test('OAuth state token generation', () => {
    const token = testServer.signOauthStateToken();
    const decoded = OauthStateJwtPayloadSchema.parse(testServer.jwt.verify(token));
    expect(decoded.type).toBe('GoogleOAuthState');
  });

  test('2FA token generation', () => {
    const token = testServer.signTwoFaToken(999);
    const decoded = TwoFaJwtPayloadSchema.parse(testServer.jwt.verify(token));
    expect(decoded.userId).toBe(999);
    expect(decoded.type).toBe('2FA');
  });

  test('2FA Setup token generation', () => {
    const token = testServer.signTwoFaSetupToken(999, 'secret');
    const decoded = TwoFaSetupJwtPayloadSchema.parse(testServer.jwt.verify(token));
    expect(decoded.userId).toBe(999);
    expect(decoded.type).toBe('2FA_SETUP');
  });

  test('Invalid token verification', () => {
    const invalidToken = 'invalid-token-string';
    expect(() => testServer.jwt.verify(invalidToken)).toThrow();
  });

  test('Expired token verification', async () => {
    config.oauthStateTokenExpiry = 1;
    const expiredToken = testServer.signOauthStateToken();
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    await wait(1005);
    expect(() => testServer.jwt.verify(expiredToken)).toThrow();
  });
});

describe('Auth plugin tests', () => {
  let user: User;

  beforeEach(async () => {
    await dbReset();
    user = await db
      .insert(usersTable)
      .values({
        username: 'testuser',
        email: 'a@a.com',
      })
      .returning()
      .get();
  });

  test('No auth route without authentication, should return guest', async () => {
    const response = await testServer.inject({
      method: 'GET',
      url: '/auth-test/non-auth',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ResType;
    expect(body.message).toBe('guest');
  });

  test('No auth route with authentication, should return guest', async () => {
    const token = testServer.signAccessToken(123);
    const response = await testServer.inject({
      method: 'GET',
      url: '/auth-test/non-auth',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ResType;
    expect(body.message).toBe('guest');
  });

  test('Optional auth route without authentication, should return guest', async () => {
    const response = await testServer.inject({
      method: 'GET',
      url: '/auth-test/optional-auth',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ResType;
    expect(body.message).toBe('guest');
  });

  test('Optional auth route with authentication, should return userId', async () => {
    const token = testServer.signAccessToken(user.id);
    await db.insert(tokensTable).values({ userId: user.id, token });
    const response = await testServer.inject({
      method: 'GET',
      url: '/auth-test/optional-auth',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ResType;
    expect(body.message).toBe(user.id);
  });

  test('Mandatory auth route without authentication, should return 401', async () => {
    const response = await testServer.inject({
      method: 'GET',
      url: '/auth-test/mandatory-auth',
    });
    expect(response.statusCode).toBe(401);
  });

  test('Mandatory auth route with invalid token, should return 401', async () => {
    const response = await testServer.inject({
      method: 'GET',
      url: '/auth-test/mandatory-auth',
      headers: { Authorization: `Bearer invalidtoken` },
    });
    expect(response.statusCode).toBe(401);
  });

  test('Mandatory auth route with valid token, should return userId', async () => {
    const token = testServer.signAccessToken(user.id);
    await db.insert(tokensTable).values({ userId: user.id, token });
    const response = await testServer.inject({
      method: 'GET',
      url: '/auth-test/mandatory-auth',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ResType;
    expect(body.message).toBe(user.id);
  });

  test('Mandatory auth route with valid token but missing in DB, should return 401', async () => {
    const token = testServer.signAccessToken(user.id);
    const response = await testServer.inject({
      method: 'GET',
      url: '/auth-test/mandatory-auth',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(401);
  });
});
