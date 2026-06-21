import { describe, expect, test } from "bun:test"
import { app } from "@api/app"

describe("translation routes are protected", () => {
    test("GET /translations without a token → 401", async () => {
        const res = await app.request("/translations")
        expect(res.status).toBe(401)
        expect(((await res.json()) as { code: string }).code).toBe("UNAUTHORIZED")
    })

    test("POST /translate without a token → 401", async () => {
        const res = await app.request("/translate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: "hello", targetLanguage: "English" }),
        })
        expect(res.status).toBe(401)
    })

    test("POST /recognize-image without a token → 401", async () => {
        const res = await app.request("/recognize-image", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ imageBase64: "abc", mediaType: "image/png" }),
        })
        expect(res.status).toBe(401)
    })
})
