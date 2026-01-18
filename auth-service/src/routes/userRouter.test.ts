import { authenticator } from 'otplib';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod';
import config from '../config/config.js';
import { dbMigrate, dbReset } from '../db/db.js';
import {
  SimpleUserResponseSchema,
  TwoFaPendingUserResponseSchema,
  TwoFaSetupResponseSchema,
  UserValidationResponseSchema,
  UserWithoutTokenResponseSchema,
  UserWithTokenResponseSchema,
} from '../schemas/userSchema.js';
import { server } from '../server.js';
import userService from '../services/userService.js';

beforeAll(async () => {
  await dbMigrate();
  await server.ready();
});

describe('User router: create user testing', () => {
  beforeEach(async () => {
    await dbReset();
  });

  test('create a normal user', async () => {
    const payload = {
      username: 'testuser',
      password: 'testpassword',
      email: 'a@example.com',
      twoFa: false,
    };

    const res = await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });

    expect(res.statusCode).toBe(201);
    const resBody = UserWithoutTokenResponseSchema.parse(JSON.parse(res.body));
    expect(resBody.username).toBe(payload.username);
    expect(resBody.twoFa).toBe(payload.twoFa);
    expect('password' in resBody).toBe(false);
    expect('passwordHash' in resBody).toBe(false);
  });

  test('returns 409 for duplicated username', async () => {
    const payload = {
      username: 'testuser',
      password: 'testpassword',
      email: 'a@b.com',
    };

    const res = await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });

    expect(res.statusCode).toBe(201);

    const payload2 = {
      username: 'testuser',
      password: 'testpassword',
      email: 'b@b.com',
    };

    const res2 = await server.inject({
      method: 'POST',
      url: '/api/users',
      payload: payload2,
    });

    expect(res2.statusCode).toBe(409);
    const resBody = JSON.parse(res2.body) as { error: string };
    expect(resBody.error).toContain('UNIQUE');
  });

  test('return 401 for invalid request', async () => {
    const payload = {
      username: 't',
      password: 'testpassword',
    };

    const res = await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });

    expect(res.statusCode).toBe(400);
    const resBody = JSON.parse(res.body) as { error: string };
    expect(resBody.error).toContain('username');
  });
});

describe('User router: login user testing', () => {
  const payload = {
    username: 'testuser',
    password: 'testpassword',
    email: 'a@example.com',
  };
  beforeEach(async () => {
    await dbReset();
    await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });
  });

  test('login successfully with correct username and password', async () => {
    const loginPayload = {
      username: 'testuser',
      password: 'testpassword',
    };

    const res = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: loginPayload,
    });

    expect(res.statusCode).toBe(200);
    const resBody = UserWithTokenResponseSchema.parse(JSON.parse(res.body));

    expect(resBody.username).toBe(payload.username);
    expect(resBody.twoFa).toBe(false);
    expect(resBody.id).toBeGreaterThan(0);
    expect(typeof resBody.token).toBe('string');
    expect(resBody.token.length).toBeGreaterThan(0);
    expect('password' in resBody).toBe(false);
    expect('passwordHash' in resBody).toBe(false);
  });

  test('return 401 for incorrect password', async () => {
    const loginPayload = {
      username: 'testuser',
      password: 'wrongpassword',
    };

    const res = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: loginPayload,
    });

    expect(res.statusCode).toBe(401);
    const resBody = JSON.parse(res.body) as { error: string };
    expect(resBody.error).toBe('Invalid username or password');
  });

  test('return 401 for non-existing username', async () => {
    const loginPayload = {
      username: 'erroruser',
      password: 'somepassword',
    };

    const res = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: loginPayload,
    });

    expect(res.statusCode).toBe(401);
    const resBody = JSON.parse(res.body) as { error: string };
    expect(resBody.error).toBe('Invalid username or password');
  });

  test('login with 2FA enabled', async () => {
    const create2FaPayload = {
      username: 'testuser2',
      password: 'testpassword',
      email: 'a2@example.com',
    };
    await server.inject({
      method: 'POST',
      url: '/api/users',
      payload: create2FaPayload,
    });

    const loginPayload = {
      username: 'testuser2',
      password: 'testpassword',
    };

    let res = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: loginPayload,
    });

    if (!res || !('token' in JSON.parse(res.body))) throw new Error('No response from server');
    const resBody0 = UserWithTokenResponseSchema.parse(JSON.parse(res.body));
    const token = resBody0.token;

    const twoFaRes = await server.inject({
      method: 'POST',
      url: '/api/users/2fa/setup',
      headers: { Authorization: `Bearer ${token}` },
      payload: { twoFa: true },
    });

    expect(twoFaRes.statusCode).toBe(200);
    const twoFaSetup = TwoFaSetupResponseSchema.parse(JSON.parse(twoFaRes.body));

    const code = authenticator.generate(twoFaSetup.twoFaSecret);
    await server.inject({
      method: 'POST',
      url: '/api/users/2fa/confirm',
      headers: { Authorization: `Bearer ${token}` },
      payload: { setupToken: twoFaSetup.setupToken, twoFaCode: code },
    });

    res = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: loginPayload,
    });

    expect(res.statusCode).toBe(428);
    const resBody = TwoFaPendingUserResponseSchema.parse(JSON.parse(res.body));
    expect(resBody.message).toBe('2FA_REQUIRED');
  });
});

