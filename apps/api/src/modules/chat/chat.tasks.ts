import { AppError } from "@api/lib/errors"
import { useResponsesApi } from "@api/lib/llm"
import { log } from "@api/lib/log"
import { agent } from "@api/modules/chat/chat.agent"
import {
    appendItems,
    deriveTitle,
    getLastResponseId,
    type SessionResponse,
    setLastResponseId,
    setTitle,
} from "@api/modules/chat/chat.service"
import { type AgentInputItem, assistant, run, user } from "@openai/agents"
import type { SSEStreamingApi } from "hono/streaming"

// Task runner + in-memory pub/sub for streaming an assistant turn, keyed by session.
//
// The agent run is decoupled from any HTTP request: `startSessionTask` kicks it off
// (un-awaited) and any number of SSE connections can subscribe to the session's live
// output via `streamSession`. That's what makes a refresh recoverable — the browser
// drops its connection, the run keeps going, and a reopened stream re-attaches,
// getting the already-generated text (catch-up) then live deltas.
//
// State is purely in-memory (single process, like the in-process worker) — there is
// no task table. A refresh is the same process, so the registry is still there. A
// full restart loses any in-flight run (the user message is already persisted; a
// reopened stream just finds nothing running and the client reloads history). A
// multi-instance deployment would need shared pub/sub (e.g. Redis) — out of scope.

// SSE events. Shape mirrors the protocol the web client already parses.
type TaskEvent =
    | { kind: "delta"; text: string }
    | { kind: "tool_call"; name: string; args: string }
    | { kind: "tool_result"; name: string; output: unknown }
type Terminal = { kind: "done" } | { kind: "error"; message: string; requestId?: string }

type TaskState = {
    events: TaskEvent[] // ordered live log, replayed to late subscribers
    terminal: Terminal | null
    subscribers: Set<Subscriber>
    ac: AbortController // aborts the in-flight run when the session is deleted/cancelled
}

// At most one running turn per session.
const registry = new Map<string, TaskState>()
const EVICT_AFTER_MS = 60_000

// One SSE connection's event queue with a waker — no external deps. Events pushed
// by the runner are drained by the connection's writer at its own pace, so a slow
// or dead client never blocks the run.
class Subscriber {
    private queue: (TaskEvent | Terminal)[] = []
    private wake: (() => void) | null = null
    private closed = false

    push(ev: TaskEvent | Terminal): void {
        this.queue.push(ev)
        const w = this.wake
        this.wake = null
        w?.()
    }

    close(): void {
        this.closed = true
        const w = this.wake
        this.wake = null
        w?.()
    }

    async *drain(): AsyncGenerator<TaskEvent | Terminal> {
        while (!this.closed) {
            const ev = this.queue.shift()
            if (ev === undefined) {
                await new Promise<void>((resolve) => {
                    this.wake = resolve
                })
                continue
            }
            yield ev
            if (ev.kind === "done" || ev.kind === "error") return
        }
    }
}

function emit(state: TaskState, ev: TaskEvent): void {
    state.events.push(ev)
    for (const sub of state.subscribers) sub.push(ev)
}

function emitTerminal(state: TaskState, ev: Terminal): void {
    state.terminal = ev
    for (const sub of state.subscribers) sub.push(ev)
}

// Collapse consecutive deltas into one so a reconnect replays the backlog in a few
// writes instead of one per token, while preserving text↔tool ordering.
function coalesce(events: TaskEvent[]): TaskEvent[] {
    const out: TaskEvent[] = []
    let buf = ""
    for (const ev of events) {
        if (ev.kind === "delta") {
            buf += ev.text
            continue
        }
        if (buf) {
            out.push({ kind: "delta", text: buf })
            buf = ""
        }
        out.push(ev)
    }
    if (buf) out.push({ kind: "delta", text: buf })
    return out
}

// Drop the session's state a while after it finishes — but only if it's still the
// same run (a newer turn may have replaced it in the meantime).
function scheduleEvict(sessionId: string, state: TaskState): void {
    const t = setTimeout(() => {
        if (registry.get(sessionId) === state) registry.delete(sessionId)
    }, EVICT_AFTER_MS)
    t.unref?.()
}

// A late appendItems can lose the race with deleteSession and hit the messages→sessions
// foreign key (Postgres SQLSTATE 23503). That's an expected consequence of a delete, not a bug.
function isMissingSessionError(err: unknown): boolean {
    return (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: unknown }).code === "23503"
    )
}

// OpenAI returns a 404 when a `previous_response_id` is expired (stored responses
// live ~30 days), deleted, or otherwise unknown. The exact text isn't contractual,
// so match defensively on shape + message — a false positive only costs one safe
// retry with the full history.
function isExpiredResponseError(err: unknown): boolean {
    const status = (err as { status?: number })?.status
    const msg = err instanceof Error ? err.message : String(err)
    return (
        status === 404 ||
        /previous[\s_]?response/i.test(msg) ||
        (/response/i.test(msg) && /not found|no such|expired|does not exist/i.test(msg))
    )
}

