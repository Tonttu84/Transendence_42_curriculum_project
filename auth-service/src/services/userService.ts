import bcrypt from 'bcrypt';
import { eq, gt, or } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { authenticator } from 'otplib';
import config from '../config/config.js';
import getDb from '../db/db.js';
import { friendsTable, heartbeatTable, tokensTable, usersTable } from '../db/schema.js';
import type { NewUser } from '../db/types.js';
import { Error400, Error401, Error403, Error404 } from '../errors/AppError.js';
import type {
  CreateUserRequest,
  FriendResponse,
  GoogleOAuthCallback,
  LoginUserByEmailRequest,
  LoginUserRequest,
  SimpleUserResponse,
  TwoFaChallengeRequest,
  TwoFaSetupResponse,
  UpdateUserPasswordRequest,
  UpdateUserRequest,
  UserWithoutTokenResponse,
  UserWithTokenOptionalTwoFaResponse,
  UserWithTokenResponse,
} from '../schemas/types.js';
import {
  GoogleUserDataSchema,
  JWTPayloadSchema,
  TwoFaSetupJwtPayloadSchema,
} from '../schemas/userSchema.js';

const SALT_ROUNDS = 10;
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const MAX_AVATAR_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const validateAvatarUrl = async (url: string, maxBytes: number): Promise<boolean> => {
  if (!url) return false;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return false;
    const contentType = response.headers.get('content-type');
    if (!contentType || !allowedImageTypes.includes(contentType)) return false;
    const contentLength = response.headers.get('content-length');
    if (!contentLength || parseInt(contentLength) > maxBytes) return false;

    return true;
  } catch {
    return false;
  }
};

const registerNewUser = async (newUser: CreateUserRequest): Promise<UserWithoutTokenResponse> => {
  const { password, ...rest } = newUser;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  if (rest.avatar && !(await validateAvatarUrl(rest.avatar, MAX_AVATAR_SIZE_BYTES)))
    throw new Error400('Invalid avatar URL or file size too large');

  const newUserToDb: NewUser = { ...rest, passwordHash };

  const {
    passwordHash: rPHash,
    twoFaToken,
    ...newUserFromDb
  } = await getDb().insert(usersTable).values(newUserToDb).returning().get();

  void rPHash;
  return { ...newUserFromDb, twoFa: twoFaToken ? true : false };
};

const getUserAfterVerificatePassword = async (
  loginUser: LoginUserRequest | LoginUserByEmailRequest,
): Promise<UserWithoutTokenResponse & { twoFaToken: string | null }> => {
  const whereClause =
    'username' in loginUser
      ? eq(usersTable.username, loginUser.username)
      : eq(usersTable.email, loginUser.email);

  const user = await getDb().select().from(usersTable).where(whereClause).get();

  if (!user || !user.passwordHash) throw new Error401('Invalid username or password');

  const { passwordHash, twoFaToken, ...rest } = user;

  const isPasswordValid = await bcrypt.compare(loginUser.password, passwordHash);
  if (!isPasswordValid) throw new Error401('Invalid username or password');

  return { ...rest, twoFa: twoFaToken ? true : false, twoFaToken };
};

const issueNewToken = async (
  userId: number,
  service: FastifyInstance,
  revokePreviousTokens: boolean = false,
): Promise<string> => {
  if (revokePreviousTokens) await getDb().delete(tokensTable).where(eq(tokensTable.userId, userId));

  const token = service.signAccessToken(userId);
  await getDb().insert(tokensTable).values({ userId, token });

  return token;
};

const loginUserHelper = async (
  loginUser: LoginUserRequest | LoginUserByEmailRequest,
  service: FastifyInstance,
): Promise<UserWithTokenOptionalTwoFaResponse> => {
  const userWithoutTokenWithTwoFa = await getUserAfterVerificatePassword(loginUser);

  if (!userWithoutTokenWithTwoFa.twoFa) {
    const token = await issueNewToken(userWithoutTokenWithTwoFa.id, service, true);
    const { ...userWithoutToken } = userWithoutTokenWithTwoFa;
    return { ...userWithoutToken, token };
  }

  if (!userWithoutTokenWithTwoFa.twoFaToken) {
    throw new Error('2FA is enabled but no 2FA token found for the user');
  }

  return {
    message: '2FA_REQUIRED',
    twoFaUrl: config.twoFaUrlPrefix,
    twoFaSecret: userWithoutTokenWithTwoFa.twoFaToken,
    sessionToken: service.signTwoFaToken(userWithoutTokenWithTwoFa.id),
  };
};