// Happy path is tested in service tests
describe('User router: 2FA submission testing', () => {
  test('incorrect 2FA code submission', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/users/2fa',
      payload: { twoFaCode: '222', sessionToken: 'invalidtoken' },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('User router: update password testing', () => {
  const payload = {
    username: 'testuser',
    password: 'testpassword',
    email: 'a@example.com',
  };
  let token: string = '';

  beforeEach(async () => {
    await dbReset();
    await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: payload.username, password: payload.password },
    });

    const loginResBody = UserWithTokenResponseSchema.parse(JSON.parse(loginRes.body));
    token = loginResBody.token;
  });

  test('update password without authentication should return 401', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/users/password',
      payload: { oldPassword: 'testpassword', newPassword: 'newpassword' },
    });

    expect(res.statusCode).toBe(401);
  });

  test('update password with authentication should succeed', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/users/password',
      headers: { Authorization: `Bearer ${token}` },
      payload: { oldPassword: 'testpassword', newPassword: 'newpassword' },
    });

    expect(res.statusCode).toBe(200);
    const resBody = UserWithTokenResponseSchema.parse(JSON.parse(res.body));
    expect(resBody.username).toBe(payload.username);
    expect(resBody.twoFa).toBe(false);
    expect(resBody.id).toBeGreaterThan(0);
    expect(typeof resBody.token).toBe('string');
    expect(resBody.token.length).toBeGreaterThan(0);
    expect('password' in resBody).toBe(false);
    expect('passwordHash' in resBody).toBe(false);

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: payload.username, password: 'newpassword' },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginResBody = UserWithTokenResponseSchema.parse(JSON.parse(loginRes.body));
    expect(loginResBody.username).toBe(payload.username);
  });

  test('update password with incorrect old password should return 403', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/users/password',
      headers: { Authorization: `Bearer ${token}` },
      payload: { oldPassword: 'wrongpassword', newPassword: 'newpassword' },
    });

    expect(res.statusCode).toBe(403);
    const resBody = JSON.parse(res.body) as { error: string };
    expect(resBody.error).toBe('Old password is incorrect');
  });

  test('update password with invalid request should return 400', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/users/password',
      headers: { Authorization: `Bearer ${token}` },
      payload: { oldPassword: 'testpassword' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('User router: get me testing', () => {
  const payload = {
    username: 'testuser',
    password: 'testpassword',
    email: 'a@example.com',
  };
  let token: string = '';

  beforeEach(async () => {
    await dbReset();
    await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: payload.username, password: payload.password },
    });

    const loginResBody = UserWithTokenResponseSchema.parse(JSON.parse(loginRes.body));
    token = loginResBody.token;
  });

  test('get /me without authentication should return 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/users/me',
    });

    expect(res.statusCode).toBe(401);
  });

  test('get /me with authentication should succeed', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const resBody = UserWithoutTokenResponseSchema.parse(JSON.parse(res.body));
    expect(resBody.username).toBe(payload.username);
    expect(resBody.twoFa).toBe(false);
  });
});

