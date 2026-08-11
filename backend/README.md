# Rufa Backend

A minimal Python API built with FastAPI. It currently provides health checking,
JSON error responses, CORS configuration, security headers, and interactive API
documentation. Authentication, business features, and a database are not yet
included.

## Requirements

- Python 3.11 or newer

## Quick start

Run these commands from the `backend` folder.

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 3000 --env-file .env
```

### macOS or Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 3000 --env-file .env
```

The API is available at:

- Health check: `http://localhost:3000/api/health`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI schema: `http://localhost:3000/openapi.json`

The health endpoint returns:

```json
{
  "status": "ok",
  "service": "rufa-backend",
  "timestamp": "2026-08-11T06:43:00.000Z"
}
```

## Commands

```bash
# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 3000 --env-file .env

# Run tests
pytest

# Check code
ruff check .

# Check formatting
ruff format --check .

# Apply formatting
ruff format .
```

## Environment

Copy `.env.example` to `.env` and configure:

- `APP_ENV`: `development`, `test`, or `production`
- `CORS_ORIGINS`: comma-separated allowed browser origins

Use exact frontend origins in production:

```env
APP_ENV=production
CORS_ORIGINS=https://app.example.com,https://admin.example.com
```

The `.env` file is ignored by Git. Do not commit credentials or secrets.

## Structure

```text
backend/
├── main.py                 # FastAPI application and routes
├── tests/
│   └── test_main.py        # API tests
├── .env.example            # Safe environment template
├── requirements.txt        # Runtime dependencies
└── requirements-dev.txt    # Test and code-quality dependencies
```

## Current API

- `GET /api/health`: confirms that the API process is available
- Unknown routes return `{"error":{"message":"Route not found: ..."}}`

For production, install `requirements.txt`, set environment variables through
the hosting platform, and run:

```bash
uvicorn main:app --host 0.0.0.0 --port 3000
```
