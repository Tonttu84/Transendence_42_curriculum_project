import * as z from 'zod';
import config from '../config/config.js';

const isAlphaNumericLegalSymbols = (val: string): boolean => /^[a-z0-9,.#$%@^;|_!*&?]+$/i.test(val);

// For user CRUD
const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(50)
  .refine((v) => !/\s/.test(v), {
    message: 'Username cannot contain spaces',
  })
  .refine((v) => /^[a-zA-Z0-9._-]+$/.test(v), {
    message: 'Username may only contain letters, numbers, ".", "_" or "-"',
  });

const passwordSchema = z.string().trim().min(3).max(20).refine(isAlphaNumericLegalSymbols, {
  error: 'Password may only contain letters, numbers, and the following symbols: ,.#$%@^;|_!*&?',
});

export const UserSchema = z.object({
  username: usernameSchema,
  email: z.email().trim(),
  avatar: z.string().trim().nullish(),
});

export const CreateUserSchema = z.object({
  ...UserSchema.shape,
  password: passwordSchema,
});

export const UpdateUserPasswordRequestSchema = z.object({
  oldPassword: passwordSchema,
  newPassword: passwordSchema,
});

export const LoginUserRequestSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const LoginUserByEmailRequestSchema = z.object({
  email: z.email().trim(),
  password: passwordSchema,
});

export const LoginUserByIdentifierRequestSchema = z.object({
  identifier: z.union([usernameSchema, z.email().trim()]),
  password: passwordSchema,
});

const responseAdditionalFields = z.object({
  id: z.int(),
  twoFa: z.boolean(),
  email: z.email().trim(),
  googleOauthId: z.string().trim().nullish(),
  createdAt: z.number(),
});

export const UserWithTokenResponseSchema = z.object({
  ...UserSchema.shape,
  ...responseAdditionalFields.shape,
  token: z.string(),
});

export const UpdateUserRequestSchema = UserSchema;

export const UserWithoutTokenResponseSchema = z.object({
  ...UserSchema.shape,
  ...responseAdditionalFields.shape,
});

export const UsernameRequestSchema = z.object({
  username: usernameSchema,
});

export const SimpleUserResponseSchema = z.object({
  id: z.int(),
  username: usernameSchema,
  avatar: z.string().trim().nullable(),
});

export const UsersResponseSchema = z.array(UserWithoutTokenResponseSchema);

// For Two-factor authentication

// 2FA setup
export const TwoFaSetupResponseSchema = z.object({
  twoFaSecret: z.string(),
  setupToken: z.string(),
});

// 2FA confirm
export const TwoFaConfirmRequestSchema = z.object({
  twoFaCode: z.string().min(6).max(6),
  setupToken: z.string(),
});

export const SetTwoFaRequestSchema = z.object({
  twoFa: z.boolean(),
});

// Disable 2FA
export const TwoFaDisableRequestSchema = z.object({
  password: passwordSchema,
});

export const TwoFaChallengeRequestSchema = z.object({
  twoFaCode: z.string(),
  sessionToken: z.string(),
});

export const TwoFaPendingUserResponseSchema = z.object({
  message: z.literal('2FA_REQUIRED'),
  twoFaSecret: z.string(),
  twoFaUrl: z.literal(config.twoFaUrlPrefix),
  sessionToken: z.string(),
});

export const UserWithTokenOptionalTwoFaResponseSchema = z.union([
  UserWithTokenResponseSchema, // 2FA not Required
  TwoFaPendingUserResponseSchema, // 2FA challenge
]);

//
// For Friends
//

export const FriendResponseSchema = z.object({
  ...SimpleUserResponseSchema.shape,
  online: z.boolean(),
});

export const AddNewFriendRequestSchema = z.object({
  userId: z.int(),
});

export const GetFriendsResponseSchema = z.array(FriendResponseSchema);

//
// For JWT Payloads
//

export const UserJwtPayloadSchema = z.object({
  jti: z.uuid(),
  userId: z.int(),
  type: z.literal('USER'),
});

export const OauthStateJwtPayloadSchema = z.object({
  jti: z.uuid(),
  type: z.literal('GoogleOAuthState'),
});

export const TwoFaSetupJwtPayloadSchema = z.object({
  jti: z.uuid(),
  userId: z.int(),
  secret: z.string(),
  type: z.literal('2FA_SETUP'),
});

export const TwoFaJwtPayloadSchema = z.object({
  jti: z.uuid(),
  userId: z.int(),
  type: z.literal('2FA'),
});

export const JWTPayloadSchema = z.union([
  UserJwtPayloadSchema,
  OauthStateJwtPayloadSchema,
  TwoFaJwtPayloadSchema,
  TwoFaSetupJwtPayloadSchema,
]);

//
// For Game Service
//
export const UserValidationResponseSchema = z.object({
  userId: z.int(),
});

//
// For Google OAuth
//

export const GoogleOAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const GoogleUserDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email().trim(),
  picture: z.string().optional(),
});

// For errors
export const ErrorResponseSchema = z.object({
  error: z.string(),
});
