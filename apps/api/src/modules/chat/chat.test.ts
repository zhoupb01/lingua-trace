import { describe, expect, test } from "bun:test"
import { app } from "@api/app"
import { deriveTitle } from "@api/modules/chat/chat.service"

// Offline tests (no DB): the pure title helper, and that the new chat routes are
// auth-gated. DB-backed behaviour (sessions, task streaming, resume) is verified
// manually — the test env has no Postgres, matching app.test.ts.

describe("deriveTitle", () => {
    test("collapses whitespace and trims", () => {
        expect(deriveTitle("  hello   world\n")).toBe("hello world")
    })

    test("truncates long messages with an ellipsis", () => {
        const title = deriveTitle("a".repeat(80))
        expect(title.length).toBe(41) // 40 chars + ellipsis
        expect(title.endsWith("…")).toBe(true)
    })

    test("falls back to a default for empty input", () => {
        expect(deriveTitle("   ")).toBe("New chat")
    })
})

describe("chat routes are protected", () => {
    test("PATCH /chat/sessions/:id without a token → 401", async () => {
        const res = await app.request("/chat/sessions/abc", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: "x" }),
        })
        expect(res.status).toBe(401)
        expect(((await res.json()) as { code: string }).code).toBe("UNAUTHORIZED")
    })

    test("GET /chat/sessions/:id/stream without a token → 401", async () => {
        const res = await app.request("/chat/sessions/abc/stream")
        expect(res.status).toBe(401)
    })
})
