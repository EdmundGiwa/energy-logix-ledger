# PetroLedger Energy OS

PetroLedger is a multi-tenant operating platform for energy-service contractors. This repository contains an independently deployable Next.js frontend and Django REST API.

## Repository layout

```text
frontend/   Next.js 16 application
backend/    Django 5.2 LTS and Django REST Framework API
docs/       Architecture and delivery plans
```

Read `AGENTS.md`, `SECURITY.md`, and the relevant application instructions before changing code.

## Local development with Docker

Requirements:

- Docker Engine
- Docker Compose

Start the complete development stack:

```bash
docker compose up --build
```

Services:

- Frontend: <http://localhost:3000>
- Backend health: <http://localhost:8001/api/v1/health/>
- Django admin: <http://localhost:8001/admin/>
- PostgreSQL: `localhost:5432`

The first build downloads application dependencies. The backend container applies committed migrations before starting the development server.

To create a local Django administrator:

```bash
docker compose exec backend python manage.py createsuperuser
```

Stop the services without deleting database data:

```bash
docker compose down
```

Copy `.env.example` to `.env` only when overriding the safe local-development defaults. Never commit `.env`.

## Checks

```bash
docker compose run --rm backend python manage.py test
docker compose run --rm backend python manage.py check
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run typecheck
```

See `docs/BACKEND_ROADMAP.md` for the screen-driven backend delivery plan.
