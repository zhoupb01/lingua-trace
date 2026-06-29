# AGENTS.md — working agreement for this project

A Bun + Hono API and a React + Vite web app in one Bun-workspaces monorepo
(generated from agent-stack-template). Read this before changing things, match
the existing patterns, and don't restructure.

> A nested `AGENTS.md` in `apps/api/src/modules/` covers how to add a feature
> module — it loads automatically when you work in that folder. (Add per-app
> `apps/*/AGENTS.md` later only if an app grows rules that don't fit here.)

## Golden rules

- **Match the surrounding code.** Don't introduce a new pattern, framework, or
  library when one already in use fits.
- **Small, scoped changes.** Don't refactor, rename, or "tidy" code you weren't
  asked to touch.
- **Leave it green.** Before you're done, `bun run ci` (Biome check + typecheck +
  tests) must pass. Run `bun run check` to auto-fix formatting / import order.
- **Be stingy with dependencies.** Justify any new one. The api bundles to a
  single file and the web ships static assets — extra deps still cost clarity.

## Where files go

```
apps/api/src/
  modules/<name>/   one folder per feature — <name>.routes.ts (thin router),
                    <name>.service.ts (logic), <name>.schema.ts (Drizzle tables,
                    optional), <name>.test.ts. See modules/AGENTS.md.
  db/          index.ts — client, migrations, schema aggregation
  lib/         cross-module helpers (openai.ts = OpenAI client setup)
  middleware/  Hono middleware (auth.ts)
  env.ts       ALL env vars, validated with zod — read config only from here
  secrets.ts   OpenBao access (DB creds + KV) — read secrets only from here
  types.ts     shared types (Hono Variables, …)
  app.ts       /health + mounts modules, exports AppType (the RPC contract)
  index.ts     boot: Bun.serve, startWorker (in-process)
  worker.ts    background work — startWorker(), runs in the api process

apps/web/src/
  routes/      TanStack Router file-based routes; routeTree.gen.ts is generated — don't edit
  lib/         api client (api.ts), logto config, query client
  components/  shared UI — create this dir when you have reusable components
  main.tsx     providers + router bootstrap
```

- **New feature** → a new `modules/<name>/` folder, then mount its router in
  `app.ts` (keep the chained `.route()` calls so `AppType` stays correct — it's
  what types the web client). Details in `apps/api/src/modules/AGENTS.md`.
- **Keep handlers thin:** the route validates input and calls the module's
  service; real logic lives in `<name>.service.ts`, not in the handler.
- Read `process.env` **only** in `env.ts`. Read secrets **only** in `secrets.ts`.
- **Background work** goes in `worker.ts` as `startWorker()`, started from
  `index.ts` so it runs **in the same process as the api** — no separate worker
  service or image. Keep jobs IO-bound (DB/LLM); they share the api's event loop.

## Growing further

- **Schema across modules:** each feature's tables live in its `*.schema.ts`,
  aggregated in `db/index.ts` (`drizzle(sql, { schema: { ...a, ...b } })`) and
  globbed by drizzle.config (`src/modules/**/*.schema.ts`). Add new tables the
  same way — don't centralize them back into one file.
- **Shared FE+BE code** → a new `packages/shared` with its own alias `@shared/*`.
  Don't create it speculatively, and don't put FE↔BE API types there — those
  already flow through `import type { AppType } from "@app/api"`.

## Imports

- `apps/api` uses `@api/*` (→ its `src`). `apps/web` uses `@/*` (→ its `src`).
  **Never** write `../../`.
- The web gets backend types **only** via `import type { AppType } from "@app/api"`
  (type-only). Never import api runtime code into the web.

## Tests

- Co-located: `foo.test.ts(x)` next to `foo.ts`. `bun run test` runs both apps;
  `bun run ci` runs everything. **api** uses Bun's built-in runner, **web** uses
  Vitest — they differ, so copy the matching app's pattern.
- **api**: import the app and hit routes with `app.request(...)` — see
  `apps/api/src/app.test.ts`. Dummy env comes from `apps/api/test.setup.ts` (a
  test preload), so modules that parse env at load work offline.
- **DB-backed service logic**: test it for real against an in-process Postgres
  (pglite — WASM, no network), not by mocking query results. Spin up `new PGlite()`,
  `drizzle(client)` (`drizzle-orm/pglite`), apply the committed migrations with
  `migrate(db, { migrationsFolder: "<…>/drizzle" })`, then `mock.module("@api/db",
  () => ({ getDb: async () => db }))` *before* importing the service. See
  `apps/api/src/modules/translation/translation.service.test.ts`.
- **web**: **Vitest**, reusing `apps/web/vite.config.ts` (same `@` alias,
  plugins, `import.meta.env`) in a happy-dom environment with
  `@testing-library/react`. Import the test API from `vitest` (not `bun:test`);
  per-test DOM cleanup lives in `apps/web/vitest.setup.ts`. See
  `apps/web/src/components/Spinner.test.tsx`.