describe('User router: update user info testing', () => {
  const payload = {
    username: 'testuser',
    password: 'testpassword',
    email: 'a@example.com',
  };
  let token: string = '';

  beforeEach(async () => {
    await dbReset();
    await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: payload.username, password: payload.password },
    });

    const loginResBody = UserWithTokenResponseSchema.parse(JSON.parse(loginRes.body));
    token = loginResBody.token;
  });

  test('update user info without authentication should return 401', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/users/me',
      payload: { email: 'b@b.com', username: 'testuser' },
    });

    expect(res.statusCode).toBe(401);
  });

  test('update user info with authentication should succeed', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/users/me',
      headers: { Authorization: `Bearer ${token}` },
      payload: { email: 'b@b.com', username: 'testuser' },
    });

    expect(res.statusCode).toBe(200);
    const resBody = UserWithoutTokenResponseSchema.parse(JSON.parse(res.body));
    expect(resBody.username).toBe(payload.username);
    expect(resBody.twoFa).toBe(false);
  });

  test('update user info with invalid request should return 400', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/users/me',
      headers: { Authorization: `Bearer ${token}` },
      payload: { username: 't' },
    });

    expect(res.statusCode).toBe(400);
  });

  test('update user info with additional fields should ignore extra fields', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/users/me',
      headers: { Authorization: `Bearer ${token}` },
      payload: { email: 'b@b.com', username: 'testuser', extraField: 'shouldBeIgnored' },
    });

    expect(res.statusCode).toBe(200);
    const resBody = UserWithoutTokenResponseSchema.parse(JSON.parse(res.body));
    expect(resBody.username).toBe('testuser');
    expect(resBody.twoFa).toBe(false);
  });

  test('update user info with sensitive fields should not update those fields', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/users/me',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        email: 'b@b.com',
        username: 'testuser',
        twoFaToken: 'maliciousValue',
      },
    });

    expect(res.statusCode).toBe(200);
    const resBody = UserWithoutTokenResponseSchema.parse(JSON.parse(res.body));
    expect(resBody.username).toBe('testuser');
    expect(resBody.twoFa).toBe(false);
  });
});

describe('User router: delete user testing', () => {
  const payload = {
    username: 'deleteuser',
    password: 'testpassword',
    email: 'delete@example.com',
  };
  let token: string = '';

  beforeEach(async () => {
    await dbReset();
    await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: payload.username, password: payload.password },
    });

    const loginResBody = UserWithTokenResponseSchema.parse(JSON.parse(loginRes.body));
    token = loginResBody.token;
  });

  test('delete /me without authentication should return 401', async () => {
    const res = await server.inject({
      method: 'DELETE',
      url: '/api/users/me',
    });

    expect(res.statusCode).toBe(401);
  });

  test('delete /me with authentication should remove user and revoke token', async () => {
    const res = await server.inject({
      method: 'DELETE',
      url: '/api/users/me',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: payload.username, password: payload.password },
    });

    expect(loginRes.statusCode).toBe(401);

    const meRes = await server.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(meRes.statusCode).toBe(401);
  });
});

describe('User router: get users with limited info testing', () => {
  const payload = {
    username: 'testuser',
    password: 'testpassword',
    email: 'a@example.com',
  };
  let token: string = '';

  beforeEach(async () => {
    await dbReset();
    await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: payload.username, password: payload.password },
    });

    const loginResBody = UserWithTokenResponseSchema.parse(JSON.parse(loginRes.body));
    token = loginResBody.token;
  });

  test('get users with limited info without authentication should return 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/users',
    });

    expect(res.statusCode).toBe(401);
  });

  test('get users with limited info with authentication should succeed', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/users',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const resBody = z.array(SimpleUserResponseSchema).parse(JSON.parse(res.body));
    expect(resBody.length).toBeGreaterThan(0);
    const user = resBody.find((u) => u.username === payload.username);
    expect(user).toBeDefined();
    if (!user) throw new Error('User not found in response');
    expect(user.username).toBe(payload.username);
    expect('email' in user).toBe(false);
  });
});

