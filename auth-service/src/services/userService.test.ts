import { eq, or } from 'drizzle-orm';
import { authenticator } from 'otplib';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import getDb, { dbMigrate, dbReset } from '../db/db.js';
import { friendsTable, heartbeatTable, tokensTable, usersTable } from '../db/schema.js';
import type { CreateUserRequest } from '../schemas/types.js';
import { server } from '../server.js';
import userService from './userService.js';

beforeAll(async () => {
  await dbMigrate();
  await server.ready();
});

describe('Create user test', () => {
  beforeEach(async () => {
    await dbReset();
  });

  test('Add a normal user', async () => {
    const data: CreateUserRequest = {
      username: 'testuser',
      password: 'testpassword',
      email: 'testuser@example.com',
    };

    const newUser = await userService.registerNewUser(data);

    expect(newUser.username).toBe(data.username);
    expect(newUser.id).toBeGreaterThan(0);
    expect(newUser.twoFa).toBe(false);
  });

  test('Throw when trying to create a new user with duplicated username', async () => {
    const data1: CreateUserRequest = {
      username: 'testuser',
      password: 'testpassword',
      email: 'testuser@example.com',
    };

    await userService.registerNewUser(data1);

    const data2: CreateUserRequest = {
      username: 'testuser',
      password: 'testpassword',
      email: 'testuser@example.com',
    };

    await expect(userService.registerNewUser(data2)).rejects.toThrow();
  });
});

describe('Login user test', () => {
  const data: CreateUserRequest = {
    username: 'testuser',
    password: 'testpassword',
    email: 'testuser@example.com',
  };

  beforeEach(async () => {
    await dbReset();
    await userService.registerNewUser(data);
  });

  test('Login successfully with correct username and password', async () => {
    const loginData = {
      username: 'testuser',
      password: 'testpassword',
    };

    const user = await userService.loginUser(loginData, server);

    expect(user).not.toBeNull();
    if (!user || !('token' in user)) throw new Error('Expected login to succeed without 2FA');

    expect(user.username).toBe(data.username);
    expect(user.id).toBeGreaterThan(0);
    expect(user.twoFa).toBe(false);
    expect(user.token).toBeDefined();
    expect(user.token.length).toBeGreaterThan(0);
  });

  test('Fail to login with incorrect password', async () => {
    const loginData = {
      username: 'testuser',
      password: 'wrongpassword',
    };

    await expect(userService.loginUser(loginData, server)).rejects.toThrowError(
      'Invalid username or password',
    );
  });

  test('Fail to login with non-existing username', async () => {
    const loginData = {
      username: 'nonexistinguser',
      password: 'testpassword',
    };

    await expect(userService.loginUser(loginData, server)).rejects.toThrowError(
      'Invalid username or password',
    );
  });

  test('Fail to login with no password set', async () => {
    await getDb()
      .update(usersTable)
      .set({ passwordHash: null })
      .where(eq(usersTable.username, data.username));

    const loginData = {
      username: 'testuser',
      password: 'testpassword',
    };

    await expect(userService.loginUser(loginData, server)).rejects.toThrowError(
      'Invalid username or password',
    );
  });

  test('Login with 2FA enabled', async () => {
    const dataWith2Fa: CreateUserRequest = {
      username: 'testuser2fa',
      password: 'testpassword',
      email: 'testuser2@example.com',
    };

    const newUser = await userService.registerNewUser(dataWith2Fa);
    const userId = newUser.id;

    const setup = await userService.startTwoFaSetup(userId, server);

    await userService.confirmTwoFaSetup(
      userId,
      setup.setupToken,
      authenticator.generate(setup.twoFaSecret),
      server,
    );

    const user = await userService.loginUser(
      { username: dataWith2Fa.username, password: dataWith2Fa.password },
      server,
    );

    if (!('message' in user)) throw new Error('Expected 2FA to be required');

    expect(user.message).toBe('2FA_REQUIRED');
  });
});