- Don't touch the network in unit tests: mock OpenBao, the LLM, the DB. Test
  behavior, not framework internals.

## File length

- Keep files focused; soft cap **~200 lines** for hand-written files. Past that,
  split by responsibility (move logic into `<name>.service.ts`, or split the
  feature into smaller modules).
- One main thing per file. Long functions → extract helpers.

## Style — enforced by Biome, don't fight it

- 4-space indent, double quotes, no semicolons. `bun run check` auto-fixes.
- The linter is on. Fix warnings; don't disable rules to pass. Deprecated imports
  are flagged — move off the deprecated API instead of suppressing.

## Database & migrations

- Tables live in a module's `*.schema.ts`. After editing, `bun run db:generate`
  emits SQL into `drizzle/` — **commit it**; never hand-edit generated SQL.
- Migrations are applied **manually**, never on boot. They run the bundled
  drizzle-orm migrator (`runMigrations()` in `db/index.ts`) via the `migrate`
  subcommand — `bun server.js migrate` (or `bun src/index.ts migrate` in dev):
  - **Local:** `bun run db:migrate` (repo root).
  - **Server (image only):** `./deploy/migrate.sh` runs `bun server.js migrate`
    inside the api image — no drizzle-kit needed (it's a devDep, absent from the
    image; the image ships `./drizzle` + the bundled migrator).
  - `drizzle-kit` is dev-only tooling for `db:generate` / `db:studio`.
- DB credentials rotate (OpenBao static role). `db/index.ts` handles it via a
  postgres-js password callback that re-reads OpenBao per new connection — don't
  cache DB creds or bake a password anywhere else.

## Auth

- Protect a router with `.use("*", auth)` (see `modules/account` / `modules/translation`);
  read the user via `c.get("user")`. Auth failures throw `AppError` (below).
- Authorize with scopes: chain `requireScope` after `auth` —
  `.use("*", auth).use("*", requireScope("translation:write"))`. It 403s when the token
  lacks the scope. Keep it optional in the template (Logto scopes are per-project),
  so it's shown as a commented example, not hard-wired onto every route.

## OpenAI / translation

- Translation uses the official `openai` client through `lib/openai.ts`; the API key
  comes from OpenBao KV (`OPENAI_API_KEY`), while `env.OPENAI_MODEL` and optional
  `env.OPENAI_BASE_URL` are config.
- `modules/translation` owns text translation, image OCR, usage tracking, and
  translation history. Keep OpenAI request construction in `translation.ai.ts` and
  persistence/business rules in `translation.service.ts`.

## Errors & logging

- **Throw, don't hand-roll.** For an expected failure throw
  `AppError(status, code, message, details?)` (`lib/errors.ts`); `app.onError` is
  the single place that renders the error shape `{ code, message, requestId,
  details? }` and logs it. Success responses stay **bare typed data** (Hono RPC) —
  never wrap them in an envelope.
- **Validation:** use `validate(target, schema)` (`lib/validate.ts`), **not**
  `zValidator` directly — it throws a 400 `AppError` so the shape + logging stay
  uniform. `c.req.valid(target)` is still fully typed.
- **Unexpected errors** become a generic 500 (internals never leak to the client);
  the `requestId` — also in the `X-Request-Id` response header — ties the response
  to its log line.
- **Logging is structured (pino).** In a handler/service use the request-scoped
  `c.var.log` (it carries the requestId); elsewhere import `log` from `lib/log.ts`
  (the worker uses `log.child({ component: "worker" })`). Never `console.log`.
  Output is JSON; `bun run dev` pipes it through pino-pretty.
- **SSE:** once the stream opens the 200 is already sent, so `onError` can't help.
  Preflight anything that can fail *before* `streamSSE`, and handle mid-stream
  errors in its `onError` callback with a terminal `error` event.
- **Web side:** call the api through `unwrap(...)` (`apps/web/src/lib/api.ts`) so a
  failure becomes an `ApiError` (carries `code`/`message`/`requestId`) and TanStack
  Query handles it — don't hand-roll `res.ok` checks. Streamed (SSE) failures show
  up as terminal `error` events; parse them at the call site.

## Deploy & image size — don't undo

- Images are built locally and pushed to the registry; the server only pulls.
  `docker-compose.yml` is image-based (no `build:`) — keep it that way; build
  config lives in `docker-compose.build.yml`.
- Keep images small: the api is bundled to one file (no `node_modules` in the
  image), the web ships only static assets. Don't add steps that copy
  `node_modules` or source into the runtime images.

## Don't

- Don't commit `.env` or any secret.
- Don't restructure the monorepo, swap frameworks, or add a second router /
  state-management library.
- Don't disable Biome or TypeScript checks to "make it green."

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `zhoupb01/lingua-trace`; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.