async function clearLastResponseId(sessionId: string, reason: string): Promise<void> {
    try {
        await setLastResponseId(sessionId, null)
    } catch (err) {
        if (!isMissingSessionError(err)) {
            log.error({ err, sessionId, reason }, "failed to clear last_response_id")
        }
    }
}

// What a turn needs to run. `prior` is the session's full history (always loaded,
// used both for the full-history mode and as the fallback). `previousResponseId`,
// when set, switches to OpenAI Responses-API chaining: send only the new message and
// let the server replay the chain.
type RunArgs = {
    prior: AgentInputItem[]
    message: string
    previousResponseId: string | null
}

// The detached agent run. Feeds the session's in-memory log + subscribers.
async function runTask(sessionId: string, args: RunArgs): Promise<void> {
    const state = registry.get(sessionId)
    if (!state) return
    const { prior, message } = args
    let previousResponseId = args.previousResponseId
    try {
        // Up to two attempts: if a `previous_response_id` is rejected (expired/missing
        // stored response) BEFORE anything is emitted, drop the stale id and retry once
        // with the full history. The "nothing emitted yet" guard (state.events empty)
        // means a reconnecting subscriber never sees duplicated output.
        for (let attempt = 0; ; attempt++) {
            const usePrev = previousResponseId !== null
            // prev mode: only the new message (server has the rest). full mode: everything.
            const input = usePrev ? [user(message)] : [...prior, user(message)]
            try {
                const stream = await run(agent, input, {
                    stream: true,
                    signal: state.ac.signal,
                    previousResponseId: previousResponseId ?? undefined,
                })
                for await (const ev of stream) {
                    if (ev.type === "raw_model_stream_event") {
                        if (ev.data.type === "output_text_delta") {
                            emit(state, { kind: "delta", text: ev.data.delta })
                        }
                    } else if (ev.type === "run_item_stream_event") {
                        if (ev.name === "tool_called") {
                            const raw = ev.item.rawItem
                            const name = "name" in raw ? raw.name : "tool"
                            const args = "arguments" in raw ? String(raw.arguments ?? "") : ""
                            emit(state, { kind: "tool_call", name, args })
                        } else if (ev.name === "tool_output") {
                            const raw = ev.item.rawItem
                            const name = raw && "name" in raw ? raw.name : "tool"
                            const output = "output" in ev.item ? ev.item.output : undefined
                            emit(state, { kind: "tool_result", name, output })
                        }
                    }
                }
                await stream.completed
                // The user message was already persisted in startSessionTask; save only
                // the items this turn generated — everything after the input we sent
                // (prev mode: just the user item; full mode: prior + the user item).
                await appendItems(sessionId, stream.history.slice(input.length))
                // Remember the response id so the next turn can chain (Responses API only).
                if (useResponsesApi && stream.lastResponseId) {
                    await setLastResponseId(sessionId, stream.lastResponseId)
                }
                emitTerminal(state, { kind: "done" })
                return
            } catch (err) {
                if (
                    usePrev &&
                    attempt === 0 &&
                    state.events.length === 0 &&
                    !state.ac.signal.aborted &&
                    isExpiredResponseError(err)
                ) {
                    log.info(
                        { sessionId },
                        "previous_response_id rejected — retrying with full history",
                    )
                    await setLastResponseId(sessionId, null)
                    previousResponseId = null
                    continue
                }
                throw err
            }
        }
    } catch (err) {
        // A delete cancels the run (cancelSessionTask) — or makes a late appendItems lose the
        // race with it (FK violation). Both are the expected result of a legitimate delete, so
        // stop quietly instead of logging an error that every downstream project would inherit.
        if (state.ac.signal.aborted || isMissingSessionError(err)) {
            log.info({ sessionId }, "chat task cancelled (session deleted)")
        } else {
            await clearLastResponseId(sessionId, "chat task failed")
            log.error({ err, sessionId }, "chat task failed")
            emitTerminal(state, { kind: "error", message: "stream failed" })
        }
    } finally {
        scheduleEvict(sessionId, state)
    }
}

// Persist the user message, auto-title on the first turn, then kick the run. The
// reply is delivered over the session stream, not this call. Caller must have run
// ensureLLM() first. Throws 409 if a turn is already running for this session.
export async function startSessionTask(
    session: SessionResponse,
    prior: AgentInputItem[],
    message: string,
): Promise<void> {
    // Enforce "one running turn per session" by claiming the registry slot
    // SYNCHRONOUSLY — before the first await — so two near-simultaneous sends (double
    // tap, two tabs, a retry) can't both pass the check and run two paid, interleaved
    // turns. The frontend's busy flag only guards a single tab.
    const existing = registry.get(session.id)
    if (existing && existing.terminal === null) {
        throw new AppError(409, "CONFLICT", "a turn is already in progress for this session")
    }
    const state: TaskState = {
        events: [],
        terminal: null,
        subscribers: new Set(),
        ac: new AbortController(),
    }
    registry.set(session.id, state)

    // From here we own the slot; release it if persisting the user message fails so a
    // DB error doesn't wedge the session as "busy".
    try {
        await appendItems(session.id, [user(message)])
        if (prior.length === 0 && !session.title) await setTitle(session.id, deriveTitle(message))
    } catch (err) {
        if (registry.get(session.id) === state) registry.delete(session.id)
        throw err
    }

    // Chain via the Responses API when we have a stored response id for this session;
    // otherwise (Chat Completions, first turn, or a cleared/expired chain) send full
    // history. The id is read server-side here — it's never part of the public session.
    const previousResponseId = useResponsesApi ? await getLastResponseId(session.id) : null
    void runTask(session.id, { prior, message, previousResponseId })
}

