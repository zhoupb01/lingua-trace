import { ensureLLM } from "@api/lib/llm"
import { validate } from "@api/lib/validate"
import { auth, requireUser } from "@api/middleware/auth"
import {
    createSession,
    deleteSession,
    getSession,
    listSessions,
    renameSession,
    requireOwned,
} from "@api/modules/chat/chat.service"
import {
    cancelSessionTask,
    startSessionTask,
    stopSessionTask,
    streamSession,
} from "@api/modules/chat/chat.tasks"
import type { Variables } from "@api/types"
import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { z } from "zod"

const createSchema = z.object({ title: z.string().min(1).max(200).optional() })
const renameSchema = z.object({ title: z.string().min(1).max(200) })
const messageSchema = z.object({ message: z.string().min(1) })

// Session-scoped chat. Protected; thin handlers (validate + call the service).
// A turn runs as a detached task (chat.tasks.ts): POST /messages just starts it,
// and the reply is delivered over GET /sessions/:id/stream — the same stream the
// client reopens to resume after a refresh. The client never handles a task id.
// To require a scope instead of just a signed-in user, chain it after auth:
//   .use("*", auth).use("*", requireScope("chat:write"))   // requireScope is in middleware/auth.ts
export const chat = new Hono<{ Variables: Variables }>()
    .use("*", auth)
    .post("/sessions", validate("json", createSchema), async (c) => {
        const { title } = c.req.valid("json")
        return c.json(await createSession(requireUser(c).sub, title))
    })
    .get("/sessions", async (c) => {
        return c.json(await listSessions(requireUser(c).sub))
    })
    .get("/sessions/:id", async (c) => {
        return c.json(await getSession(requireUser(c).sub, c.req.param("id")))
    })
    .patch("/sessions/:id", validate("json", renameSchema), async (c) => {
        const { title } = c.req.valid("json")
        return c.json(await renameSession(requireUser(c).sub, c.req.param("id"), title))
    })
    .delete("/sessions/:id", async (c) => {
        const id = c.req.param("id")
        await deleteSession(requireUser(c).sub, id) // 404 if not owned; messages cascade
        cancelSessionTask(id) // stop any in-flight turn — its run can only hit the now-deleted session
        return c.json({ ok: true })
    })
    // Start a turn. Preflight what can fail (ownership + API key), persist the user
    // message and kick the run, then return immediately — the reply streams over
    // GET /sessions/:id/stream, which the client is (or will be) listening on.
    .post("/sessions/:id/messages", validate("json", messageSchema), async (c) => {
        const userId = requireUser(c).sub
        const { message } = c.req.valid("json")
        await ensureLLM()
        const { session, items: prior } = await getSession(userId, c.req.param("id"))
        await startSessionTask(session, prior, message)
        return c.json({ ok: true })
    })
    // Stop the in-flight turn without deleting the session: keeps the partial reply and
    // closes the stream cleanly (vs DELETE, which removes the whole session). Idempotent.
    .post("/sessions/:id/stop", async (c) => {
        const id = c.req.param("id")
        await requireOwned(requireUser(c).sub, id) // 404 if not owned
        await stopSessionTask(id)
        return c.json({ ok: true })
    })
    // The session's live output: replays the in-flight turn (catch-up) then streams
    // it to completion, or returns `done` immediately if nothing is running. Used
    // both to receive a just-sent reply and to resume after a refresh.
    .get("/sessions/:id/stream", async (c) => {
        const id = c.req.param("id")
        await requireOwned(requireUser(c).sub, id) // 404 if not owned, before the stream opens
        return streamSSE(c, (sse) => streamSession(sse, c.req.raw.signal, id))
    })