describe('Login user by email test', () => {
  const data: CreateUserRequest = {
    username: 'testuser',
    password: 'testpassword',
    email: 'testuser@example.com',
  };
  beforeEach(async () => {
    await dbReset();
    await userService.registerNewUser(data);
  });

  test('Login successfully with correct email and password', async () => {
    const loginData = {
      email: data.email,
      password: data.password,
    };

    const user = await userService.loginUserByEmail(loginData, server);

    expect(user).not.toBeNull();
    if (!user || !('token' in user)) throw new Error('Expected login to succeed without 2FA');

    expect(user.username).toBe(data.username);
    expect(user.id).toBeGreaterThan(0);
    expect(user.twoFa).toBe(false);
    expect(user.token).toBeDefined();
    expect(user.token.length).toBeGreaterThan(0);
  });

  test('Fail to login with incorrect password', async () => {
    const loginData = {
      email: data.email,
      password: 'wrongpassword',
    };
    await expect(userService.loginUserByEmail(loginData, server)).rejects.toThrowError(
      'Invalid username or password',
    );
  });
});

describe('2FA submission test', () => {
  let twoFaSecret: string = '';
  let sessionToken: string = '';
  const data: CreateUserRequest = {
    username: 'testuser',
    password: 'testpassword',
    email: 'testuser@example.com',
  };

  beforeEach(async () => {
    await dbReset();
    await userService.registerNewUser(data);

    const user = await userService.loginUser(
      { username: data.username, password: data.password },
      server,
    );
    if (!user || 'message' in user) throw new Error('Login failed in beforeEach');

    const setup = await userService.startTwoFaSetup(user.id, server);
    twoFaSecret = setup.twoFaSecret;

    await userService.confirmTwoFaSetup(
      user.id,
      setup.setupToken,
      authenticator.generate(twoFaSecret),
      server,
    );

    const login2Fa = await userService.loginUser(
      { username: data.username, password: data.password },
      server,
    );
    if (!login2Fa || !('message' in login2Fa)) {
      throw new Error('Expected 2FA to be required');
    }

    sessionToken = login2Fa.sessionToken;
  });

  test('Fail to submit incorrect 2FA code', async () => {
    const submissionData = {
      twoFaCode: '000000',
      sessionToken,
    };

    await expect(userService.twoFaSubmission(submissionData, server)).rejects.toThrowError(
      'Invalid token or 2FA code',
    );
  });
});

describe('2FA setting test', () => {
  let userId: number = -1;
  const data: CreateUserRequest = {
    username: 'testuser2',
    password: 'testpassword2',
    email: 'testuser@example.com',
  };

  beforeEach(async () => {
    await dbReset();
    await userService.registerNewUser(data);
    const loginUser = await userService.loginUser(
      { username: data.username, password: data.password },
      server,
    );
    if (!loginUser || 'message' in loginUser) throw new Error('Login failed in beforeEach');
    userId = loginUser.id;
  });

  test('Enable 2FA successfully', async () => {
    const setup = await userService.startTwoFaSetup(userId, server);

    const user = await userService.confirmTwoFaSetup(
      userId,
      setup.setupToken,
      authenticator.generate(setup.twoFaSecret),
      server,
    );

    expect(user).not.toBeNull();
    if (!user) throw new Error('Expected confirmTwoFaSetup to succeed');

    expect(user.id).toBe(userId);
    expect(user.twoFa).toBe(true);
    expect(user.token).toBeDefined();
  });
});

describe('Disable 2FA test', () => {
  let userId: number = -1;

  const data: CreateUserRequest = {
    username: 'testuser-disable-2fa',
    password: 'testpassword',
    email: 'testuser@example.com',
  };

  beforeEach(async () => {
    await dbReset();
    await userService.registerNewUser(data);

    const loginUser = await userService.loginUser(
      { username: data.username, password: data.password },
      server,
    );
    if (!loginUser || 'message' in loginUser) {
      throw new Error('Login failed in beforeEach');
    }

    userId = loginUser.id;

    // enable 2FA first
    const setup = await userService.startTwoFaSetup(userId, server);
    await userService.confirmTwoFaSetup(
      userId,
      setup.setupToken,
      authenticator.generate(setup.twoFaSecret),
      server,
    );
  });

  test('Disable 2FA successfully', async () => {
    const user = await userService.disableTwoFa(userId, 'testpassword', server);

    expect(user.twoFa).toBe(false);
    expect(user.token).toBeDefined();
  });

  test('Fail disabling 2FA with wrong password', async () => {
    await expect(userService.disableTwoFa(userId, 'wrongpassword', server)).rejects.toThrow(
      'Invalid password',
    );
  });
});

