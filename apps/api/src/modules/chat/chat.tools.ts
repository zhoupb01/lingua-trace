import { tool } from "@openai/agents"
import { z } from "zod"

// Tools the agent can call. The SDK handles the call→execute→result round-trip,
// so there's no manual registry/dispatcher — just define tools and list them.
// `get_time` is offline-safe (no network) and never fails; `lookup_user` below is
// the realistic template: a tool that talks to a dependency which can be slow or fail.
export const getTime = tool({
    name: "get_time",
    description: "Return the current time as an ISO 8601 string.",
    parameters: z.object({}),
    execute: async () => new Date().toISOString(),
})

// Stand-in for a real dependency (a DB query, an HTTP API, a queue, …). Replace the
// body with your own — and pass `signal` into it (`fetch(url, { signal })`, a DB
// client that accepts an AbortSignal, …) so the tool's timeout actually cancels the
// in-flight work instead of just abandoning it.
async function fetchUser(id: string, signal?: AbortSignal): Promise<{ id: string; name: string }> {
    signal?.throwIfAborted()
    const directory: Record<string, string> = { ada: "Ada Lovelace", alan: "Alan Turing" }
    const name = directory[id]
    if (!name) throw new Error(`no user with id "${id}"`)
    return { id, name }
}

// A worked example of a real tool. It shows the two things `get_time` doesn't:
//   1. Timeout — `timeoutMs` makes the SDK abort the call and hand the model a timeout
//      message (default `timeoutBehavior: "error_as_result"`); we thread the SDK's
//      `signal` into the work so the underlying op is truly cancelled, not abandoned.
//   2. Error handling — a tool's errors go back to the MODEL as text (the SDK feeds a
//      thrown error to it and the run keeps going), so catch and return a short, useful
//      string. Do NOT throw AppError here: tool errors never reach app.onError, and an
//      HTTP status/code means nothing to the model.
export const lookupUser = tool({
    name: "lookup_user",
    description: "Look up a person by id ('ada' or 'alan') in the directory.",
    parameters: z.object({ id: z.string() }),
    timeoutMs: 5_000,
    execute: async ({ id }, _ctx, details) => {
        try {
            const user = await fetchUser(id, details?.signal)
            return JSON.stringify(user)
        } catch (err) {
            return `Could not look up "${id}": ${err instanceof Error ? err.message : String(err)}`
        }
    },
})

export const tools = [getTime, lookupUser]
