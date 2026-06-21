# lingua-trace

AI translation history app. It connects to the shared platform (Traefik, Postgres, OpenBao, Logto) over external Docker networks.

```
apps/
├── api/        # Bun + Hono + Drizzle + OpenBao + Logto + OpenAI
├── web/        # React + Vite + Tailwind + TanStack + Logto
└── extension/  # Chrome side panel + right-click selected-text translation
```

Imports use `@/` (web) / `@api/` (api) → that app's `src/`. Cross-app types come
from `@app/api`.

## Prerequisites

The shared platform must be running and this project provisioned — see the root
`README.md` and `platform/README.md`. Provisioning gives you the `OPENBAO_*` /
`PG_*` values; Logto gives you the `LOGTO_*` / `VITE_LOGTO_*` values.

## Setup

```bash
bun install
bun run init <name>      # names the project + creates .env from .env.example
```

Then fill the provisioned values into `.env` (the `OPENBAO_*` / `PG_*` from
provisioning, the `LOGTO_*` / `VITE_LOGTO_*` from Logto).

## Develop

```bash
bun dev
```

- web: http://localhost:5173 (Vite) — proxies `/api` → api
- api: http://localhost:3000 (Bun, hot reload)
- extension: `bun run dev:extension`, then load `apps/extension/dist` in Chrome

Drizzle commands run in `apps/api`:

```bash
cd apps/api
bun run db:generate    # schema → SQL in apps/api/drizzle (no DB needed)
bun run db:studio      # opens Studio; creds come from OpenBao via scripts/db.ts
```
`db:studio` pulls its connection from OpenBao (same as the api), so there's no
`DATABASE_URL` to set. Ensure `PG_HOST` in your `.env` is reachable from where you
run it.

At runtime the api fetches **rotating** DB credentials from OpenBao — no static DB
password in the app. **Migrations are not run on boot** — apply them explicitly:

- **Local:** `bun run db:migrate` (from the repo root). It runs the bundled
  drizzle-orm migrator against `apps/api/drizzle`, taking creds from OpenBao — no
  drizzle-kit, no `DATABASE_URL`.
- **Server (image only):** `./deploy/migrate.sh` — runs the same migrator *inside*
  the api image (`docker compose run --rm api bun server.js migrate`), so it needs
  no source or drizzle-kit on the box.

## Build & deploy (build locally, server only pulls)

Images are built on your machine, pushed to the registry, and the server just
pulls + ups — keeping the tight server free of build load and source code.

**Local — build + push:**
```bash
docker login registry.cn-hangzhou.aliyuncs.com   # once
./deploy/push.sh                                  # or: ./deploy/push.sh v1.2.3
```
Builds `api` + `web` (via `docker-compose.build.yml`) and pushes
`$REGISTRY/$PROJECT_SLUG-{api,web}:$IMAGE_TAG`. The `VITE_*` values are baked
into the web image at build time, so build with the production `.env`.

**Server — only needs `docker-compose.yml`, `.env`, and `deploy/*.sh`:**
```bash
docker compose pull       # fetch the freshly pushed images
./deploy/migrate.sh       # apply DB migrations (one-off; not run on boot)
./deploy/up.sh            # up -d --wait  (also pulls, so safe to run alone)
```
Skip `migrate.sh` on deploys that don't change the schema.
`docker-compose.yml` is image-based (no `build:`), so the server never builds.
Traefik (on the external `proxy` network, global HTTPS) routes `/api/*` → api,
everything else → the nginx-served React bundle; the api reaches Postgres over
`postgres_default`. One Bun process + one nginx per MVP.


## How the pieces connect

- **Types**: `apps/api/src/app.ts` exports `AppType`; `apps/web/src/lib/api.ts`
  consumes it via `hc<AppType>` — change a route, the web client retypes.
- **Auth**: Logto issues a JWT; `apps/api/src/middleware/auth.ts` verifies it via
  JWKS. Protected routers call `.use('*', auth)`.
- **Secrets**: `apps/api/src/secrets.ts` logs in to OpenBao with AppRole, then
  reads Postgres static-role creds and the OpenAI API key from KV.
- **Translation**: `apps/api/src/modules/translation` provides `POST /translate`
  (SSE), `GET/DELETE /translations`, and `POST /recognize-image`, all backed by
  OpenAI and per-user Drizzle tables. Web `/app`, `/profile`, and the Chrome
  extension call these endpoints.
