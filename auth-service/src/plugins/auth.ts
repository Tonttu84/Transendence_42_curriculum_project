import fastifyJwt from '@fastify/jwt';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import config from '../config/config.js';
import getDb from '../db/db.js';
import { heartbeatTable, tokensTable } from '../db/schema.js';
import type {
  OauthStateJwtPayload,
  TwoFaJwtPayload,
  TwoFaSetupJwtPayload,
  UserJwtPayload,
} from '../schemas/types.js';
import { JWTPayloadSchema } from '../schemas/userSchema.js';

export interface AuthPluginOptions {
  jwtSecret: string;
}

export const authOptionValues = ['mandatory', 'optional', 'none'] as const;
export type AuthOption = (typeof authOptionValues)[number];

// Validate token existence && userId match
const validateTokenFromDb = async (
  request: FastifyRequest,
  userId: number,
): Promise<number | null> => {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  try {
    const saved = await getDb()
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.token, token))
      .get();

    return saved?.userId === userId ? userId : null;
  } catch {
    return null;
  }
};

const auth = fp(
  (server: FastifyInstance) => {
    server.register(fastifyJwt, {
      secret: config.jwtSecret,
      sign: { expiresIn: '15m' }, // Default expiry
    });

    // Token generators

    server.decorate('signAccessToken', (userId: number) =>
      server.jwt.sign({ userId, type: 'USER', jti: crypto.randomUUID() } satisfies UserJwtPayload, {
        expiresIn: config.userTokenExpiry,
      }),
    );

    server.decorate('signTwoFaToken', (userId: number) =>
      server.jwt.sign({ userId, type: '2FA', jti: crypto.randomUUID() } satisfies TwoFaJwtPayload, {
        expiresIn: config.twoFaTokenExpiry,
      }),
    );

    server.decorate('signOauthStateToken', () =>
      server.jwt.sign(
        { type: 'GoogleOAuthState', jti: crypto.randomUUID() } satisfies OauthStateJwtPayload,
        { expiresIn: config.oauthStateTokenExpiry },
      ),
    );

    server.decorate('signTwoFaSetupToken', (userId: number, secret: string) =>
      server.jwt.sign(
        {
          userId,
          secret,
          type: '2FA_SETUP',
          jti: crypto.randomUUID(),
        } satisfies TwoFaSetupJwtPayload,
        { expiresIn: config.twoFaTokenExpiry },
      ),
    );

    // Authentication handler
    server.addHook('onRequest', async (req: FastifyRequest, reply) => {
      const routeConfig = req.routeOptions.config as { auth?: AuthOption };
      if (!routeConfig?.auth || routeConfig.auth === 'none') return;

      try {
        const decoded = JWTPayloadSchema.parse(await req.jwtVerify());

        if (!decoded || decoded.type !== 'USER') throw new Error('Invalid token');

        req.userId = await validateTokenFromDb(req, decoded.userId);

        if (!req.userId) throw new Error('Invalid token');

        // Record heartbeat
        if (req.userId)
          setImmediate(() => {
            getDb()
              .insert(heartbeatTable)
              .values({ userId: req.userId })
              .catch((err) => req.log.error({ err }, 'Failed to record heartbeat'));
          });
      } catch {
        if (routeConfig.auth === 'mandatory')
          return reply.status(401).send({ message: 'Unauthorized' });

        req.userId = null; // For 'optional' auth, set userId to null
      }
    });
  },
  { name: 'auth-plugin' },
);

export default auth;