describe('Update user password test', () => {
  let userId: number = -1;
  const data: CreateUserRequest = {
    username: 'testuser',
    password: 'testpassword',
    email: 'testuser@example.com',
  };

  beforeEach(async () => {
    await dbReset();
    await userService.registerNewUser(data);
    const loginUser = await userService.loginUser(
      { username: data.username, password: data.password },
      server,
    );
    if (!loginUser || 'message' in loginUser) throw new Error('Login failed in beforeEach');
    userId = loginUser.id;
  });

  test('Update password with correct current password', async () => {
    const updateData = {
      oldPassword: 'testpassword',
      newPassword: 'newtestpassword',
    };

    const updatedUser = await userService.updateUserPassword(userId, updateData, server);
    expect(updatedUser).not.toBeNull();
    if (!updatedUser) throw new Error('Expected updateUserPassword to succeed');

    const loginUser = await userService.loginUser(
      { username: data.username, password: updateData.newPassword },
      server,
    );
    expect(loginUser).not.toBeNull();
    if (!loginUser || 'message' in loginUser) throw new Error('Login failed with new password');
    expect(loginUser.id).toBe(userId);
  });

  test('Returns 403 error when updating password with incorrect current password', async () => {
    const updateData = {
      oldPassword: 'wrongpassword',
      newPassword: 'newtestpassword',
    };

    await expect(userService.updateUserPassword(userId, updateData, server)).rejects.toThrow(
      'Old password is incorrect',
    );
  });

  test('Returns 404 error when updating password for non-existing user', async () => {
    const updateData = {
      oldPassword: 'testpassword',
      newPassword: 'newtestpassword',
    };

    await expect(userService.updateUserPassword(9999, updateData, server)).rejects.toThrow(
      'User not found',
    );
  });

  test('Returns 403 error when updating password for user without password set', async () => {
    await getDb().update(usersTable).set({ passwordHash: null }).where(eq(usersTable.id, userId));
    const updateData = {
      oldPassword: 'testpassword',
      newPassword: 'newtestpassword',
    };

    await expect(userService.updateUserPassword(userId, updateData, server)).rejects.toThrow(
      'Password not set for this user',
    );
  });
});

describe('Get user by ID test', () => {
  let userId: number = -1;
  const data: CreateUserRequest = {
    username: 'testuser',
    password: 'testpassword',
    email: 'testuser@example.com',
  };

  beforeEach(async () => {
    await dbReset();
    const newUser = await userService.registerNewUser(data);
    userId = newUser.id;
  });

  test('Get user successfully by ID', async () => {
    const user = await userService.getUserById(userId);
    expect(user).not.toBeNull();
    if (!user) throw new Error('Expected getUserById to succeed');

    expect(user.username).toBe(data.username);
    expect(user.id).toBe(userId);
    expect(user.twoFa).toBe(false);
    expect('token' in user).toBe(false);
    expect('passwordHash' in user).toBe(false);
    expect('password' in user).toBe(false);
  });

  test('Returns 404 error when getting non-existing user by ID', async () => {
    await expect(userService.getUserById(9999)).rejects.toThrow('User not found');
  });
});

