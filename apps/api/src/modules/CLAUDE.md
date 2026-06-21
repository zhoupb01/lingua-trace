# modules — one folder per feature

Add a feature as `modules/<name>/`:

- `<name>.routes.ts` — Hono router, **thin**: validate input + call the service.
  Protect with `.use("*", auth)` if it needs a signed-in user.
- `<name>.service.ts` — the actual logic. No Hono/HTTP here.
- `<name>.schema.ts` — Drizzle tables for this feature (only if it stores data;
  aggregated in `../db/index.ts`, globbed by `drizzle.config.ts`).
- `<name>.test.ts` — `bun test`, co-located; mock network (DB / LLM / OpenBao).

Don't reach into another module's files — share via `../lib/` or `../db/`.
Keep each file under ~200 lines.

## Don't return raw table rows — project to a Response type

Success responses are bare typed data (Hono RPC; the web infers them from `AppType`),
so **never `c.json` a raw Drizzle row.** A `$inferSelect` row carries internal columns —
ownership keys (`userId`), secrets, IdP ids, storage keys, worker cursors/bookkeeping —
that have no place in the API contract. Once a column is in a `c.json`, it's in the type
the web compiles against.

So every service exposes an explicit projection:

- Write an `xResponse(row)` mapper that returns an **allow-listed object literal** — only
  the fields the client needs. Adding a column to the table never leaks: you have to add
  it to the literal on purpose.
- Name the shape `export type XResponse = ReturnType<typeof xResponse>` and annotate the
  client-facing service return types with it (`Promise<XResponse>` / `Promise<XResponse[]>`).
  The mapper is the single source of truth and the type follows it, so the two can't drift —
  that's why the derived `ReturnType` beats a hand-written `Pick<…>`. Keep the raw
  `$inferSelect` type for server-side use only.
- If a server-side caller needs an internal column, read it via its own raw-row accessor
  rather than widening the response shape.

Worked example in `modules/translation/translation.service.ts`: expose a response mapper
that returns only client-facing fields, and keep ownership/bookkeeping columns server-side.
