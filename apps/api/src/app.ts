import { getDb } from "@api/db"
import { notFound, onError } from "@api/lib/errors"
import { requestLog } from "@api/middleware/logger"
import { account } from "@api/modules/account/account.routes"
import { chat } from "@api/modules/chat/chat.routes"
import type { Variables } from "@api/types"
import { sql } from "drizzle-orm"
import { Hono } from "hono"
import { requestId } from "hono/request-id"

const app = new Hono<{ Variables: Variables }>()

// Cross-cutting setup: requestId first (so every log line and error body can
// reference it and an incoming X-Request-Id from Traefik is reused), then the
// request logger, then the shared error funnel.
app.use(requestId())
app.use(requestLog)
app.onError(onError)
app.notFound(notFound)

// Mount each feature module here. /health is a public infra route; feature
// routers apply their own auth inside the module.
const routes = app
    .get("/health", (c) => c.json({ status: "ok" }))
    // Readiness (vs /health liveness): can we actually reach Postgres? Point the
    // container healthcheck / Traefik probe here so a DB-down or pool-exhausted
    // instance stops taking traffic instead of reporting healthy forever.
    .get("/ready", async (c) => {
        try {
            const db = await getDb()
            await db.execute(sql`select 1`)
            return c.json({ status: "ready" })
        } catch (err) {
            c.var.log.error({ err }, "readiness check failed")
            return c.json({ status: "unavailable" }, 503)
        }
    })
    .route("/me", account)
    .route("/chat", chat)

export { app }

// Consumed by the web app via Hono RPC (`hc<AppType>`).
export type AppType = typeof routes
