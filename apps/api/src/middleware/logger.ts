import { log } from "@api/lib/log"
import type { Variables } from "@api/types"
import { createMiddleware } from "hono/factory"

// One structured line per request, tagged with the requestId. Errors are logged
// by app.onError (it knows the final status); this logs requests that complete
// normally. A child logger carrying the requestId is exposed as `c.var.log` for
// handlers and services to reuse.
export const requestLog = createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const start = performance.now()
    c.set("start", start)
    c.set("log", log.child({ requestId: c.get("requestId") }))

    await next()

    const logger = c.get("log")
    const fields = {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        ms: Math.round(performance.now() - start),
        userId: c.get("user")?.sub,
    }
    // /health is hit constantly by Traefik / the container healthcheck — keep it
    // out of the default info stream.
    if (c.req.path === "/health") logger.debug(fields, "request")
    else logger.info(fields, "request")
})
