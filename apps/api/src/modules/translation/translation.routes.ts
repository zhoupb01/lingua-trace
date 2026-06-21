import { Buffer } from "node:buffer"
import { AppError, type ErrorCode } from "@api/lib/errors"
import { localizedMessage } from "@api/lib/i18n"
import { validate } from "@api/lib/validate"
import { auth, requireUser } from "@api/middleware/auth"
import {
    createTranslationFromStream,
    deleteTranslation,
    listTranslations,
    recognizeImageText,
    reserveDailyTranslationUsage,
} from "@api/modules/translation/translation.service"
import {
    createTranslationSchema,
    listTranslationsQuerySchema,
    MAX_RECOGNIZE_IMAGE_BODY_BYTES,
    MAX_RECOGNIZE_IMAGE_BYTES,
    recognizeImageMediaTypeSchema,
    recognizeImageSchema,
} from "@api/modules/translation/translation.types"
import type { Variables } from "@api/types"
import { type Context, Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { type ZodType, z } from "zod"

const TRANSLATE_BODY_LIMIT_BYTES = 128 * 1024
const TRANSLATION_REQUESTS_PER_MINUTE = 10
const IMAGE_RECOGNITION_REQUESTS_PER_MINUTE = 10

const minuteWindows = new Map<string, number[]>()
const activeStreams = new Set<string>()
const recognizeMinuteWindows = new Map<string, number[]>()
const activeRecognitions = new Set<string>()

type Ctx = Context<{ Variables: Variables }>

async function readJsonWithLimit(c: Ctx, limitBytes: number, err: AppError) {
    const contentLength = Number(c.req.header("content-length") ?? 0)
    if (Number.isFinite(contentLength) && contentLength > limitBytes) throw err

    const body = c.req.raw.body
    if (!body) throw new AppError(400, "VALIDATION_ERROR", "request body must be JSON")
    const reader = body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > limitBytes) {
            await reader.cancel()
            throw err
        }
        chunks.push(value)
    }
    try {
        return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)))
    } catch {
        throw new AppError(400, "VALIDATION_ERROR", "request body must be valid JSON")
    }
}

function enforceMinuteRateLimit(userId: string, windows: Map<string, number[]>, limit: number) {
    const now = Date.now()
    const current = (windows.get(userId) ?? []).filter((timestamp) => now - timestamp < 60_000)
    if (current.length >= limit) {
        throw new AppError(
            429,
            "TRANSLATION_RATE_LIMITED",
            "Too many translation requests. Please slow down.",
        )
    }
    current.push(now)
    windows.set(userId, current)
}

function enter(set: Set<string>, userId: string) {
    if (set.has(userId)) {
        throw new AppError(
            429,
            "TRANSLATION_CONCURRENCY_LIMITED",
            "Another translation is already running.",
        )
    }
    set.add(userId)
}

export function parseRecognizeImageBody(value: unknown) {
    if (!value || typeof value !== "object") {
        throw new AppError(400, "VALIDATION_ERROR", "bad request")
    }
    const payload = value as Record<string, unknown>
    const mediaType = typeof payload.mediaType === "string" ? payload.mediaType : ""
    if (!recognizeImageMediaTypeSchema.safeParse(mediaType).success) {
        throw new AppError(400, "IMAGE_UNSUPPORTED_TYPE", "Unsupported image type.")
    }
    const body = parseOrValidationError(recognizeImageSchema, payload)
    if (Buffer.from(body.imageBase64, "base64").byteLength > MAX_RECOGNIZE_IMAGE_BYTES) {
        throw new AppError(413, "IMAGE_TOO_LARGE", "Image is too large.")
    }
    return body
}

function parseOrValidationError<T>(schema: ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value)
    if (!result.success) {
        throw new AppError(400, "VALIDATION_ERROR", "validation failed", {
            fieldErrors: z.flattenError(result.error).fieldErrors,
        })
    }
    return result.data
}

