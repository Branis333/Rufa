# Rufa FastAPI Backend

Supabase-backed API for the Rufa Expo application. It provides custom
Argon2/JWT authentication, blood request matching, donor commitments,
activity, notifications, verification, messaging, contributions, and an
authenticated WebSocket transport. The frontend is not connected yet.

## Setup

Requirements: Python 3.11+ and a Supabase project.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Set the real values in `.env`, then run each SQL file in order in the
Supabase SQL Editor:

1. `supabase/migrations/001_create_users.sql`
2. `supabase/migrations/002_create_domain_schema.sql`
3. `supabase/migrations/003_indexes_rpc_rls_seed.sql`

Start the API:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI: `http://localhost:3000/openapi.json`
- Health: `http://localhost:3000/api/health`

The backend uses Supabase's HTTPS Data API on port 443. It does not require
direct PostgreSQL connectivity.

## Environment

- `SUPABASE_URL`: `https://<project-ref>.supabase.co`
- `SUPABASE_SECRET_KEY`: server-only `sb_secret_...` key
- `JWT_SECRET_KEY`: random value with at least 32 characters
- `JWT_ALGORITHM`: defaults to `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES`: defaults to `60`
- `APP_ENV`: `development`, `test`, or `production`
- `CORS_ORIGINS`: comma-separated browser origins

The Supabase secret key bypasses RLS. Never commit `.env`, expose this key to
the frontend, or ship it in a mobile build.

## API contract

JSON request and response fields use `camelCase`. Send authenticated requests
with `Authorization: Bearer <token>`.

Route groups:

- `/api/auth`: signup, login, current user, logout, password recovery, Google
- `/api/users`: profile, preferences, location, stats, push token
- `/api/hospitals`: nearby/search list and detail
- `/api/requests`: create, nearby, mine, detail, cancel, completion,
  eligibility, commitment progress and movement
- `/api/donors`: compatible donor search and direct requests
- `/api/donations`, `/api/activity`: history and summaries
- `/api/notifications`: list, read one, read all
- `/api/verification`: request, status, administrator review
- `/api/conversations`: participant conversations and messages
- `/api/contributions`: provider-neutral contribution records

Error responses use one envelope:

```json
{
  "error": {
    "message": "Human-readable message."
  }
}
```

Password reset delivery, Google identity verification, and payment checkout
are stable provider-neutral contracts. They explicitly report that no provider
is configured; credentials and adapters must be added before those flows can
complete externally.

## Realtime

Connect with:

```text
ws://localhost:3000/api/ws/v1?token=<jwt>
```

The connection automatically subscribes to `user:<userId>`. Authorized
clients can subscribe to participant channels:

- `request:<requestId>`
- `commitment:<commitmentId>`
- `conversation:<conversationId>`

Client frames:

```json
{"type": "subscribe", "channel": "request:<requestId>"}
{"type": "unsubscribe", "channel": "request:<requestId>"}
{"type": "ping"}
{"type": "typing", "channel": "conversation:<conversationId>"}
{"type": "location.update", "commitmentId": "<id>", "coordinates": {"lat": 0.35, "lng": 32.58}, "etaSeconds": 600}
```

Server events include `incoming_request`, `request.created`,
`commitment.updated`, `movement.updated`, `message.created`,
`verification.updated`, and `contribution.updated`.

The hub is intentionally in-process. A multi-worker or multi-instance
deployment must replace its fan-out with Redis/pub-sub or another shared
message bus.

## Security and behavior

- Passwords are stored only as Argon2 hashes.
- Public request projections round coordinates; precise coordinates are
  returned only to request participants.
- Services enforce ownership, blood compatibility, state transitions, and
  one one-bag commitment per donor/request.
- The API uses the service role, while migrations revoke table access from
  `anon` and `authenticated`.
- Verification document fields must contain opaque provider/storage
  references, not raw document bytes.

## Development

Tests use in-memory repositories and never call live Supabase.

```powershell
python -m pytest -q
python -m ruff check .
python -m ruff format --check .
python -m pip check
```

Apply all new migrations before deploying application code that depends on
them.
