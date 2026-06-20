import type { AppType } from "@app/api"
import type { ClientResponse } from "hono/client"
import { hc } from "hono/client"
import type { StatusCode } from "hono/utils/http-status"

// Typed Hono RPC client. Pass a Logto access token to authenticate.
export const api = (token?: string) =>
    hc<AppType>("/api", token ? { headers: { Authorization: `Bearer ${token}` } } : {})

type MaybePromise<T> = T | Promise<T>

// Mirrors the api's error body (apps/api/src/lib/errors.ts). Success responses
// are bare typed data; only failures carry this shape.
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

    static async fromResponse(res: {
        status: number
        statusText: string
        json(): Promise<unknown>
    }): Promise<ApiError> {
        // The error body is JSON in the standard shape; fall back gracefully if a
        // proxy/network layer returned something else (HTML 502, empty body, …).
        try {
            const b = (await res.json()) as {
                code?: string
                message?: string
                requestId?: string
                details?: unknown
            }
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