describe('Update user info test', () => {
  let userId: number = -1;
  const data: CreateUserRequest = {
    username: 'testuser',
    password: 'testpassword',
    email: 'testuser@example.com',
  };
  beforeEach(async () => {
    await dbReset();
    const newUser = await userService.registerNewUser(data);
    userId = newUser.id;
  });

  test('Update user info successfully', async () => {
    const updateData = {
      username: 'updateduser',
      email: 'a@a.com',
      avatar:
        'https://camo.githubusercontent.com/5e45bc648dba68520ce949a53690af6bcef2880f84a1d46cbb1636649afd6d84/68747470733a2f2f796176757a63656c696b65722e6769746875622e696f2f73616d706c652d696d616765732f696d6167652d313032312e6a7067',
    };

    const updatedUser = await userService.updateUserInfo(userId, updateData);
    expect(updatedUser).not.toBeNull();
    if (!updatedUser) throw new Error('Expected updateUserInfo to succeed');

    expect(updatedUser.username).toBe(updateData.username);
    expect(updatedUser.id).toBe(userId);
    expect(updatedUser.avatar).toBe(updateData.avatar);
    expect(updatedUser.email).toBe(updateData.email);
    expect('token' in updatedUser).toBe(false);
    expect('passwordHash' in updatedUser).toBe(false);
    expect('password' in updatedUser).toBe(false);
  });

  test('Returns 404 error when updating non-existing user info', async () => {
    const updateData = {
      username: 'updateduser',
      email: 'a@a.com',
      avatar:
        'https://camo.githubusercontent.com/5e45bc648dba68520ce949a53690af6bcef2880f84a1d46cbb1636649afd6d84/68747470733a2f2f796176757a63656c696b65722e6769746875622e696f2f73616d706c652d696d616765732f696d6167652d313032312e6a7067',
    };

    await expect(userService.updateUserInfo(9999, updateData)).rejects.toThrow('User not found');
  });

  test('Returns 400 error when updating user info with a taken username', async () => {
    const anotherUserData: CreateUserRequest = {
      username: 'anotheruser',
      password: 'testpassword',
      email: 'a@b.com',
    };
    await userService.registerNewUser(anotherUserData);
    const updateData = {
      username: 'anotheruser',
      email: 'a@a.com',
      avatar:
        'https://camo.githubusercontent.com/5e45bc648dba68520ce949a53690af6bcef2880f84a1d46cbb1636649afd6d84/68747470733a2f2f796176757a63656c696b65722e6769746875622e696f2f73616d706c652d696d616765732f696d6167652d313032312e6a7067',
    };
    await expect(userService.updateUserInfo(userId, updateData)).rejects.toThrow();
  });

  test('Returns 400 error when updating user info with a taken email', async () => {
    const anotherUserData: CreateUserRequest = {
      username: 'anotheruser',
      password: 'testpassword',
      email: 'a@b.com',
    };
    await userService.registerNewUser(anotherUserData);
    const updateData = {
      username: 'updateduser',
      email: 'a@b.com',
      avatar:
        'https://camo.githubusercontent.com/5e45bc648dba68520ce949a53690af6bcef2880f84a1d46cbb1636649afd6d84/68747470733a2f2f796176757a63656c696b65722e6769746875622e696f2f73616d706c652d696d616765732f696d6167652d313032312e6a7067',
    };
    await expect(userService.updateUserInfo(userId, updateData)).rejects.toThrow();
  });
});

describe('Get users with limited info test', () => {
  beforeEach(async () => {
    await dbReset();
  });

  test('Get users with limited info successfully, empty list', async () => {
    const users = await userService.getUsersWithLimitedInfo();
    expect(users).not.toBeNull();
    expect(users.length).toBe(0);
  });

  test('Get users with limited info successfully, non-empty list', async () => {
    const data1: CreateUserRequest = {
      username: 'user1',
      password: 'password1',
      email: 'testuser@example.com',
    };
    await userService.registerNewUser(data1);
    const users = await userService.getUsersWithLimitedInfo();
    expect(users).not.toBeNull();
    if (!users) throw new Error('Expected getUsersWithLimitedInfo to succeed');
    expect(users.length).toBe(1);
    if (!users[0]) throw new Error('Expected at least one user in the list');
    expect(users[0].username).toBe(data1.username);
    expect('email' in users[0]).toBe(false);
    expect('token' in users[0]).toBe(false);
    expect('passwordHash' in users[0]).toBe(false);
    expect('password' in users[0]).toBe(false);
  });
});

describe('Get user by username with limited info test', () => {
  const data: CreateUserRequest = {
    username: 'testuser',
    password: 'testpassword',
    email: 'testuser@example.com',
  };

  beforeEach(async () => {
    await dbReset();
    await userService.registerNewUser(data);
  });

  test('Get user by username with limited info successfully', async () => {
    const user = await userService.getUserByUsernameWithLimitedInfo(data.username);
    expect(user).not.toBeNull();
    if (!user) throw new Error('Expected getUserByUsernameWithLimitedInfo to succeed');

    expect(user.username).toBe(data.username);
    expect('email' in user).toBe(false);
    expect('token' in user).toBe(false);
    expect('passwordHash' in user).toBe(false);
    expect('password' in user).toBe(false);
  });

  test('Returns 404 error when getting non-existing user by username', async () => {
    await expect(userService.getUserByUsernameWithLimitedInfo('nonexistinguser')).rejects.toThrow(
      'User not found',
    );
  });
});

