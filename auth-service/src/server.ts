import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import Fastify from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import errorHandler from './plugins/errorHandler.js';
import { auth } from './plugins/index.js';
import { devRouter } from './routes/devRouter.js';
import { userRouter } from './routes/userRouter.js';

const isProd = process.env.NODE_ENV === 'production';

export const server = Fastify({
  logger: isProd
    ? { level: 'fatal' } // production: no pretty transport
    : {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      },
});

await server.register(cors, {
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://localhost:5173',
    'https://c2r5p11.hive.fi:5173',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await server.register(rateLimit, {
  max: 1000,
  timeWindow: '1 minute',
});

server.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Transcendence Auth Service',
      description: 'Authentication and User management service for Transcendence',
      version: '1.0.0',
    },
    servers: [],
  },
  transform: jsonSchemaTransform,
});

server.register(fastifySwaggerUI, {
  routePrefix: '/docs',
});

server.register(auth);

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.get('/api/ping', () => {
  return { message: 'pong' };
});

server.register(devRouter, { prefix: '/api/dev' });
server.register(userRouter, { prefix: '/api/users' });

server.setErrorHandler(errorHandler);
