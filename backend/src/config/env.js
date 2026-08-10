import 'dotenv/config';

const allowedEnvironments = new Set(['development', 'test', 'production']);
const nodeEnv = process.env.NODE_ENV ?? 'development';
const port = Number(process.env.PORT ?? 3000);

if (!allowedEnvironments.has(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, or production.');
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

export const env = Object.freeze({
  nodeEnv,
  port,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
});
