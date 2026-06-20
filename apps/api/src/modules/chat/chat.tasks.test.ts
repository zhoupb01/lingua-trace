import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test"
import * as chat from "@api/modules/chat/chat.schema"
import { PGlite } from "@electric-sql/pglite"
import {
    Agent,
    type Model,
    type ModelRequest,
    type StreamEvent,
    setTracingDisabled,
} from "@openai/agents"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"

// The flagship, most-inherited logic: the detached run, server-side-state chaining
// (previous_response_id), the expired-chain fallback, and the one-turn-per-session
// guard. We drive it offline by mocking the DB (pglite) and the agent's model with a
// controllable fake STREAMED model, then run the real chat.tasks against it.

setTracingDisabled(true) // the tracer would otherwise try to phone home

const client = new PGlite()
const db = drizzle(client, { schema: { ...chat } })
mock.module("@api/db", () => ({ getDb: async () => db }))

// Controllable fake streamed model. Each turn shifts the next behavior off the queue
// (defaults to a plain reply), and every request is recorded so tests can assert what
// was actually sent (previousResponseId, input length).
type Behavior =
    | { kind: "reply"; text: string; responseId: string }
    | { kind: "block"; gate: Promise<void>; text: string; responseId: string }
    | { kind: "delta_then_hang"; text: string; gate: Promise<void> }
    | { kind: "throw"; error: unknown }

const behaviors: Behavior[] = []
const requests: ModelRequest[] = []

function streamFor(text: string, responseId: string): StreamEvent[] {
    return [
        { type: "output_text_delta", delta: text } as StreamEvent,
        {
            type: "response_done",
            response: {
                id: responseId,
                usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
                output: [
                    {
                        type: "message",
                        role: "assistant",
                        status: "completed",
                        content: [{ type: "output_text", text }],
                    },
                ],
            },
        } as StreamEvent,
    ]
}

function fakeModel(): Model {
    return {
        getResponse() {
            throw new Error("non-streamed path is not used by chat.tasks")
        },
        async *getStreamedResponse(req: ModelRequest): AsyncIterable<StreamEvent> {
            requests.push(req)
            const b = behaviors.shift() ?? { kind: "reply", text: "ok", responseId: "resp_default" }
            if (b.kind === "throw") throw b.error
            if (b.kind === "delta_then_hang") {
                // Stream one delta, then hang until aborted — a turn stopped mid-reply.
                yield { type: "output_text_delta", delta: b.text } as StreamEvent
                await b.gate
                return
            }
            if (b.kind === "block") await b.gate
            const { text, responseId } = b
            for (const ev of streamFor(text, responseId)) yield ev
        },
    }
}

mock.module("@api/modules/chat/chat.agent", () => ({
    agent: new Agent({ name: "test", instructions: "test", tools: [], model: fakeModel() }),
}))

const { createSession, getLastResponseId, getSession, loadItems } = await import(
    "@api/modules/chat/chat.service"
)
const { startSessionTask, stopSessionTask, streamSession } = await import(
    "@api/modules/chat/chat.tasks"
)

beforeAll(async () => {
    await migrate(db, { migrationsFolder: `${import.meta.dir}/../../../drizzle` })
})

afterEach(async () => {
    behaviors.length = 0
    requests.length = 0
    await db.delete(chat.sessions) // messages cascade
})

afterAll(async () => {
    await client.close()
})

// startSessionTask kicks the run un-awaited; wait for the detached turn to settle.
async function waitFor(pred: () => Promise<boolean>, ms = 2000): Promise<void> {
    const start = performance.now()
    while (performance.now() - start < ms) {
        if (await pred()) return
        await Bun.sleep(5)
    }
    throw new Error("timed out waiting for the detached run to settle")
}

const lastResponseId = (id: string) => getLastResponseId(id)

