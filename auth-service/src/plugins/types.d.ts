import '@fastify/jwt';
import 'fastify';
import { AuthOption } from './auth.js';

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: AuthOption;
  }
  interface FastifyRequest {
    userId?: number | null;
  }
  interface FastifyInstance {
    signAccessToken: (userId: number) => string;
    signOauthStateToken: () => string; // For preventing CSRF during Google OAuth
    signTwoFaToken: (userId: number) => string; // As 2FA session
    signTwoFaSetupToken: (userId: number, secret: string) => string; // For 2FA setup process
  }
}
