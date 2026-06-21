import { localizedMessage, resolveRequestLocale } from "@api/lib/i18n"
import { log } from "@api/lib/log"
import type { Variables } from "@api/types"
import type { Context } from "hono"
import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"

// Machine-readable error codes. HTTP status is the coarse signal, `code` is the
// specific one the client switches on. Extend as the app grows.
export type ErrorCode =
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "INVALID_TOKEN"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "RATE_LIMITED"
    | "PAYLOAD_TOO_LARGE"
    | "TRANSLATION_NOT_CONFIGURED"
    | "TRANSLATION_EMPTY_TEXT"
    | "TRANSLATION_EMPTY_RESULT"
    | "TRANSLATION_TRUNCATED"
    | "TRANSLATION_RATE_LIMITED"
    | "TRANSLATION_CONCURRENCY_LIMITED"
    | "TRANSLATION_DAILY_QUOTA_EXCEEDED"
    | "TRANSLATION_SAVE_FAILED"
    | "TRANSLATION_NOT_FOUND"
    | "IMAGE_TOO_LARGE"
    | "IMAGE_UNSUPPORTED_TYPE"
    | "IMAGE_NO_TEXT_DETECTED"
    | "AI_UPSTREAM_ERROR"
    | "INTERNAL"

// Throw this for any expected failure (routes, services, middleware); app.onError
// renders it. `details` is extra structured context (e.g. zod field errors) —
// keep it serializable and free of secrets.
export class AppError extends Error {
    constructor(
        readonly status: ContentfulStatusCode,
        readonly code: ErrorCode,
        message: string,
        readonly details?: unknown,
    ) {
        super(message)
        this.name = "AppError"
    }
}

type ErrorBody = { code: ErrorCode; message: string; requestId: string; details?: unknown }
type Ctx = Context<{ Variables: Variables }>

const STATUS_CODE: Record<number, ErrorCode> = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    429: "RATE_LIMITED",
}

const MESSAGE_KEYS: Partial<Record<ErrorCode, string>> = {
    VALIDATION_ERROR: "validation_failed",
    UNAUTHORIZED: "unauthorized",
    INVALID_TOKEN: "invalid_token",
    FORBIDDEN: "forbidden",
    NOT_FOUND: "not_found",
    PAYLOAD_TOO_LARGE: "payload_too_large",
    TRANSLATION_NOT_CONFIGURED: "translation_not_configured",
    TRANSLATION_EMPTY_TEXT: "translation_empty_text",
    TRANSLATION_EMPTY_RESULT: "translation_empty_result",
    TRANSLATION_TRUNCATED: "translation_truncated",
    TRANSLATION_RATE_LIMITED: "translation_rate_limited",
    TRANSLATION_CONCURRENCY_LIMITED: "translation_concurrency_limited",
    TRANSLATION_DAILY_QUOTA_EXCEEDED: "translation_daily_quota_exceeded",
    TRANSLATION_SAVE_FAILED: "translation_save_failed",
    TRANSLATION_NOT_FOUND: "translation_not_found",
    IMAGE_TOO_LARGE: "image_too_large",
    IMAGE_UNSUPPORTED_TYPE: "image_unsupported_type",
    IMAGE_NO_TEXT_DETECTED: "image_no_text_detected",
    AI_UPSTREAM_ERROR: "ai_upstream_error",
    INTERNAL: "internal_error",
}

function responseMessage(c: Ctx, code: ErrorCode, fallback: string) {
    const locale = c.get("locale") ?? resolveRequestLocale(c.req.header?.("Accept-Language"))
    return localizedMessage(locale, MESSAGE_KEYS[code] ?? code.toLowerCase(), fallback)
}

// The single place that turns a thrown error into an HTTP response + a log line.
// Success responses stay bare (Hono RPC); only failures get this envelope.
export function onError(err: Error, c: Ctx): Response {
    const requestId = c.get("requestId") ?? ""
    const logger = c.get("log") ?? log
    const start = c.get("start")
    const where = {
        method: c.req.method,
        path: c.req.path,
        ms: start ? Math.round(performance.now() - start) : undefined,
    }

    const status: ContentfulStatusCode =
        err instanceof AppError ? err.status : err instanceof HTTPException ? err.status : 500
    const code: ErrorCode = err instanceof AppError ? err.code : (STATUS_CODE[status] ?? "INTERNAL")
    // Curated messages pass through; unexpected errors never leak internals.
    const fallback =
        err instanceof AppError || err instanceof HTTPException ? err.message : "internal error"
    const message = responseMessage(c, code, fallback)

    if (status >= 500) logger.error({ ...where, status, code, err }, message)
    else logger.warn({ ...where, status, code }, message)

    const body: ErrorBody = { code, message, requestId }
    if (err instanceof AppError && err.details !== undefined) body.details = err.details
    return c.json(body, status)
}

export function notFound(c: Ctx): Response {
    return c.json(
        {
            code: "NOT_FOUND",
            message: responseMessage(c, "NOT_FOUND", "not found"),
            requestId: c.get("requestId") ?? "",
        } satisfies ErrorBody,
        404,
    )
}
