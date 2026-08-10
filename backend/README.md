# Rufa Backend

A small, team-ready Node.js API starter built with Express. This setup provides
the project structure and basic tooling only; it does not include business
features, authentication, or a database yet.

## Requirements

- Node.js 22 or newer
- npm (included with Node.js)

Check your versions:

```bash
node --version
npm --version
```

## Quick start

From the `backend` folder:

1. Install the exact dependency versions recorded in `package-lock.json`:

   ```bash
   npm ci
   ```

2. Create your local environment file:

   macOS/Linux:

   ```bash
   cp .env.example .env
   ```

   Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000/api/health`. A successful response looks like:

   ```json
   {
     "status": "ok",
     "service": "rufa-backend",
     "timestamp": "2026-08-10T08:00:00.000Z"
   }
   ```

## Commands

- `npm run dev` — start with automatic reload after file changes
- `npm start` — start without automatic reload
- `npm test` — run the tests
- `npm run lint` — check code quality
- `npm run format` — format project files
- `npm run format:check` — check formatting without changing files

Before opening a pull request, run:

```bash
npm run lint
npm test
npm run format:check
```

## Environment variables

Copy `.env.example` to `.env` and adjust these values:

- `NODE_ENV` — `development`, `test`, or `production`
- `PORT` — HTTP server port; defaults to `3000`
- `CORS_ORIGIN` — browser origin allowed to call the API; defaults to `*`

The `.env` file is ignored by Git. Never commit passwords, tokens, or other
secrets. In production, replace `CORS_ORIGIN=*` with the frontend's exact
origin, such as `https://app.example.com`.

## Project structure

```text
backend/
├── src/
│   ├── config/          # Environment and application configuration
│   ├── middleware/      # Shared Express middleware
│   ├── routes/          # API route definitions
│   ├── app.js           # Express app setup
│   └── server.js        # HTTP server entry point
├── tests/               # Automated tests
├── .env.example         # Safe environment variable template
├── eslint.config.js     # Linting rules
└── package.json         # Dependencies and commands
```

## Adding a feature

Keep each feature focused and easy to review:

1. Add its endpoint under `src/routes/`.
2. Put reusable request logic in a new service or controller module instead of
   making route files large.
3. Register the router in `src/app.js` under `/api`.
4. Add tests under `tests/`.
5. Document new environment variables in both `.env.example` and this README.

Use ES modules (`import`/`export`), keep secrets out of source code, and return
JSON errors in the existing `{ "error": { "message": "..." } }` shape.

## Current API

- `GET /api/health` — confirms that the API process is available
- Any unknown route returns a JSON `404` response

The server also includes JSON body parsing, Helmet security headers, CORS, input
size limiting, centralized error responses, and graceful shutdown handling.
