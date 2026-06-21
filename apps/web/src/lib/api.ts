import type { AppType } from "@app/api"
import type {
    CreateTranslationRequest,
    RecognizeImageMediaType,
    TranslationResponse,
} from "@app/shared"
import type { ClientResponse } from "hono/client"
import { hc } from "hono/client"
import type { StatusCode } from "hono/utils/http-status"
import { API_BASE_URL, getAuthState, redirectToLogin } from "@/auth"
import { getCurrentLocale, translate } from "@/i18n"

// Typed Hono RPC client. Pass a Logto access token to authenticate.
export const api = (token?: string) =>
    hc<AppType>("/api", token ? { headers: { Authorization: `Bearer ${token}` } } : {})

type MaybePromise<T> = T | Promise<T>
type ApiErrorBody = { code?: string; message?: string; requestId?: string; details?: unknown }
type TranslationDelta = { text: string }

// Mirrors the api's error body (apps/api/src/lib/errors.ts). Success responses
// are bare typed data; only failures carry this shape.
export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string | undefined,
        message: string,
        readonly requestId?: string,
        readonly details?: unknown,
    ) {
        super(message)
        this.name = "ApiError"
    }

    static async fromResponse(res: {
        status: number
        statusText: string
        json(): Promise<unknown>
    }): Promise<ApiError> {
        try {
            const b = (await res.json()) as ApiErrorBody
            return new ApiError(
                res.status,
                b.code ?? "INTERNAL",
                b.message ?? res.statusText,
                b.requestId,
                b.details,
            )
        } catch {
            return new ApiError(res.status, "INTERNAL", res.statusText || "request failed")
        }
    }
}

// Unwrap a Hono RPC JSON response: return the typed body on success, throw
// ApiError on failure. Use in TanStack Query queryFn/mutationFn so Query sees a
// real error (read error.message / error.requestId in the UI).
export async function unwrap<T>(
    res: MaybePromise<ClientResponse<T, StatusCode, "json">>,
): Promise<T> {
    const r = await res
    if (!r.ok) throw await ApiError.fromResponse(r)
    return r.json()
}

function requestFailedMessage(status: number) {
    return translate(getCurrentLocale(), "requestFailed", { status })
}

function withApiBase(path: string) {
    return `${API_BASE_URL}${path}`
}

async function authHeaders() {
    const headers = new Headers({ "Accept-Language": getCurrentLocale() })
    const token = await getAuthState()?.getAccessToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
    return headers
}

function summarizeResponseText(text: string) {
    const normalized = text.replace(/\s+/g, " ").trim()
    if (!normalized) return ""
    return normalized.length > 200 ? `${normalized.slice(0, 200)}…` : normalized
}

function shouldParseJson(response: Response, text: string) {
    const trimmed = text.trim()
    if (!trimmed) return false
    const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? ""
    return contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")
}

async function readJson<T>(response: Response): Promise<{ data: T | null; text: string }> {
    const text = await response.text()
    if (!text) return { data: null, text: "" }
    if (!shouldParseJson(response, text)) return { data: null, text: summarizeResponseText(text) }
    try {
        return { data: JSON.parse(text) as T, text: summarizeResponseText(text) }
    } catch {
        return { data: null, text: summarizeResponseText(text) }
    }
}

async function throwApiError(response: Response) {
    if (response.status === 401) void redirectToLogin()
    const body = await readJson<ApiErrorBody>(response)
    throw new ApiError(
        response.status,
        body.data?.code ?? "INTERNAL",
        body.data?.message || body.text || requestFailedMessage(response.status),
        body.data?.requestId,
        body.data?.details,
    )
}

export const translationsClient = {
    async list({ page, pageSize }: { page: number; pageSize: number }) {
        const response = await fetch(
            withApiBase(`/api/translations?page=${page}&pageSize=${pageSize}`),
            {
                headers: await authHeaders(),
            },
        )
        if (!response.ok) await throwApiError(response)
        return response.json() as Promise<{
            items: TranslationResponse[]
            page: number
            pageSize: number
            total: number
        }>
    },

    async delete(id: string) {
        const response = await fetch(withApiBase(`/api/translations/${id}`), {
            method: "DELETE",
            headers: await authHeaders(),
        })
        if (!response.ok) await throwApiError(response)
        return response.json() as Promise<{ id: string }>
    },

    async recognizeImage(input: { imageBase64: string; mediaType: RecognizeImageMediaType }) {
        const headers = await authHeaders()
        headers.set("Content-Type", "application/json")
        const response = await fetch(withApiBase("/api/recognize-image"), {
            method: "POST",
            headers,
            body: JSON.stringify(input),
        })
        if (!response.ok) await throwApiError(response)
        return response.json() as Promise<{ recognizedText: string }>
    },
}

function parseFrame(frame: string): { event: string; data: string } {
    let event = "message"
    const data: string[] = []
    for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        if (line.startsWith("data:")) data.push(line.slice(5).trimStart())
    }
    return { event, data: data.join("\n") }
}

export async function translateStream(
    input: CreateTranslationRequest,
    onDelta: (text: string) => void,
): Promise<TranslationResponse> {
    const headers = await authHeaders()
    headers.set("Content-Type", "application/json")
    headers.set("Accept", "text/event-stream")
    const response = await fetch(withApiBase("/api/translate"), {
        method: "POST",
        headers,
        body: JSON.stringify(input),
    })
    if (!response.ok) await throwApiError(response)
    if (!response.body)
        throw new ApiError(
            response.status,
            "empty_stream",
            translate(getCurrentLocale(), "emptyStream"),
        )

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    for (;;) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        const frames = buffer.split("\n\n")
        buffer = frames.pop() ?? ""
        for (const frame of frames) {
            const { event, data } = parseFrame(frame)
            if (!data) continue
            if (event === "delta") onDelta((JSON.parse(data) as TranslationDelta).text)
            if (event === "done") return JSON.parse(data) as TranslationResponse
            if (event === "error") {
                const err = JSON.parse(data) as ApiErrorBody
                throw new ApiError(
                    502,
                    err.code ?? "INTERNAL",
                    err.message ?? "translation failed",
                    err.requestId,
                    err.details,
                )
            }
        }
        if (done) break
    }
    throw new ApiError(502, "stream_closed", translate(getCurrentLocale(), "streamClosed"))
}
