import type {
    ApiErrorBody,
    CreateTranslationRequest,
    RecognizeImageMediaType,
    TranslationResponse,
} from "@app/shared"
import { sendMessage } from "./chrome"
import { env } from "./env"
import { getCurrentLocale, t } from "./i18n"
import type { TokenResponse } from "./messages"

type TranslationDelta = { text: string }

export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
        readonly requestId?: string,
        readonly details?: unknown,
    ) {
        super(message)
        this.name = "ApiError"
    }
}

function url(path: string) {
    if (!path.startsWith("/"))
        throw new ApiError(0, "invalid_api_path", "API path must start with /")
    return `${env.apiBaseUrl}${path}`
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

async function authHeaderValues() {
    const headers: Record<string, string> = { "Accept-Language": getCurrentLocale() }
    const { accessToken } = await sendMessage<TokenResponse>({ type: "auth:token" })
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`
    return headers
}

async function throwApiError(response: Response) {
    if (response.status === 401) await sendMessage({ type: "auth:sign-out" }).catch(() => undefined)
    const body = await readJson<ApiErrorBody>(response)
    throw new ApiError(
        response.status,
        body.data?.code ?? "INTERNAL",
        body.data?.message || body.text || t("requestFailed", { status: response.status }),
        body.data?.requestId,
        body.data?.details,
    )
}

export const translationsClient = {
    async list({ page, pageSize }: { page: number; pageSize: number }) {
        const response = await fetch(url(`/translations?page=${page}&pageSize=${pageSize}`), {
            headers: await authHeaderValues(),
        })
        if (!response.ok) await throwApiError(response)
        return response.json() as Promise<{
            items: TranslationResponse[]
            page: number
            pageSize: number
            total: number
        }>
    },

    async delete(id: string) {
        const response = await fetch(url(`/translations/${id}`), {
            method: "DELETE",
            headers: await authHeaderValues(),
        })
        if (!response.ok) await throwApiError(response)
        return response.json() as Promise<{ id: string }>
    },

    async recognizeImage(input: { imageBase64: string; mediaType: RecognizeImageMediaType }) {
        const headers = await authHeaderValues()
        headers["Content-Type"] = "application/json"
        const response = await fetch(url("/recognize-image"), {
            method: "POST",
            headers,
            body: JSON.stringify(input),
        })
        if (!response.ok) await throwApiError(response)
        return response.json() as Promise<{ recognizedText: string }>
    },
}

export const listTranslations = (page: number, pageSize: number) =>
    translationsClient.list({ page, pageSize })
export const deleteTranslation = (id: string) => translationsClient.delete(id)
export const recognizeImage = (input: {
    imageBase64: string
    mediaType: RecognizeImageMediaType
}) => translationsClient.recognizeImage(input)

function parseFrame(frame: string) {
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
    const response = await fetch(url("/translate"), {
        method: "POST",
        headers: {
            ...(await authHeaderValues()),
            "content-type": "application/json",
            accept: "text/event-stream",
        },
        body: JSON.stringify(input),
    })
    if (!response.ok) await throwApiError(response)
    if (!response.body) throw new ApiError(response.status, "empty_stream", t("emptyStream"))

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
    throw new ApiError(502, "stream_closed", t("streamClosed"))
}
