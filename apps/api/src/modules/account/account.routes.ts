import { auth, requireUser } from "@api/middleware/auth"
import type { Variables } from "@api/types"
import { Hono } from "hono"

// Current-user endpoint (mounted at /me). Protected example with no schema.
export const account = new Hono<{ Variables: Variables }>()
    .use("*", auth)
    .get("/", (c) => c.json({ user: requireUser(c) }))