describe('Get user friends test', () => {
  let user1Id: number;
  let user2Id: number;
  const user1Data: CreateUserRequest = {
    username: 'user1',
    password: 'password',
    email: 'testuser@example.com',
  };
  const user2Data: CreateUserRequest = {
    username: 'user2',
    password: 'password',
    email: 'testuser2@example.com',
  };

  beforeEach(async () => {
    await dbReset();
    const newUser1 = await userService.registerNewUser(user1Data);
    user1Id = newUser1.id;
    const newUser2 = await userService.registerNewUser(user2Data);
    user2Id = newUser2.id;
  });

  test('Get friends successfully (empty list)', async () => {
    const friends = await userService.getUserFriends(user1Id);
    expect(friends).toEqual([]);
  });

  test('Get friends successfully (non-empty list with online/offline status)', async () => {
    await userService.addNewFriend(user1Id, user2Id);
    const friends = await userService.getUserFriends(user1Id);

    expect(friends.length).toBe(1);
    expect(friends[0]?.id).toBe(user2Id);
    expect(friends[0]?.username).toBe(user2Data.username);
    expect(friends[0]?.online).toBe(false); // No heartbeat, so offline
  });

  test('Get friends for a non-existing user should return empty list', async () => {
    const friends = await userService.getUserFriends(9999);
    expect(friends).toEqual([]);
  });
});

describe('Add new friend test', () => {
  let user1Id: number;
  let user2Id: number;
  const user1Data: CreateUserRequest = {
    username: 'user1',
    password: 'password',
    email: 'testuser@example.com',
  };
  const user2Data: CreateUserRequest = {
    username: 'user2',
    password: 'password',
    email: 'testuser2@example.com',
  };

  beforeEach(async () => {
    await dbReset();
    const newUser1 = await userService.registerNewUser(user1Data);
    user1Id = newUser1.id;
    const newUser2 = await userService.registerNewUser(user2Data);
    user2Id = newUser2.id;
  });

  test('Add a friend successfully', async () => {
    await userService.addNewFriend(user1Id, user2Id);
    const friends = await userService.getUserFriends(user1Id);
    expect(friends.length).toBe(1);
    expect(friends[0]?.id).toBe(user2Id);
  });

  test('Add a friend that already exists (should be idempotent)', async () => {
    await userService.addNewFriend(user1Id, user2Id);
    await userService.addNewFriend(user1Id, user2Id); // Add again
    const friends = await userService.getUserFriends(user1Id);
    expect(friends.length).toBe(1); // Should still be 1
  });

  test('Add a non-existing user as a friend should throw 404', async () => {
    await expect(userService.addNewFriend(user1Id, 9999)).rejects.toThrow('Friend user not found');
  });

  test('Add self as a friend should throw 403', async () => {
    await expect(userService.addNewFriend(user1Id, user1Id)).rejects.toThrow(
      'Cannot add yourself as a friend',
    );
  });
});

describe('Delete user test', () => {
  let user1Id: number;
  let user2Id: number;
  const user1Data: CreateUserRequest = {
    username: 'delete_me',
    password: 'password',
    email: 'deleteme@example.com',
  };
  const user2Data: CreateUserRequest = {
    username: 'delete_friend',
    password: 'password',
    email: 'deletefriend@example.com',
  };

  beforeEach(async () => {
    await dbReset();
    const newUser1 = await userService.registerNewUser(user1Data);
    user1Id = newUser1.id;
    const newUser2 = await userService.registerNewUser(user2Data);
    user2Id = newUser2.id;
  });

  test('Deletes user and related records', async () => {
    const loginResult = await userService.loginUser(
      { username: user1Data.username, password: user1Data.password },
      server,
    );
    if (!('token' in loginResult)) throw new Error('Expected login to return a token');

    await userService.addNewFriend(user1Id, user2Id);
    await userService.addNewFriend(user2Id, user1Id);

    await getDb().insert(heartbeatTable).values({ userId: user1Id });

    const tokensBefore = await getDb()
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.userId, user1Id))
      .all();
    expect(tokensBefore.length).toBeGreaterThan(0);

    await userService.deleteUser(user1Id);

    const deletedUser = await getDb()
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user1Id))
      .get();
    expect(deletedUser).toBeUndefined();

    const remainingTokens = await getDb()
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.userId, user1Id))
      .all();
    expect(remainingTokens).toHaveLength(0);

    const remainingFriends = await getDb()
      .select()
      .from(friendsTable)
      .where(or(eq(friendsTable.userId, user1Id), eq(friendsTable.friendId, user1Id)))
      .all();
    expect(remainingFriends).toHaveLength(0);

    const remainingHeartbeat = await getDb()
      .select()
      .from(heartbeatTable)
      .where(eq(heartbeatTable.userId, user1Id))
      .all();
    expect(remainingHeartbeat).toHaveLength(0);

    const stillExistingUser = await getDb()
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user2Id))
      .get();
    expect(stillExistingUser).toBeDefined();

    const user2Friends = await userService.getUserFriends(user2Id);
    expect(user2Friends).toEqual([]);
  });

  test('Deleting non-existing user is a no-op', async () => {
    await expect(userService.deleteUser(9999)).resolves.toBeUndefined();
  });
});