// Cancel a session's in-flight turn, if any: abort the run (so a delete doesn't keep paying
// for an LLM call against a session that's going away) and drop its registry entry. Lives here,
// not in chat.service, because chat.tasks imports the service — the service importing back
// would be a cycle. The DELETE route calls this after deleteSession.
export function cancelSessionTask(sessionId: string): void {
    const state = registry.get(sessionId)
    if (!state) return
    state.ac.abort()
    registry.delete(sessionId)
}

// Stop a session's in-flight turn IN PLACE (the session stays). Unlike cancelSessionTask
// (for delete, which just aborts), this keeps what was generated: it aborts the paid run,
// persists the partial reply, then emits a terminal `done` so connected streams close
// cleanly and a reload shows the partial. The POST /sessions/:id/stop route calls it.
export async function stopSessionTask(sessionId: string): Promise<void> {
    const state = registry.get(sessionId)
    if (!state || state.terminal !== null) return // nothing running, or already finished
    // Abort first so the run can't race us to completion — its catch sees `aborted` and
    // returns without emitting or persisting (see runTask), leaving the turn to us.
    state.ac.abort()
    // Reconstruct the assistant text streamed so far (tool events carry none) and save it
    // as this turn's reply; the user message was already persisted in startSessionTask.
    let partial = ""
    for (const ev of state.events) if (ev.kind === "delta") partial += ev.text
    if (partial) {
        try {
            await appendItems(sessionId, [assistant(partial)])
        } catch (err) {
            // A concurrent delete can win the FK race (same as runTask) — expected, not a bug.
            if (!isMissingSessionError(err)) {
                log.error({ err, sessionId }, "failed to persist partial reply on stop")
            }
        }
    }
    await clearLastResponseId(sessionId, "chat task stopped")
    // Flush live subscribers; the run's own scheduleEvict (it's unwinding from the abort)
    // drops the registry entry, so a reconnecting client still gets this terminal first.
    emitTerminal(state, { kind: "done" })
}

// Abort every in-flight turn — called on shutdown so SIGTERM stops paying for LLM
// calls immediately. The user message is already persisted and the client resumes
// from history, so we just abort; each run unwinds through its own catch/finally.
export function abortAll(): void {
    for (const state of registry.values()) state.ac.abort()
}

// Subscribe an SSE connection to a session's running turn: replay what's already
// happened, then stream live until it finishes (or the client disconnects via
// `signal`). If nothing is running, emit `done` immediately and close.
export async function streamSession(
    sse: SSEStreamingApi,
    signal: AbortSignal,
    sessionId: string,
): Promise<void> {
    const state = registry.get(sessionId)
    const sub = new Subscriber()

    if (state) {
        for (const ev of coalesce(state.events)) sub.push(ev)
        if (state.terminal) sub.push(state.terminal)
        else state.subscribers.add(sub)
    } else {
        sub.push({ kind: "done" }) // idle session — nothing to resume
    }

    const onAbort = () => sub.close()
    signal.addEventListener("abort", onAbort)
    try {
        for await (const ev of sub.drain()) {
            if (signal.aborted) break
            await writeEvent(sse, ev)
        }
    } catch (err) {
        log.warn({ err, sessionId }, "chat stream write failed")
    } finally {
        signal.removeEventListener("abort", onAbort)
        state?.subscribers.delete(sub)
    }
}

async function writeEvent(sse: SSEStreamingApi, ev: TaskEvent | Terminal): Promise<void> {
    switch (ev.kind) {
        case "delta":
            await sse.writeSSE({ data: ev.text })
            return
        case "tool_call":
            await sse.writeSSE({
                event: "tool_call",
                data: JSON.stringify({ name: ev.name, args: ev.args }),
            })
            return
        case "tool_result":
            await sse.writeSSE({
                event: "tool_result",
                data: JSON.stringify({ name: ev.name, output: ev.output }),
            })
            return
        case "done":
            await sse.writeSSE({ event: "done", data: "" })
            return
        case "error":
            await sse.writeSSE({
                event: "error",
                data: JSON.stringify({
                    code: "INTERNAL",
                    message: ev.message,
                    requestId: ev.requestId,
                }),
            })
            return
    }
}
