# Rufa Backend

A small FastAPI backend using Supabase's HTTPS Data API, secure password
hashing, JWT authentication, CORS, JSON errors, and interactive API
documentation.

## Requirements

- Python 3.11 or newer
- A Supabase project

## Setup

Run from the `backend` folder.

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

### macOS or Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

Before starting the API:

1. Open Supabase **SQL Editor**.
2. Run `supabase/migrations/001_create_users.sql`.
3. Add the project URL and a server-side Secret key to `.env`.

FastAPI loads `.env` automatically. Database requests use HTTPS on port `443`;
the PostgreSQL connection ports are not required.

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI schema: `http://localhost:3000/openapi.json`
- Health check: `http://localhost:3000/api/health`

## Environment

Configure these values in `.env`:

- `SUPABASE_URL`: project URL, such as `https://project-ref.supabase.co`
- `SUPABASE_SECRET_KEY`: server-only `sb_secret_...` key
- `JWT_SECRET_KEY`: random secret with at least 32 characters
- `JWT_ALGORITHM`: defaults to `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES`: defaults to `60`
- `APP_ENV`: `development`, `test`, or `production`
- `CORS_ORIGINS`: comma-separated browser origins

The Supabase Secret key bypasses Row Level Security. Never commit `.env`, send
the key to a browser, or include it in frontend code.

## Authentication API

### Sign up

`POST /api/auth/signup`

```json
{
  "fname": "Ada",
  "lname": "Lovelace",
  "email": "ada@example.com",
  "password": "StrongPassword123!",
  "phone_number": "+44 20 1234 5678",
  "blood_group": "O+",
  "location": "London",
  "date_of_birth": "1990-12-10"
}
```

The public signup endpoint always assigns the `user` role. Clients cannot grant
roles to themselves.

### Log in

`POST /api/auth/login`

```json
{
  "email": "ada@example.com",
  "password": "StrongPassword123!"
}
```

The response contains a signed bearer token:

```json
{
  "access_token": "<token>",
  "token_type": "bearer"
}
```

### Current user

`GET /api/auth/me`

Send the token in the request header:

```text
Authorization: Bearer <token>
```

## User data

The `users` table contains:

- `user_id` UUID primary key
- first and last name
- unique normalized email
- Argon2 password hash
- optional phone number, blood group, location, and date of birth
- roles, defaulting to `["user"]`
- active and verified status
- created and updated timestamps

Passwords and password hashes are never returned by the API.

## Project structure

```text
backend/
├── api/
│   ├── auth.py             # Signup, login, and current-user routes
│   ├── dependencies.py     # Authentication dependencies
│   └── health.py           # Health route
├── core/
│   ├── config.py           # Environment configuration
│   └── security.py         # Password hashing and JWT helpers
├── models/
│   └── user.py             # SQLAlchemy User table
├── schemas/
│   ├── auth.py             # Login and token schemas
│   ├── system.py           # Health response schema
│   └── user.py             # User request and response schemas
├── supabase/
│   └── migrations/
│       └── 001_create_users.sql
├── tests/
├── database.py             # Supabase client and user repository
└── main.py                 # FastAPI application
```

## Development commands

```bash
pytest
ruff check .
ruff format --check .
```

Apply future SQL migration files through the Supabase dashboard or CLI before
deploying application changes that depend on them.
