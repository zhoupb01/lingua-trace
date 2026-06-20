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
    const message =
        err instanceof AppError || err instanceof HTTPException ? err.message : "internal error"

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
            message: "not found",
            requestId: c.get("requestId") ?? "",
        } satisfies ErrorBody,
        404,
    )
}
