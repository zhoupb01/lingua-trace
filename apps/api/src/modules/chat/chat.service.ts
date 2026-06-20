import { getDb } from "@api/db"
import { AppError } from "@api/lib/errors"
import { messages, sessions } from "@api/modules/chat/chat.schema"
import type { AgentInputItem } from "@openai/agents"
import { and, asc, desc, eq } from "drizzle-orm"

// Chat persistence. The agent loop lives in chat.agent.ts; this owns sessions and
// the SDK history items in Postgres. Every function takes `userId` and treats an
// ownership mismatch as 404 (don't leak that someone else's session exists).

// The full table row — for server-side use only (ownership, the response chain).
export type Session = typeof sessions.$inferSelect

// The client-facing shape. The mapper is the single source of truth: it builds an
// allow-listed object literal — a new internal column never leaks unless it's added
// here on purpose. SessionResponse is derived from it, so the type can't drift from
// the mapper. (Dates serialize to ISO strings on the wire; the web reads them as such.)
const sessionResponse = (s: Session) => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
})
export type SessionResponse = ReturnType<typeof sessionResponse>

export async function createSession(userId: string, title?: string): Promise<SessionResponse> {
    const db = await getDb()
    const [row] = await db
        .insert(sessions)
        .values({ userId, title: title ?? null })
        .returning()
    if (!row) throw new AppError(500, "INTERNAL", "failed to create session")
    return sessionResponse(row)
}

export async function listSessions(userId: string): Promise<SessionResponse[]> {
    const db = await getDb()
    // Most-recently-active first, for the sidebar (updatedAt bumps on each turn).
    const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(desc(sessions.updatedAt))
    return rows.map(sessionResponse)
}

// Rename a session (manual edit from the sidebar). 404 if not owned.
export async function renameSession(
    userId: string,
    sessionId: string,
    title: string,
): Promise<SessionResponse> {
    await requireOwned(userId, sessionId)
    const db = await getDb()
    const [row] = await db
        .update(sessions)
        .set({ title, updatedAt: new Date() })
        .where(eq(sessions.id, sessionId))
        .returning()
    if (!row) throw new AppError(404, "NOT_FOUND", "session not found")
    return sessionResponse(row)
}

// Set a title without touching updatedAt — used for the auto-title on the first
// message (ownership already checked by the caller).
export async function setTitle(sessionId: string, title: string): Promise<void> {
    const db = await getDb()
    await db.update(sessions).set({ title }).where(eq(sessions.id, sessionId))
}

// Remember the OpenAI Responses-API response id of the session's latest turn, so
// the next turn can chain with `previous_response_id` instead of resending history.
// Pass null to clear it (e.g. when a stored response has expired → fall back to
// full history). Doesn't touch updatedAt — appendItems already bumped it.
export async function setLastResponseId(
    sessionId: string,
    lastResponseId: string | null,
): Promise<void> {
    const db = await getDb()
    await db.update(sessions).set({ lastResponseId }).where(eq(sessions.id, sessionId))
}

// Read the stored response id for a session's latest turn (null if none/expired).
// Server-side only — the chat task runner uses it to decide whether to chain via
// previous_response_id; it's deliberately NOT part of the client-facing PublicSession.
export async function getLastResponseId(sessionId: string): Promise<string | null> {
    const db = await getDb()
    const [row] = await db
        .select({ lastResponseId: sessions.lastResponseId })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
    return row?.lastResponseId ?? null
}

// First ~40 chars of the first user message, single-lined — a cheap session label.
export function deriveTitle(message: string): string {
    const oneLine = message.replace(/\s+/g, " ").trim()
    if (!oneLine) return "New chat"
    return oneLine.length > 40 ? `${oneLine.slice(0, 40)}…` : oneLine
}

// The session (client-facing projection) + its items, ordered for replay. 404 if not owned.
export async function getSession(
    userId: string,
    sessionId: string,
): Promise<{ session: SessionResponse; items: AgentInputItem[] }> {
    const session = await requireOwned(userId, sessionId)
    return { session: sessionResponse(session), items: await loadItems(sessionId) }
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
    await requireOwned(userId, sessionId)
    const db = await getDb()
    await db.delete(sessions).where(eq(sessions.id, sessionId)) // messages cascade
}

// History items for a session, ordered by seq → pass straight into run().
export async function loadItems(sessionId: string): Promise<AgentInputItem[]> {
    const db = await getDb()
    const rows = await db
        .select({ item: messages.item })
        .from(messages)
        .where(eq(messages.sessionId, sessionId))
        .orderBy(asc(messages.seq))
    return rows.map((r) => r.item)
}

// Append the items a turn produced (seq is assigned by the bigserial default, in
// insertion order). Also bumps the session's updatedAt.
export async function appendItems(sessionId: string, items: AgentInputItem[]): Promise<void> {
    if (items.length === 0) return
    const db = await getDb()
    await db.insert(messages).values(items.map((item) => ({ sessionId, item })))
    await db.update(sessions).set({ updatedAt: new Date() }).where(eq(sessions.id, sessionId))
}

// Fetch a session and assert the user owns it; otherwise 404. Exported so the
// stream route can check ownership before opening an SSE connection.
export async function requireOwned(userId: string, sessionId: string): Promise<Session> {
    const db = await getDb()
    const [row] = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    if (!row) throw new AppError(404, "NOT_FOUND", "session not found")
    return row
}
