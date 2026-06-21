import { describe, expect, test } from "bun:test"
import { app } from "@api/app"
import { AppError, onError } from "@api/lib/errors"
import { userFromJwtPayload } from "@api/middleware/auth"
import type { Variables } from "@api/types"
import type { Context } from "hono"

// Offline smoke tests — no DB / OpenBao / network needed. Pattern to copy for
// module tests: hit a route with `app.request(...)` and assert on the response.
describe("app", () => {
    test("GET /health is public and returns ok", async () => {
        const res = await app.request("/health")
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ status: "ok" })
    })

    test("every response carries an X-Request-Id header", async () => {
        const res = await app.request("/health")
        expect(res.headers.get("x-request-id")).toBeTruthy()
    })

    test("GET /me without a token → 401 in the standard error shape", async () => {
        const res = await app.request("/me")
        expect(res.status).toBe(401)
        const body = (await res.json()) as { code: string; requestId: string }
        expect(body.code).toBe("UNAUTHORIZED")
        expect(body.requestId).toBeTruthy()
    })

    test("unknown route → 404 in the standard error shape", async () => {
        const res = await app.request("/nope")
        expect(res.status).toBe(404)
        expect(((await res.json()) as { code: string }).code).toBe("NOT_FOUND")
    })

    test("localizes expected errors by Accept-Language", async () => {
        const res = await app.request("/me", { headers: { "Accept-Language": "fr-FR,fr;q=0.9" } })
        expect(res.status).toBe(401)
        const body = (await res.json()) as { code: string; message: string }
        expect(body.code).toBe("UNAUTHORIZED")
        expect(body.message).toBe("Non autorisé")
    })
})

describe("auth", () => {
    test("a verified token without subject is rejected", () => {
        expect(() => userFromJwtPayload({ scope: "translation:read" })).toThrow(AppError)
        try {
            userFromJwtPayload({ sub: " ", scope: "translation:read" })
            throw new Error("expected missing subject to be rejected")
        } catch (err) {
            expect(err).toBeInstanceOf(AppError)
            expect((err as AppError).status).toBe(401)
            expect((err as AppError).code).toBe("INVALID_TOKEN")
        }
    })
})

describe("onError", () => {
    test("an unexpected error becomes a generic 500 that never leaks internals", () => {
        let captured: { body: { code: string; message: string }; status: number } | undefined
        const c = {
            get: () => undefined,
            req: { method: "POST", path: "/x" },
            json: (body: unknown, status: number) => {
                captured = { body: body as { code: string; message: string }, status }
                return new Response(JSON.stringify(body), { status })
            },
        } as unknown as Context<{ Variables: Variables }>

        onError(new Error("DB password is hunter2"), c)

        expect(captured?.status).toBe(500)
        expect(captured?.body.code).toBe("INTERNAL")
        expect(captured?.body.message.toLowerCase()).toBe("internal error") // curated/localized, not the raw message
        expect(JSON.stringify(captured?.body)).not.toContain("hunter2") // internals never leak
    })
})