const STREAM_MESSAGE_KEYS: Partial<Record<ErrorCode, string>> = {
    TRANSLATION_EMPTY_TEXT: "translation_empty_text",
    TRANSLATION_EMPTY_RESULT: "translation_empty_result",
    TRANSLATION_TRUNCATED: "translation_truncated",
    TRANSLATION_RATE_LIMITED: "translation_rate_limited",
    TRANSLATION_CONCURRENCY_LIMITED: "translation_concurrency_limited",
    TRANSLATION_DAILY_QUOTA_EXCEEDED: "translation_daily_quota_exceeded",
    TRANSLATION_SAVE_FAILED: "translation_save_failed",
    AI_UPSTREAM_ERROR: "ai_upstream_error",
    INTERNAL: "internal_error",
}

function streamErrorBody(err: unknown, requestId: string, locale: Ctx["var"]["locale"]) {
    if (err instanceof AppError) {
        const key = STREAM_MESSAGE_KEYS[err.code] ?? err.code.toLowerCase()
        return { code: err.code, message: localizedMessage(locale, key, err.message), requestId }
    }
    return {
        code: "INTERNAL" satisfies ErrorCode,
        message: localizedMessage(locale, "internal_error", "internal error"),
        requestId,
    }
}

export const translation = new Hono<{ Variables: Variables }>()
    .get("/translations", auth, validate("query", listTranslationsQuerySchema), async (c) => {
        const userId = requireUser(c).id
        const { page, pageSize } = c.req.valid("query")
        return c.json(await listTranslations(userId, page, pageSize))
    })
    .delete(
        "/translations/:id",
        auth,
        validate("param", z.object({ id: z.string().uuid() })),
        async (c) => {
            return c.json(await deleteTranslation(requireUser(c).id, c.req.valid("param").id))
        },
    )
    .post("/recognize-image", auth, async (c) => {
        const userId = requireUser(c).id
        const body = parseRecognizeImageBody(
            await readJsonWithLimit(
                c,
                MAX_RECOGNIZE_IMAGE_BODY_BYTES,
                new AppError(413, "IMAGE_TOO_LARGE", "Image is too large."),
            ),
        )
        enforceMinuteRateLimit(
            userId,
            recognizeMinuteWindows,
            IMAGE_RECOGNITION_REQUESTS_PER_MINUTE,
        )
        enter(activeRecognitions, userId)
        try {
            return c.json({ recognizedText: await recognizeImageText(body, c.req.raw.signal) })
        } finally {
            activeRecognitions.delete(userId)
        }
    })
    .post("/translate", auth, async (c) => {
        const userId = requireUser(c).id
        const requestId = c.get("requestId")
        const body = parseOrValidationError(
            createTranslationSchema,
            await readJsonWithLimit(
                c,
                TRANSLATE_BODY_LIMIT_BYTES,
                new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large"),
            ),
        )
        enforceMinuteRateLimit(userId, minuteWindows, TRANSLATION_REQUESTS_PER_MINUTE)
        enter(activeStreams, userId)
        try {
            await reserveDailyTranslationUsage(userId)
        } catch (err) {
            activeStreams.delete(userId)
            throw err
        }

        return streamSSE(c, async (stream) => {
            const abortController = new AbortController()
            stream.onAbort(() => abortController.abort())
            try {
                const created = await createTranslationFromStream(
                    userId,
                    body.text,
                    body.targetLanguage,
                    (text) => stream.writeSSE({ event: "delta", data: JSON.stringify({ text }) }),
                    abortController.signal,
                )
                await stream.writeSSE({ event: "done", data: JSON.stringify(created) })
            } catch (err) {
                if (!stream.aborted) {
                    if (!(err instanceof AppError))
                        c.var.log.error({ err }, "translate stream error")
                    await stream.writeSSE({
                        event: "error",
                        data: JSON.stringify(streamErrorBody(err, requestId, c.var.locale)),
                    })
                }
            } finally {
                activeStreams.delete(userId)
            }
        })
    })
