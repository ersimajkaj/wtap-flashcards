# WTAP Flashcards

A full-stack flashcards app with AI-generated cards and spaced-repetition study.

- **Frontend:** vanilla HTML/CSS/JS (no build step)
- **Backend:** ASP.NET Core Web API (.NET 9)
- **Database:** PostgreSQL 17 (run via Docker)
- **Auth:** ASP.NET Core Identity + JWT bearer tokens
- **AI:** server-side Gemini proxy (no client-side API keys)
- **Study scheduler:** SM-2 (the algorithm Anki uses)

## Layout

```
flashcards/
├── frontend/                       # Static site (open with VS Code Live Server, etc.)
│   ├── index.html                  # Deck list
│   ├── deck.html                   # Single deck (cards / AI / study tabs)
│   ├── login.html / register.html
│   ├── css/styles.css
│   └── js/
│       ├── api.js                  # API client + session
│       ├── decks.js cards.js ai.js # Thin async wrappers
│       ├── study.js                # SM-2 study UI
│       ├── ui.js                   # Theme + toast system
│       └── app.js                  # Page glue
├── backend/
│   └── WtapFlashcards.Api/         # ASP.NET Core Web API
└── docker-compose.yml              # Postgres 17
```

## Prerequisites

- .NET SDK 9 — verify: `dotnet --list-sdks`
- Docker Desktop (running) — verify: `docker info`
- A Gemini API key — get one free at https://aistudio.google.com/apikey

## First-time setup

```bash
# 1. Start Postgres
cp .env.example .env       # only needed the first time
docker compose up -d

# 2. Configure backend secrets (one-time)
cd backend/WtapFlashcards.Api

# JWT signing key (a strong random key was already set by the scaffold —
# you can rotate it any time with:)
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"

# Gemini API key — never commit this
dotnet user-secrets set "Gemini:ApiKey" "YOUR_GEMINI_KEY_HERE"

# 3. Apply database schema
dotnet ef database update
```

## Run

Terminal 1 — API:

```bash
cd backend/WtapFlashcards.Api
dotnet run
# → http://localhost:5000
```

Terminal 2 — frontend (any static server works):

```bash
cd frontend
python3 -m http.server 5500
# → http://localhost:5500
```

Open http://localhost:5500/register.html and create an account.

> The frontend talks to `http://localhost:5000/api` by default. To point it at a
> different backend, run `localStorage.setItem('flashcards.apiBase', 'https://your-host/api')`
> in the browser console and reload.

## API surface

All `/api/*` endpoints except `auth/*` require a `Bearer <jwt>` header.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/register` | POST | Create user, returns JWT |
| `/api/auth/login` | POST | Returns JWT |
| `/api/decks` | GET / POST | List / create decks (current user only) |
| `/api/decks/{id}` | GET / PATCH / DELETE | Single deck operations |
| `/api/decks/{id}/cards` | GET / POST | List / create cards in a deck |
| `/api/cards/{id}` | PATCH / DELETE | Single card operations |
| `/api/ai/generate` | POST | `{ deckId, notes }` → generates and inserts cards |
| `/api/study/{deckId}/due?limit=20` | GET | Cards due for review |
| `/api/study/review` | POST | `{ cardId, rating }` (0=Again, 1=Hard, 2=Good, 3=Easy) |
| `/api/study/{deckId}/stats` | GET | Due / learned / new counts |

OpenAPI document: `http://localhost:5000/openapi/v1.json` (Development only).

## Adding new migrations

```bash
cd backend/WtapFlashcards.Api
dotnet ef migrations add SomeChange
dotnet ef database update
```

## Resetting the database

```bash
docker compose down -v   # drops the Postgres volume
docker compose up -d
cd backend/WtapFlashcards.Api && dotnet ef database update
```

## Tech notes

- **Data isolation:** every controller filters by `OwnerId == currentUser.Id`. Users cannot
  see or modify each other's decks/cards/reviews.
- **SM-2:** see `Services/SrsService.cs`. Quality mapping is `Again=2, Hard=3, Good=4, Easy=5`;
  ratings under 3 reset progress (a "lapse"). Ease factor floors at 1.3.
- **AI proxy:** `Services/GeminiService.cs` enforces JSON-only output from Gemini and
  filters malformed entries before persisting.
- **CORS:** allowed origins are in `appsettings.json → Cors:AllowedOrigins`. Add your
  frontend origin there if you host it elsewhere.
