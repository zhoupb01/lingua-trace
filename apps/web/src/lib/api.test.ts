import type { ClientResponse } from "hono/client"
import type { StatusCode } from "hono/utils/http-status"
import { afterEach, describe, expect, test, vi } from "vitest"
import { resolveInitialLocale, setCurrentLocale, translate } from "@/i18n"
import { ApiError, translateStream, translationsClient, unwrap } from "@/lib/api"

// Cast a plain Response to the RPC ClientResponse shape so we can test unwrap
// without a running server.
const asClient = <T>(r: Response) => r as unknown as ClientResponse<T, StatusCode, "json">

function stubFetchResponse(response: Response) {
    const fetch = vi.fn().mockResolvedValue(response)
    vi.stubGlobal("fetch", fetch)
    return fetch
}

afterEach(() => {
    vi.unstubAllGlobals()
    setCurrentLocale("zh-CN", false)
})

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

describe("i18n locale", () => {
    test("returns localized UI messages", () => {
        expect(translate("zh-CN", "emptyTitle")).toBe("还没有翻译记录")
        expect(translate("en", "emptyTitle")).toBe("No translation history yet")
        expect(translate("en", "requestFailed", { status: 418 })).toBe("Request failed: 418")
    })

    test("detects browser language when no locale is stored", () => {
        vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn() })
        vi.stubGlobal("navigator", { languages: ["ja-JP", "en-US"], language: "ja-JP" })

        expect(resolveInitialLocale()).toBe("ja")
    })

    test("stored locale wins over browser language", () => {
        vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue("fr"), setItem: vi.fn() })
        vi.stubGlobal("navigator", { languages: ["ja-JP"], language: "ja-JP" })

        expect(resolveInitialLocale()).toBe("fr")
    })

    test("persists manual locale switch", () => {
        const setItem = vi.fn()
        vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue(null), setItem })

        setCurrentLocale("de")

        expect(setItem).toHaveBeenCalledWith("lingua-trace.locale", "de")
    })
})

describe("translationsClient", () => {
    test("list sends Accept-Language and page query", async () => {
        setCurrentLocale("fr", false)
        const fetch = stubFetchResponse(
            new Response('{"items":[],"page":2,"pageSize":50,"total":0}', { status: 200 }),
        )

        await translationsClient.list({ page: 2, pageSize: 50 })

        expect(fetch.mock.calls[0]?.[1]?.headers.get("Accept-Language")).toBe("fr")
        expect(fetch.mock.calls[0]?.[0]).toBe("/api/translations?page=2&pageSize=50")
    })

    test("delete hits the typed path", async () => {
        const id = "16fd2706-8baf-433b-82eb-8c7fada847da"
        const fetch = stubFetchResponse(new Response(`{"id":"${id}"}`, { status: 200 }))

        await translationsClient.delete(id)

        expect(fetch.mock.calls[0]?.[0]).toBe(`/api/translations/${id}`)
        expect(fetch.mock.calls[0]?.[1]?.method).toBe("DELETE")
    })

    test("recognizeImage posts path headers and body", async () => {
        setCurrentLocale("ja", false)
        const fetch = stubFetchResponse(
            new Response('{"recognizedText":"こんにちは"}', { status: 200 }),
        )

        const result = await translationsClient.recognizeImage({
            imageBase64: "abc123",
            mediaType: "image/png",
        })

        expect(result.recognizedText).toBe("こんにちは")
        expect(fetch.mock.calls[0]?.[0]).toBe("/api/recognize-image")
        expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST")
        expect(fetch.mock.calls[0]?.[1]?.headers.get("Accept-Language")).toBe("ja")
        expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
            imageBase64: "abc123",
            mediaType: "image/png",
        })
    })
})

describe("translateStream", () => {
    test("posts selected target language and sends Accept-Language header", async () => {
        setCurrentLocale("en", false)
        const encoder = new TextEncoder()
        const fetch = vi
            .fn()
            .mockResolvedValue(
                new Response(
                    encoder.encode(
                        'event: done\ndata: {"id":"16fd2706-8baf-433b-82eb-8c7fada847da","sourceText":"你好","translatedText":"Hello","targetLanguage":"English","createdAt":"2026-06-08T00:00:00.000Z"}\n\n',
                    ),
                    { status: 200, headers: { "Content-Type": "text/event-stream" } },
                ),
            )
        vi.stubGlobal("fetch", fetch)

        const result = await translateStream({ text: "你好", targetLanguage: "English" }, () => {})

        expect(result.targetLanguage).toBe("English")
        expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
            text: "你好",
            targetLanguage: "English",
        })
        expect(fetch.mock.calls[0]?.[1]?.headers.get("Accept-Language")).toBe("en")
    })
})
