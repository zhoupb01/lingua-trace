import type { ClientResponse } from "hono/client"
import type { StatusCode } from "hono/utils/http-status"
import { describe, expect, test } from "vitest"
import { ApiError, unwrap } from "@/lib/api"

// Cast a plain Response to the RPC ClientResponse shape so we can test unwrap
// without a running server.
const asClient = <T>(r: Response) => r as unknown as ClientResponse<T, StatusCode, "json">

describe("unwrap", () => {
    test("returns the JSON body on success", async () => {
        const res = asClient<{ user: string }>(
            new Response(JSON.stringify({ user: "x" }), { status: 200 }),
        )
        expect(await unwrap(res)).toEqual({ user: "x" })
    })

    test("throws ApiError parsed from the standard error body", async () => {
        const res = asClient(
            new Response(
                JSON.stringify({ code: "NOT_FOUND", message: "not found", requestId: "abc" }),
                {
                    status: 404,
                },
            ),
        )
        const p = unwrap(res)
        await expect(p).rejects.toBeInstanceOf(ApiError)
        await expect(p).rejects.toMatchObject({
            status: 404,
            code: "NOT_FOUND",
            message: "not found",
            requestId: "abc",
        })
    })

    test("falls back when the body isn't our JSON shape", async () => {
        const res = asClient(new Response("<html>502</html>", { status: 502 }))
        await expect(unwrap(res)).rejects.toMatchObject({ status: 502, code: "INTERNAL" })
    })
})