describe('User router: get user by username with limited info testing', () => {
  const payload = {
    username: 'testuser',
    password: 'testpassword',
    email: 'a@example.com',
  };
  let token: string = '';

  beforeEach(async () => {
    await dbReset();
    await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: payload.username, password: payload.password },
    });

    const loginResBody = UserWithTokenResponseSchema.parse(JSON.parse(loginRes.body));
    token = loginResBody.token;
  });

  test('get user by username with limited info without authentication should return 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/users/${payload.username}`,
    });

    expect(res.statusCode).toBe(401);
  });

  test('get user by username with limited info with authentication should succeed', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/users/${payload.username}`,
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const resBody = SimpleUserResponseSchema.parse(JSON.parse(res.body));
    expect(resBody.username).toBe(payload.username);
  });

  test('get user by non-existing username should return 404', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/users/none`,
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('User router: friends testing', () => {
  const user1Payload = {
    username: 'testuser1',
    password: 'testpassword',
    email: 'a@example.com',
  };
  const user2Payload = {
    username: 'testuser2',
    password: 'testpassword',
    email: 'b@example.com',
  };
  let token1: string = '';
  let user1Id: number = -1;
  let user2Id: number = -1;

  beforeEach(async () => {
    await dbReset();
    // Create user 1
    const res1 = await server.inject({
      method: 'POST',
      url: '/api/users',
      payload: user1Payload,
    });
    const resBody1 = UserWithoutTokenResponseSchema.parse(JSON.parse(res1.body));
    user1Id = resBody1.id;

    const loginRes1 = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: user1Payload.username, password: user1Payload.password },
    });
    const loginResBody1 = UserWithTokenResponseSchema.parse(JSON.parse(loginRes1.body));
    token1 = loginResBody1.token;

    // Create user 2
    const res2 = await server.inject({
      method: 'POST',
      url: '/api/users',
      payload: user2Payload,
    });
    const resBody2 = UserWithoutTokenResponseSchema.parse(JSON.parse(res2.body));
    user2Id = resBody2.id;
  });

  test('add a new friend without authentication should return 401', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/users/friends',
      payload: { userId: user2Id },
    });

    expect(res.statusCode).toBe(401);
  });

  test('add a new friend with authentication should succeed', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/users/friends',
      headers: { Authorization: `Bearer ${token1}` },
      payload: { userId: user2Id },
    });

    expect(res.statusCode).toBe(201);
  });

  test('add a non-existing user as a friend should return 404', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/users/friends',
      headers: { Authorization: `Bearer ${token1}` },
      payload: { userId: 99999 }, // Use a clearly non-existent ID
    });

    expect(res.statusCode).toBe(404);
  });

  test('add a friend that already exists should return 201 (idempotent)', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/users/friends',
      headers: { Authorization: `Bearer ${token1}` },
      payload: { userId: user2Id },
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/users/friends',
      headers: { Authorization: `Bearer ${token1}` },
      payload: { userId: user2Id },
    });

    expect(res.statusCode).toBe(201); // Still 201 due to service implementation
  });

  test('add self as a friend should return 403', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/users/friends',
      headers: { Authorization: `Bearer ${token1}` },
      payload: { userId: user1Id },
    });

    expect(res.statusCode).toBe(403);
    const resBody = JSON.parse(res.body) as { error: string };
    expect(resBody.error).toBe('Cannot add yourself as a friend');
  });
});