describe('Google OAuth test', () => {
  test('googleOAuthHandler returns a valid URL', () => {
    const url = userService.googleOAuthHandler(server);
    expect(typeof url).toBe('string');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
  });

  describe('googleOAuthCallbackHandler', () => {
    const code = 'test-code';
    let state: string;
    let query: { code: string; state: string };
    const googleUser = {
      id: 'test-google-id',
      email: 'test@gmail.com',
      name: 'testuser',
      picture: 'test-picture',
    };

    let mockReply: { log: { warn: ReturnType<typeof vi.fn> } };

    beforeEach(async () => {
      await dbReset();
      state = server.signOauthStateToken();
      query = { code, state };
      mockReply = { log: { warn: vi.fn() } };
      vi.spyOn(global, 'fetch').mockRestore();
    });

    test('should link to an existing user by email and return a token', async () => {
      await userService.registerNewUser({
        username: 'existinguser',
        password: 'password',
        email: googleUser.email,
      });

      vi.spyOn(global, 'fetch')
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'test-token' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        )
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify(googleUser), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        );

      const { token, error } = await userService.googleOAuthCallbackHandler(
        query,
        server,
        // @ts-expect-error FastifyReply is not fully compatible with the mock reply
        mockReply,
      );

      expect(token).toBeDefined();
      expect(error).toBeUndefined();
      const user = await getDb()
        .select()
        .from(usersTable)
        .where(eq(usersTable.googleOauthId, googleUser.id))
        .get();
      expect(user).toBeDefined();
      expect(user?.username).toBe('existinguser');
      expect(user?.googleOauthId).toBe(googleUser.id);
    });

    test('should return an error if email is linked to another user', async () => {
      await userService.registerNewUser({
        username: 'existinguser',
        password: 'password',
        email: 'test@gmail.com',
      });
      await getDb()
        .update(usersTable)
        .set({ googleOauthId: 'another-google-id' })
        .where(eq(usersTable.username, 'existinguser'));

      vi.spyOn(global, 'fetch')
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'test-token' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        )
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify(googleUser), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        );

      const { error, token } = await userService.googleOAuthCallbackHandler(
        query,
        server,
        // @ts-expect-error FastifyReply is not fully compatible with the mock reply
        mockReply,
      );
      expect(error).toBe('Email is already linked to another Google account');
      expect(token).toBeUndefined();
    });

    test('should create a new user and return a token', async () => {
      vi.spyOn(global, 'fetch')
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'test-token' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        )
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify(googleUser), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        );

      const { token, error } = await userService.googleOAuthCallbackHandler(
        query,
        server,
        // @ts-expect-error FastifyReply is not fully compatible with the mock reply
        mockReply,
      );

      expect(token).toBeDefined();
      expect(error).toBeUndefined();
      const user = await getDb()
        .select()
        .from(usersTable)
        .where(eq(usersTable.googleOauthId, googleUser.id))
        .get();
      expect(user).toBeDefined();
      expect(user?.username).toBe(`google_${googleUser.id.slice(0, 8)}`);
      expect(user?.googleOauthId).toBe(googleUser.id);
    });

    test('should return a token for an existing user with a googleOauthId', async () => {
      vi.spyOn(global, 'fetch')
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'test-token' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        )
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify(googleUser), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        );

      await getDb()
        .insert(usersTable)
        .values({
          username: 'olduser',
          googleOauthId: googleUser.id,
          email: googleUser.email,
        })
        .returning()
        .get();

      const { token, error } = await userService.googleOAuthCallbackHandler(
        query,
        server,
        // @ts-expect-error FastifyReply is not fully compatible with the mock reply
        mockReply,
      );

      expect(token).toBeDefined();
      expect(error).toBeUndefined();
      const user = await getDb()
        .select()
        .from(usersTable)
        .where(eq(usersTable.googleOauthId, googleUser.id))
        .get();
      expect(user).toBeDefined();
      expect(user?.username).toBe('olduser');
    });

    test('should return an error if state token is invalid', async () => {
      // eslint-disable-next-line @typescript-eslint/require-await
      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return new Response('Not Found', { status: 404 });
      });

      const invalidQuery = { code, state: 'invalid-state-token' };
      const { error, token } = await userService.googleOAuthCallbackHandler(
        invalidQuery,
        server,
        // @ts-expect-error FastifyReply is not fully compatible with the mock reply
        mockReply,
      );
      expect(error).toBe('Invalid state');
      expect(token).toBeUndefined();
      expect(mockReply.log.warn).toHaveBeenCalledWith('Invalid Google OAuth state token');
    });

    test('should return an error if token exchange fails', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(new Response('Error', { status: 401 })),
      );

      const { error, token } = await userService.googleOAuthCallbackHandler(
        query,
        server,
        // @ts-expect-error FastifyReply is not fully compatible with the mock reply
        mockReply,
      );
      expect(error).toBe('Failed to exchange code for token');
      expect(token).toBeUndefined();
      expect(mockReply.log.warn).toHaveBeenCalledWith('Google OAuth token exchange failed: Error');
    });

    test('should return an error if user info fetch fails', async () => {
      vi.spyOn(global, 'fetch')
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'test-token' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        )
        .mockImplementationOnce(() => Promise.resolve(new Response('Error', { status: 401 })));

      const { error, token } = await userService.googleOAuthCallbackHandler(
        query,
        server,
        // @ts-expect-error FastifyReply is not fully compatible with the mock reply
        mockReply,
      );
      expect(error).toBe('Failed to fetch user info from Google');
      expect(token).toBeUndefined();
      expect(mockReply.log.warn).toHaveBeenCalledWith(
        'Failed to fetch user info from Google: Error',
      );
    });

    test('should return an error if user info data is invalid', async () => {
      vi.spyOn(global, 'fetch')
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'test-token' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        )
        .mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify({ invalid: 'data' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        );

      const { error, token } = await userService.googleOAuthCallbackHandler(
        query,
        server,
        // @ts-expect-error FastifyReply is not fully compatible with the mock reply
        mockReply,
      );
      expect(error).toBe('Invalid user data received from Google');
      expect(token).toBeUndefined();
      expect(mockReply.log.warn).toHaveBeenCalledWith('Invalid user data received from Google');
    });
  });
});

