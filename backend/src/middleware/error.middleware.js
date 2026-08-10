import { env } from '../config/env.js';

export function notFoundHandler(request, response) {
  response.status(404).json({
    error: {
      message: `Route not found: ${request.method} ${request.originalUrl}`,
    },
  });
}

export function errorHandler(error, _request, response, _next) {
  console.error(error);

  response.status(error.status ?? 500).json({
    error: {
      message:
        env.nodeEnv === 'production'
          ? 'Internal server error'
          : (error.message ?? 'Internal server error'),
    },
  });
}