describe('User router: get friends testing', () => {
  const user1Payload = {
    username: 'testuser1',
    password: 'testpassword',
    email: 'a@example.com',
  };
  const user2Payload = {
    username: 'testuser2',
    password: 'testpassword',
    email: 'b@example.com',
  };
  let token1: string = '';
  let user2Id: number = -1;

  beforeEach(async () => {
    await dbReset();
    // Create user 1
    await server.inject({
      method: 'POST',
      url: '/api/users',
      payload: user1Payload,
    });

    const loginRes1 = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: user1Payload.username, password: user1Payload.password },
    });
    const loginResBody1 = UserWithTokenResponseSchema.parse(JSON.parse(loginRes1.body));
    token1 = loginResBody1.token;

    // Create user 2
    const res2 = await server.inject({
      method: 'POST',
      url: '/api/users',
      payload: user2Payload,
    });
    const resBody2 = UserWithoutTokenResponseSchema.parse(JSON.parse(res2.body));
    user2Id = resBody2.id;
  });

  test('get friends without authentication should return 401', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/users/friends',
    });

    expect(res.statusCode).toBe(401);
  });

  test('get friends with authentication should succeed (empty list)', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/users/friends',
      headers: { Authorization: `Bearer ${token1}` },
    });

    expect(res.statusCode).toBe(200);
    const resBody = z.array(SimpleUserResponseSchema).parse(JSON.parse(res.body));
    expect(resBody.length).toBe(0);
  });

  test('get friends with authentication should succeed (non-empty list)', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/users/friends',
      headers: { Authorization: `Bearer ${token1}` },
      payload: { userId: user2Id },
    });

    const res = await server.inject({
      method: 'GET',
      url: '/api/users/friends',
      headers: { Authorization: `Bearer ${token1}` },
    });

    expect(res.statusCode).toBe(200);
    const resBody = z.array(SimpleUserResponseSchema).parse(JSON.parse(res.body));
    expect(resBody.length).toBe(1);
    expect(resBody[0]?.username).toBe(user2Payload.username);
  });
});

describe('User router: validate user testing', () => {
  const payload = {
    username: 'testuser',
    password: 'testpassword',
    email: 'a@example.com',
  };
  let token: string = '';
  let userId: number = -1;

  beforeEach(async () => {
    await dbReset();
    const res = await server.inject({
      method: 'POST',
      url: '/api/users',
      payload,
    });
    const resBody = UserWithoutTokenResponseSchema.parse(JSON.parse(res.body));
    userId = resBody.id;

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { username: payload.username, password: payload.password },
    });

    const loginResBody = UserWithTokenResponseSchema.parse(JSON.parse(loginRes.body));
    token = loginResBody.token;
  });

  test('validate user without authentication should return 401', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/users/validate',
    });

    expect(res.statusCode).toBe(401);
  });

  test('validate user with authentication should succeed and return userId', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/users/validate',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const resBody = UserValidationResponseSchema.parse(JSON.parse(res.body));
    expect(resBody.userId).toBe(userId);
  });
});

describe('Google OAuth Router', () => {
  describe('/google/login', () => {
    test('should redirect to Google OAuth URL', async () => {
      const mockGoogleOAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      vi.spyOn(userService, 'googleOAuthHandler').mockReturnValue(mockGoogleOAuthUrl);

      const response = await server.inject({
        method: 'GET',
        url: '/api/users/google/login',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(mockGoogleOAuthUrl);
    });
  });

  describe('/google/callback', () => {
    test('should redirect to frontend with token on success', async () => {
      const mockToken = 'test-token';
      vi.spyOn(userService, 'googleOAuthCallbackHandler').mockResolvedValue({ token: mockToken });

      const response = await server.inject({
        method: 'GET',
        url: '/api/users/google/callback?code=test-code&state=test-state',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(
        `${config.frontendUrl}/oauth/google/callback?token=${mockToken}`,
      );
    });

    test('should redirect to frontend with error on failure', async () => {
      const mockError = 'test-error';
      vi.spyOn(userService, 'googleOAuthCallbackHandler').mockResolvedValue({ error: mockError });

      const response = await server.inject({
        method: 'GET',
        url: '/api/users/google/callback?code=test-code&state=test-state',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(
        `${config.frontendUrl}/oauth/google/callback?error=${mockError}`,
      );
    });
  });
});