const loginUser = async (
  loginUser: LoginUserRequest,
  service: FastifyInstance,
): Promise<UserWithTokenOptionalTwoFaResponse> => {
  return loginUserHelper(loginUser, service);
};

const loginUserByEmail = async (
  loginUser: LoginUserByEmailRequest,
  service: FastifyInstance,
): Promise<UserWithTokenOptionalTwoFaResponse> => {
  return loginUserHelper(loginUser, service);
};

const twoFaSubmission = async (
  twoFaRequest: TwoFaChallengeRequest,
  service: FastifyInstance,
): Promise<UserWithTokenResponse> => {
  let userId: number = -1;
  try {
    const decoded = JWTPayloadSchema.parse(service.jwt.verify(twoFaRequest.sessionToken));
    if (decoded.type !== '2FA') throw new Error();
    userId = decoded.userId;
  } catch {
    throw new Error401('Invalid token or 2FA code');
  }

  const user = await getDb().select().from(usersTable).where(eq(usersTable.id, userId)).get();

  if (!user) throw new Error404('User not found');
  const { passwordHash, twoFaToken, ...rest } = user;
  if (!twoFaToken) throw new Error403('2FA is not enabled for this user');

  try {
    const isValid = authenticator.check(twoFaRequest.twoFaCode, twoFaToken);
    if (!isValid) throw new Error401('Invalid token or 2FA code');
  } catch {
    throw new Error401('Invalid token or 2FA code');
  }

  void passwordHash;

  const token = await issueNewToken(user.id, service, true);
  return { ...rest, token, twoFa: twoFaToken ? true : false };
};

//Enable 2FA flow
const startTwoFaSetup = async (
  userId: number,
  service: FastifyInstance,
): Promise<TwoFaSetupResponse> => {
  const user = await getDb().select().from(usersTable).where(eq(usersTable.id, userId)).get();

  if (!user) throw new Error404('User not found');
  if (user.twoFaToken) throw new Error403('2FA is already enabled for this user');
  if (!user.passwordHash) throw new Error403('Password is required to enable 2FA');

  const secret = authenticator.generateSecret();
  const setupToken = service.signTwoFaSetupToken(user.id, secret);

  return { twoFaSecret: secret, setupToken };
};

const confirmTwoFaSetup = async (
  userId: number,
  setupToken: string,
  twoFaCode: string,
  service: FastifyInstance,
): Promise<UserWithTokenResponse> => {
  let secret = '';
  try {
    const decoded = TwoFaSetupJwtPayloadSchema.parse(service.jwt.verify(setupToken));

    if (decoded.type !== '2FA_SETUP' || decoded.userId !== userId) throw new Error();

    const isValid = authenticator.check(twoFaCode, decoded.secret);
    if (!isValid) throw new Error();

    secret = decoded.secret;
  } catch {
    throw new Error401('Invalid or expired 2FA setup token or validation code');
  }

  // Persist the verified secret
  const updatedUser = await getDb()
    .update(usersTable)
    .set({ twoFaToken: secret })
    .where(eq(usersTable.id, userId))
    .returning()
    .get();

  if (!updatedUser) throw new Error404('User not found');

  const { passwordHash, ...rest } = updatedUser;
  void passwordHash;

  const token = await issueNewToken(userId, service, true);

  return { ...rest, token, twoFa: true };
};

const disableTwoFa = async (
  userId: number,
  password: string,
  service: FastifyInstance,
): Promise<UserWithTokenResponse> => {
  const user = await getDb().select().from(usersTable).where(eq(usersTable.id, userId)).get();

  if (!user) throw new Error404('User not found');
  if (!user.twoFaToken) throw new Error403('2FA is not enabled for this user');
  if (!user.passwordHash) throw new Error403('Password not set for this user');

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) throw new Error403('Invalid password');

  const updatedUser = await getDb()
    .update(usersTable)
    .set({ twoFaToken: null })
    .where(eq(usersTable.id, userId))
    .returning()
    .get();

  if (!updatedUser) throw new Error404('User not found after update');

  const { passwordHash, ...rest } = updatedUser;
  void passwordHash;

  // Rotate tokens for security
  const token = await issueNewToken(userId, service, true);

  return { ...rest, token, twoFa: false };
};

