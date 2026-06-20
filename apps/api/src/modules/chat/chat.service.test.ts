import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test"
import * as chat from "@api/modules/chat/chat.schema"
import { PGlite } from "@electric-sql/pglite"
import { user } from "@openai/agents"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"

// DB-backed service test. Unlike the offline tests, this runs the real SQL against
// an in-process Postgres (pglite — WASM, no network) so the persistence logic is
// actually exercised. We apply the committed migrations to build the schema, then
// mock `@api/db` so the service's getDb() returns this pglite-backed connection.
// This is the canonical "mock the boundary, test the service for real" example.

const client = new PGlite()
const db = drizzle(client, { schema: { ...chat } })

// Replace the whole db module before the service is imported, so its `getDb`
// resolves here and db/index.ts (OpenBao + postgres) never loads.
mock.module("@api/db", () => ({ getDb: async () => db }))

const {
    appendItems,
    createSession,
    deleteSession,
    getSession,
    listSessions,
    loadItems,
    renameSession,
} = await import("@api/modules/chat/chat.service")

beforeAll(async () => {
    // Apply 0000…0002 in order (build sessions+messages, add then drop chat_tasks).
    await migrate(db, { migrationsFolder: `${import.meta.dir}/../../../drizzle` })
})

afterEach(async () => {
    await db.delete(chat.sessions) // messages cascade
})

afterAll(async () => {
    await client.close() // release the WASM instance so the test process exits cleanly
})

describe("chat.service (pglite)", () => {
    test("createSession returns a public projection — no internal columns leak", async () => {
        const s = await createSession("u1", "hello")
        expect(s.id).toBeTruthy()
        expect(s.title).toBe("hello")
        // The client only ever sees the allow-listed fields (chat.service SessionResponse);
        // ownership + the response chain stay server-side.
        expect(s).not.toHaveProperty("userId")
        expect(s).not.toHaveProperty("lastResponseId")
    })

    test("appendItems + getSession replay history verbatim, in order", async () => {
        const s = await createSession("u1")
        const a = user("first")
        const b = user("second")
        await appendItems(s.id, [a, b])

        const items = await loadItems(s.id)
        expect(items).toEqual([a, b]) // stored as JSONB, round-trips unchanged

        const got = await getSession("u1", s.id)
        expect(got.session.id).toBe(s.id)
        expect(got.items).toEqual([a, b])
    })

    test("listSessions orders by most-recently-updated", async () => {
        const a = await createSession("u1", "A")
        const b = await createSession("u1", "B")
        await Bun.sleep(2)
        await appendItems(a.id, [user("ping")]) // bumps a.updatedAt → newest

        const list = await listSessions("u1")
        expect(list.map((s) => s.id)).toEqual([a.id, b.id])
    })

    test("renameSession updates the title", async () => {
        const s = await createSession("u1")
        const renamed = await renameSession("u1", s.id, "renamed")
        expect(renamed.title).toBe("renamed")
        expect((await getSession("u1", s.id)).session.title).toBe("renamed")
    })

    test("another user's session is 404, never leaked", async () => {
        const s = await createSession("owner")
        await expect(getSession("intruder", s.id)).rejects.toMatchObject({
            status: 404,
            code: "NOT_FOUND",
        })
        await expect(renameSession("intruder", s.id, "x")).rejects.toMatchObject({ status: 404 })
        await expect(deleteSession("intruder", s.id)).rejects.toMatchObject({ status: 404 })
    })

    test("deleteSession removes the session and cascades its messages", async () => {
        const s = await createSession("u1")
        await appendItems(s.id, [user("hi")])
        await deleteSession("u1", s.id)

        expect(await loadItems(s.id)).toHaveLength(0)
        await expect(getSession("u1", s.id)).rejects.toMatchObject({ status: 404 })
    })
})
