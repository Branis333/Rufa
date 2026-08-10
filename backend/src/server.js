import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.port, () => {
  console.log(
    `Rufa backend is running in ${env.nodeEnv} mode on http://localhost:${env.port}`,
  );
});

function shutdown(signal) {
  console.log(`${signal} received. Closing HTTP server...`);

  server.close((error) => {
    if (error) {
      console.error('Failed to close HTTP server cleanly.', error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