const updateUserPassword = async (
  userId: number,
  request: UpdateUserPasswordRequest,
  service: FastifyInstance,
): Promise<UserWithTokenResponse> => {
  const user = await getDb().select().from(usersTable).where(eq(usersTable.id, userId)).get();
  if (!user) throw new Error404('User not found');
  if (!user.passwordHash) throw new Error403('Password not set for this user');

  const isOldPasswordValid = await bcrypt.compare(request.oldPassword, user.passwordHash);
  if (!isOldPasswordValid) throw new Error403('Old password is incorrect');

  const newPasswordHash = await bcrypt.hash(request.newPassword, SALT_ROUNDS);

  const updatedUser = await getDb()
    .update(usersTable)
    .set({ passwordHash: newPasswordHash })
    .where(eq(usersTable.id, userId))
    .returning()
    .get();

  if (!updatedUser) throw new Error404('User not found after update');

  const { passwordHash, twoFaToken, ...rest } = updatedUser;
  void passwordHash;

  const token = await issueNewToken(updatedUser.id, service, true);
  return { ...rest, token, twoFa: twoFaToken ? true : false };
};

const getUserById = async (userId: number): Promise<UserWithoutTokenResponse> => {
  const user = await getDb().select().from(usersTable).where(eq(usersTable.id, userId)).get();
  if (!user) throw new Error404('User not found');

  const { passwordHash, twoFaToken, ...rest } = user;
  void passwordHash;

  return { ...rest, twoFa: twoFaToken ? true : false };
};

const updateUserInfo = async (
  userId: number,
  updateData: UpdateUserRequest,
): Promise<UserWithoutTokenResponse> => {
  if (updateData.avatar && !(await validateAvatarUrl(updateData.avatar, MAX_AVATAR_SIZE_BYTES)))
    throw new Error400('Invalid avatar URL or file size too large');

  const updatedUser = await getDb()
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, userId))
    .returning()
    .get();

  if (!updatedUser) throw new Error404('User not found');

  const { passwordHash, twoFaToken, ...rest } = updatedUser;
  void passwordHash;

  return { ...rest, twoFa: twoFaToken ? true : false };
};

const deleteUser = async (userId: number): Promise<void> => {
  // We don't have cascade delete.
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(tokensTable).where(eq(tokensTable.userId, userId));
    await tx
      .delete(friendsTable)
      .where(or(eq(friendsTable.userId, userId), eq(friendsTable.friendId, userId)));
    await tx.delete(heartbeatTable).where(eq(heartbeatTable.userId, userId));
    await tx.delete(usersTable).where(eq(usersTable.id, userId));
  });
};

const getUsersWithLimitedInfo = async (): Promise<Array<SimpleUserResponse>> => {
  const users = await getDb()
    .select({
      id: usersTable.id,
      username: usersTable.username,
      avatar: usersTable.avatar,
    })
    .from(usersTable)
    .all();

  return users;
};

const getUserByUsernameWithLimitedInfo = async (username: string): Promise<SimpleUserResponse> => {
  const user = await getDb()
    .select({
      id: usersTable.id,
      username: usersTable.username,
      avatar: usersTable.avatar,
    })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .get();

  if (!user) throw new Error404('User not found');
  return user;
};

const getUserFriends = async (userId: number): Promise<Array<FriendResponse>> => {
  const friends = await getDb()
    .select({ id: usersTable.id, username: usersTable.username, avatar: usersTable.avatar })
    .from(friendsTable)
    .innerJoin(usersTable, eq(friendsTable.friendId, usersTable.id))
    .where(eq(friendsTable.userId, userId))
    .all();

  const onlineUsers = await getDb()
    .select()
    .from(heartbeatTable)
    .where(gt(heartbeatTable.createdAt, new Date().getTime() - ONLINE_THRESHOLD_MS))
    .all();

  const result = friends.map((friend) => {
    const isOnline = onlineUsers.some((online) => online.userId === friend.id);
    return { ...friend, online: isOnline };
  });

  return result;
};

