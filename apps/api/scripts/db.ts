import { env } from "@api/env"
import { getDbCreds } from "@api/secrets"

// drizzle-kit `studio` needs a live connection. Credentials come from OpenBao —
// the same source the running api uses — so nothing is hardcoded. We fetch them,
// inject DATABASE_URL, and hand off to drizzle-kit.
// (`db:generate` needs no DB; `db:migrate` uses the bundled drizzle-orm migrator
//  via `src/index.ts migrate`, not drizzle-kit, so it works in the server image too.)
//
// Usage (from apps/api): bun scripts/db.ts <studio|...>
const creds = await getDbCreds()
const url = `postgres://${creds.username}:${encodeURIComponent(creds.password)}@${env.PG_HOST}:${env.PG_PORT}/${env.PG_DATABASE}`

const proc = Bun.spawn(["bunx", "drizzle-kit", ...process.argv.slice(2)], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: ["inherit", "inherit", "inherit"],
})
process.exit(await proc.exited)
