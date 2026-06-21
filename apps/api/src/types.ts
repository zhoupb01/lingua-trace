import type { AppLocale } from "@api/lib/i18n"
import type { Logger } from "pino"

export type AuthUser = {
    id: string
    sub: string
    logtoSub: string
    scopes: string[]
    raw: Record<string, unknown>
}

export type Variables = {
    // Set by app-level middleware (request-id + logger) — available on every request.
    requestId: string
    start: number
    log: Logger
    locale: AppLocale
    // Set by the auth middleware on protected routes only — so it's optional here.
    // In a protected handler, read it via requireUser(c) (middleware/auth.ts) rather
    // than c.get("user"), so an unguarded route can't pretend a user exists.
    user?: AuthUser
}