const addNewFriend = async (userId: number, friendId: number): Promise<void> => {
  if (userId === friendId) {
    throw new Error403('Cannot add yourself as a friend');
  }

  const friendUser = await getDb()
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, friendId))
    .get();
  if (!friendUser) {
    throw new Error404('Friend user not found');
  }

  try {
    await getDb().insert(friendsTable).values({ userId, friendId });
  } catch (error: unknown) {
    const cause = (error as { cause?: unknown })?.cause;
    if (
      cause &&
      typeof cause === 'object' &&
      'code' in cause &&
      cause.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
    )
      return;
    throw error;
  }
};

const googleOAuthHandler = (service: FastifyInstance): string => {
  const state = service.signOauthStateToken();

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.append('client_id', config.googleClientId);
  url.searchParams.append('redirect_uri', config.googleRedirectUri);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('scope', 'openid profile email');
  url.searchParams.append('state', state);

  return url.toString();
};

const googleOAuthCallbackHandler = async (
  query: GoogleOAuthCallback,
  service: FastifyInstance,
  reply: FastifyReply,
): Promise<{ token?: string; error?: string }> => {
  const { code, state } = query;

  // Validate state token
  try {
    const decoded = JWTPayloadSchema.parse(service.jwt.verify(state));
    if (decoded.type !== 'GoogleOAuthState') throw new Error();
  } catch {
    reply.log.warn('Invalid Google OAuth state token');
    return { error: 'Invalid state' };
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      code,
      redirect_uri: config.googleRedirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const msg = await tokenResponse.text();
    reply.log.warn(`Google OAuth token exchange failed: ${msg}`);
    return { error: 'Failed to exchange code for token' };
  }

  // Get user info
  const tokenData = await tokenResponse.json();
  if (typeof tokenData !== 'object' || tokenData === null || !('access_token' in tokenData)) {
    reply.log.warn('Invalid token data received from Google');
    return { error: 'Invalid token data received from Google' };
  }

  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userResponse.ok) {
    const msg = await userResponse.text();
    reply.log.warn(`Failed to fetch user info from Google: ${msg}`);
    return { error: 'Failed to fetch user info from Google' };
  }

  let userData;

  try {
    userData = GoogleUserDataSchema.parse(await userResponse.json());
  } catch {
    reply.log.warn('Invalid user data received from Google');
    return { error: 'Invalid user data received from Google' };
  }

  // If the account with googleOauthId exists, log in
  const userByGoogleId = await getDb()
    .select()
    .from(usersTable)
    .where(eq(usersTable.googleOauthId, userData.id))
    .get();

  if (userByGoogleId) {
    const token = await issueNewToken(userByGoogleId.id, service, true);
    return { token };
  }

  // Or if the account with the same email exists:
  const userByEmail = await getDb()
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, userData.email))
    .get();

  if (userByEmail) {
    if (userByEmail.googleOauthId)
      return { error: 'Email is already linked to another Google account' };

    // Link Google account
    const updatedUser = await getDb()
      .update(usersTable)
      .set({ googleOauthId: userData.id, avatar: userData.picture })
      .where(eq(usersTable.id, userByEmail.id))
      .returning()
      .get();

    if (!updatedUser) {
      reply.log.error('Failed to link Google account');
      return { error: 'Failed to link Google account' };
    }

    const token = await issueNewToken(updatedUser.id, service, true);
    return { token };
  }

  // Otherwise, create a new user
  const newUser: NewUser = {
    username: `google_${userData.id.slice(0, 8)}`,
    email: userData.email,
    avatar: userData.picture,
    googleOauthId: userData.id,
  };

  const createdUser = await getDb().insert(usersTable).values(newUser).returning().get();
  const token = await issueNewToken(createdUser.id, service, true);
  return { token };
};

export default {
  registerNewUser,
  loginUser,
  loginUserByEmail,
  twoFaSubmission,
  startTwoFaSetup,
  confirmTwoFaSetup,
  disableTwoFa,
  updateUserPassword,
  getUserById,
  updateUserInfo,
  deleteUser,
  getUsersWithLimitedInfo,
  getUserByUsernameWithLimitedInfo,
  getUserFriends,
  addNewFriend,
  googleOAuthHandler,
  googleOAuthCallbackHandler,
  validateAvatarUrl,
};
