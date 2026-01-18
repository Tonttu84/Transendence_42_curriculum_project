import 'dotenv/config';

export const ENVS = ['production', 'test', 'development'] as const;

type Env = (typeof ENVS)[number];

interface Config {
  dbAddress: string;
  env: Env;
  jwtSecret: string;
  userTokenExpiry: number;
  oauthStateTokenExpiry: number;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  frontendUrl: string;
  twoFaUrlPrefix: string;
  twoFaTokenExpiry: number;
}

const parseEnv = (): Env => {
  const env = process.env.NODE_ENV;
  if (env === 'production' || env === 'test' || env === 'development') {
    return env;
  }
  return 'development';
};

const config: Config = (() => {
  const cfg = {
    env: parseEnv(),
    dbAddress: 'data/auth_service_db.sqlite',
    jwtSecret: process.env.JWT_SECRET || 'test-secret',
    userTokenExpiry: Number(process.env.USER_TOKEN_EXPIRY) || 3600,
    oauthStateTokenExpiry: Number(process.env.OAUTH_STATE_TOKEN_EXPIRY) || 600,
    googleClientId: process.env.GOOGLE_CLIENT_ID || 'test-google-client-id',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'test-google-redirect-uri',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    twoFaUrlPrefix: process.env.TWO_FA_URL_PREFIX || 'otpauth://totp/Transcendence?secret=',
    twoFaTokenExpiry: Number(process.env.TWO_FA_TOKEN_EXPIRY) || 600,
  };
  switch (process.env.NODE_ENV) {
    case 'production':
      cfg.dbAddress = process.env.PROD_DB_ADDRESS || cfg.dbAddress;
      break;
    case 'test':
      cfg.dbAddress = process.env.TEST_DB_ADDRESS || cfg.dbAddress;
      break;
    case 'development':
    default:
      cfg.dbAddress = process.env.DEV_DB_ADDRESS || cfg.dbAddress;
  }

  return cfg;
})();

export default config;
