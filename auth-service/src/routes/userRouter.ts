import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as z from 'zod';
import config from '../config/config.js';
import {
  AddNewFriendRequestSchema,
  CreateUserSchema,
  FriendResponseSchema,
  GetFriendsResponseSchema,
  GoogleOAuthCallbackSchema,
  LoginUserByEmailRequestSchema,
  LoginUserByIdentifierRequestSchema,
  LoginUserRequestSchema,
  SimpleUserResponseSchema,
  TwoFaChallengeRequestSchema,
  TwoFaConfirmRequestSchema,
  TwoFaDisableRequestSchema,
  TwoFaPendingUserResponseSchema,
  TwoFaSetupResponseSchema,
  UpdateUserPasswordRequestSchema,
  UpdateUserRequestSchema,
  UsernameRequestSchema,
  UserValidationResponseSchema,
  UserWithoutTokenResponseSchema,
  UserWithTokenResponseSchema,
} from '../schemas/userSchema.js';
import userService from '../services/userService.js';

export const userRouter = (server: FastifyInstance) => {
  // Create User
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/',
    schema: {
      body: CreateUserSchema,
      response: { 201: UserWithoutTokenResponseSchema },
    },
    handler: async (request, reply) => {
      const newUser = await userService.registerNewUser(request.body);
      reply.status(201).send(newUser);
    },
  });

  // Login User
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/login',
    schema: {
      body: LoginUserRequestSchema,
      response: {
        200: UserWithTokenResponseSchema,
        428: TwoFaPendingUserResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const response = await userService.loginUser(request.body, server);

      const isTwoFaRequired = 'message' in response && response.message === '2FA_REQUIRED';
      if (isTwoFaRequired) return reply.status(428).send(response);

      reply.send(response);
    },
  });

  // Login User by Email
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/login/email',
    schema: {
      body: LoginUserByEmailRequestSchema,
      response: {
        200: UserWithTokenResponseSchema,
        428: TwoFaPendingUserResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const response = await userService.loginUserByEmail(request.body, server);

      const isTwoFaRequired = 'message' in response && response.message === '2FA_REQUIRED';
      if (isTwoFaRequired) return reply.status(428).send(response);

      reply.send(response);
    },
  });

  //Login User by either username or email
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/loginByIdentifier',
    schema: {
      body: LoginUserByIdentifierRequestSchema,
      response: {
        200: UserWithTokenResponseSchema,
        428: TwoFaPendingUserResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const body = request.body;
      const isEmailLogin = body.identifier.includes('@');

      const response = isEmailLogin
        ? await userService.loginUserByEmail(
            { email: body.identifier, password: body.password },
            server,
          )
        : await userService.loginUser(
            { username: body.identifier, password: body.password },
            server,
          );

      const isTwoFaRequired = 'message' in response && response.message === '2FA_REQUIRED';
      if (isTwoFaRequired) return reply.status(428).send(response);

      reply.send(response);
    },
  });

  // 2FA Submission
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/2fa',
    schema: {
      body: TwoFaChallengeRequestSchema,
      response: { 200: UserWithTokenResponseSchema },
    },
    handler: async (request, reply) => {
      const user = await userService.twoFaSubmission(request.body, server);
      reply.send(user);
    },
  });

  // Start 2FA setup
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/2fa/setup',
    schema: {
      response: { 200: TwoFaSetupResponseSchema },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      if (!request.userId) throw new Error('User ID not found in request');

      const result = await userService.startTwoFaSetup(request.userId, server);
      reply.send(result);
    },
  });

  // Confirm 2FA setup
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/2fa/confirm',
    schema: {
      body: TwoFaConfirmRequestSchema,
      response: { 200: UserWithTokenResponseSchema },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      if (!request.userId) throw new Error('User ID not found in request');

      const user = await userService.confirmTwoFaSetup(
        request.userId,
        request.body.setupToken,
        request.body.twoFaCode,
        server,
      );

      reply.send(user);
    },
  });

  // Disable 2FA
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/2fa/disable',
    schema: {
      body: TwoFaDisableRequestSchema,
      response: { 200: UserWithTokenResponseSchema },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      if (!request.userId) throw new Error('User ID not found in request');

      const user = await userService.disableTwoFa(request.userId, request.body.password, server);

      reply.send(user);
    },
  });

  // Update Password
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/password',
    schema: {
      body: UpdateUserPasswordRequestSchema,
      response: { 200: UserWithTokenResponseSchema },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      const userId = request.userId;
      if (!userId) throw new Error('User ID not found in request');

      const updatedUser = await userService.updateUserPassword(userId, request.body, server);

      reply.send(updatedUser);
    },
  });

  // Me
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/me',
    schema: {
      response: { 200: UserWithoutTokenResponseSchema },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      const userId = request.userId;
      if (!userId) throw new Error('User ID not found in request');

      const user = await userService.getUserById(userId);
      reply.send(user);
    },
  });

  // Update Me
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/me',
    schema: {
      body: UpdateUserRequestSchema,
      response: { 200: UserWithoutTokenResponseSchema },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      const userId = request.userId;
      if (!userId) throw new Error('User ID not found in request');

      const user = await userService.updateUserInfo(userId, request.body);
      reply.send(user);
    },
  });

  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/me',
    schema: {
      response: { 204: z.null() },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      const userId = request.userId;
      if (!userId) throw new Error('User ID not found in request');

      await userService.deleteUser(userId);
      reply.status(204).send();
    },
  });

  // Get Users with Limited Info
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/',
    schema: {
      response: { 200: z.array(SimpleUserResponseSchema) },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      if (!request.userId) throw new Error('User ID not found in request');

      const users = await userService.getUsersWithLimitedInfo();
      reply.send(users);
    },
  });

  // Get User by username with Limited Info
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/:username',
    schema: {
      params: UsernameRequestSchema,
      response: { 200: SimpleUserResponseSchema },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      if (!request.userId) throw new Error('User ID not found in request');

      const user = await userService.getUserByUsernameWithLimitedInfo(request.params.username);
      reply.send(user);
    },
  });

  // Get Friends
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/friends',
    schema: {
      response: { 200: GetFriendsResponseSchema },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      if (!request.userId) throw new Error('User ID not found in request');

      const friends = await userService.getUserFriends(request.userId);
      reply.send(friends);
    },
  });

  // Add a new friend
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/friends',
    schema: {
      body: AddNewFriendRequestSchema,
      response: { 201: FriendResponseSchema },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      if (!request.userId) throw new Error('User ID not found in request');

      await userService.addNewFriend(request.userId, request.body.userId);
      reply.code(201).send();
    },
  });

  // Validate User (for internal use)
  // TODO: we may add a header token to secure this endpoint
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/validate',
    schema: {
      response: { 200: UserValidationResponseSchema },
    },
    config: { auth: 'mandatory' },
    handler: async (request, reply) => {
      if (!request.userId) throw new Error('User ID not found in request');
      reply.send({ userId: request.userId });
    },
  });

  // Google OAuth
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/google/login',
    handler: async (_request, reply) => {
      const url = userService.googleOAuthHandler(server);
      reply.redirect(url);
    },
  });

  // Google OAuth Callback
  server.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/google/callback',
    schema: {
      querystring: GoogleOAuthCallbackSchema,
    },
    handler: async (request, reply) => {
      const { token, error } = await userService.googleOAuthCallbackHandler(
        request.query,
        server,
        reply,
      );
      const returnQuery = error ? `?error=${error}` : `?token=${token}`;
      reply.redirect(`${config.frontendUrl}/oauth/google/callback${returnQuery}`);
    },
  });
};