describe("chat.tasks server-side state", () => {
    test("first turn sends no previousResponseId and stores the returned id", async () => {
        const s = await createSession("u1")
        behaviors.push({ kind: "reply", text: "hello", responseId: "resp_1" })

        await startSessionTask(s, [], "hi there")
        await waitFor(async () => (await lastResponseId(s.id)) === "resp_1")

        expect(requests[0]?.previousResponseId).toBeUndefined()
        // user message + assistant reply both persisted for replay/UI
        expect(await loadItems(s.id)).toHaveLength(2)
    })

    test("a follow-up turn chains via previous_response_id and sends only the new message", async () => {
        const s = await createSession("u1")
        behaviors.push({ kind: "reply", text: "first", responseId: "resp_1" })
        await startSessionTask(s, [], "q1")
        await waitFor(async () => (await lastResponseId(s.id)) === "resp_1")

        const { session, items: prior } = await getSession("u1", s.id)
        expect(prior).toHaveLength(2) // q1 + a1
        behaviors.push({ kind: "reply", text: "second", responseId: "resp_2" })
        await startSessionTask(session, prior, "q2")
        await waitFor(async () => (await lastResponseId(s.id)) === "resp_2")

        const turn2 = requests[1]
        expect(turn2?.previousResponseId).toBe("resp_1")
        // only the new user message was sent over the wire, not the whole history
        expect(Array.isArray(turn2?.input) ? turn2.input.length : -1).toBe(1)
        // …but the full transcript is still persisted locally (q1, a1, q2, a2)
        expect(await loadItems(s.id)).toHaveLength(4)
    })

    test("an expired previous_response_id retries with full history and resets the id", async () => {
        const s = await createSession("u1")
        behaviors.push({ kind: "reply", text: "first", responseId: "resp_1" })
        await startSessionTask(s, [], "q1")
        await waitFor(async () => (await lastResponseId(s.id)) === "resp_1")

        const { session, items: prior } = await getSession("u1", s.id)
        // turn 2: the stored id is rejected (404), then the full-history retry succeeds.
        behaviors.push({
            kind: "throw",
            error: Object.assign(new Error("Previous response not found"), { status: 404 }),
        })
        behaviors.push({ kind: "reply", text: "recovered", responseId: "resp_2" })
        await startSessionTask(session, prior, "q2")
        await waitFor(async () => (await lastResponseId(s.id)) === "resp_2")

        // the retry resent full history with no previousResponseId
        expect(requests[2]?.previousResponseId).toBeUndefined()
        const items = await loadItems(s.id)
        // exactly one "recovered" reply — the failed first attempt persisted nothing
        const recovered = items.filter((i) => JSON.stringify(i).includes("recovered"))
        expect(recovered).toHaveLength(1)
        expect(items).toHaveLength(4) // q1, a1, q2, a2
    })

    test("a second concurrent turn for the same session is rejected with 409", async () => {
        const s = await createSession("u1")
        let release!: () => void
        const gate = new Promise<void>((r) => {
            release = r
        })
        behaviors.push({ kind: "block", gate, text: "slow", responseId: "resp_1" })

        // first turn starts and blocks inside the model (stays non-terminal)
        await startSessionTask(s, [], "q1")
        // a second send while it's in flight must be rejected, not run a second turn
        await expect(startSessionTask(s, [], "q2")).rejects.toMatchObject({
            status: 409,
            code: "CONFLICT",
        })

        release() // let the first turn finish so the registry slot frees cleanly
        await waitFor(async () => (await lastResponseId(s.id)) === "resp_1")
        // only the first turn ran: q1 + its reply, nothing from the rejected q2
        expect(await loadItems(s.id)).toHaveLength(2)
    })

    test("stop keeps the partial reply and ends the turn for live subscribers", async () => {
        const s = await createSession("u1")
        behaviors.push({ kind: "reply", text: "first", responseId: "resp_1" })
        await startSessionTask(s, [], "q0")
        await waitFor(async () => (await lastResponseId(s.id)) === "resp_1")

        const { session, items: prior } = await getSession("u1", s.id)
        let release!: () => void
        const gate = new Promise<void>((r) => {
            release = r
        })
        behaviors.push({ kind: "delta_then_hang", text: "partial answer", gate })
        await startSessionTask(session, prior, "q1")

        // Attach a live subscriber and wait until the partial delta has streamed.
        const sseEvents: { event?: string; data: string }[] = []
        const ac = new AbortController()
        const fakeSse = {
            writeSSE: async (m: { event?: string; data: string }) => {
                sseEvents.push(m)
            },
        }
        const streamDone = streamSession(
            fakeSse as unknown as Parameters<typeof streamSession>[0],
            ac.signal,
            s.id,
        )
        await waitFor(async () => sseEvents.some((e) => e.data === "partial answer"))

        // Stop: the live subscriber must get a terminal `done` (cancelSessionTask would
        // leave it hanging), and the partial reply must be persisted.
        await stopSessionTask(s.id)
        await streamDone // resolves once the `done` terminal is delivered
        release() // let the hung model generator unwind

        expect(sseEvents.some((e) => e.event === "done")).toBe(true)
        const items = await loadItems(s.id)
        expect(await lastResponseId(s.id)).toBeNull()
        expect(items).toHaveLength(4) // q0/a0 + user "q1" + persisted partial assistant reply
        expect(JSON.stringify(items)).toContain("partial answer")

        behaviors.push({ kind: "reply", text: "after stop", responseId: "resp_2" })
        const afterStop = await getSession("u1", s.id)
        await startSessionTask(afterStop.session, afterStop.items, "q2")
        await waitFor(async () => (await lastResponseId(s.id)) === "resp_2")

        const resumed = requests.at(-1)
        expect(resumed?.previousResponseId).toBeUndefined()
        expect(Array.isArray(resumed?.input) ? resumed.input.length : -1).toBe(5)
    })

    test("a failed turn clears previous_response_id so the next turn sends full history", async () => {
        const s = await createSession("u1")
        behaviors.push({ kind: "reply", text: "first", responseId: "resp_1" })
        await startSessionTask(s, [], "q0")
        await waitFor(async () => (await lastResponseId(s.id)) === "resp_1")

        const { session, items: prior } = await getSession("u1", s.id)
        behaviors.push({ kind: "throw", error: new Error("boom") })
        await startSessionTask(session, prior, "q1")
        await waitFor(async () => (await lastResponseId(s.id)) === null)

        behaviors.push({ kind: "reply", text: "recovered", responseId: "resp_2" })
        const recovered = await getSession("u1", s.id)
        await startSessionTask(recovered.session, recovered.items, "q2")
        await waitFor(async () => (await lastResponseId(s.id)) === "resp_2")

        const turnAfterFailure = requests.at(-1)
        expect(turnAfterFailure?.previousResponseId).toBeUndefined()
        expect(Array.isArray(turnAfterFailure?.input) ? turnAfterFailure.input.length : -1).toBe(4)
    })
})