describe('Validate avatar URL test', () => {
  test('Valid image URL within size limit', async () => {
    const validImageUrl =
      'https://camo.githubusercontent.com/5e45bc648dba68520ce949a53690af6bcef2880f84a1d46cbb1636649afd6d84/68747470733a2f2f796176757a63656c696b65722e6769746875622e696f2f73616d706c652d696d616765732f696d6167652d313032312e6a7067';
    const isValid = await userService.validateAvatarUrl(validImageUrl, 200 * 1024);
    expect(isValid).toBe(true);
  });

  test('Invalid image URL (non-image content type)', async () => {
    const invalidImageUrl = 'https://example.com'; // Non-image URL
    const isValid = await userService.validateAvatarUrl(invalidImageUrl, 200 * 1024);
    expect(isValid).toBe(false);
  });

  test('Image URL exceeding size limit', async () => {
    const largeImageUrl =
      'https://camo.githubusercontent.com/5e45bc648dba68520ce949a53690af6bcef2880f84a1d46cbb1636649afd6d84/68747470733a2f2f796176757a63656c696b65722e6769746875622e696f2f73616d706c652d696d616765732f696d6167652d313032312e6a7067';
    const isValid = await userService.validateAvatarUrl(largeImageUrl, 100 * 1024); // 100 KB limit
    expect(isValid).toBe(false);
  });

  test('Non-existent URL', async () => {
    const nonExistentUrl = 'https://nonexistent.example.com/image.png';
    const isValid = await userService.validateAvatarUrl(nonExistentUrl, 200 * 1024);
    expect(isValid).toBe(false);
  });
});
