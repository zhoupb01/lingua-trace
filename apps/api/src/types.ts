import type { Logger } from "pino"

export type AuthUser = {
    sub: string
    scopes: string[]
    raw: Record<string, unknown>
}

export type Variables = {
    // Set by app-level middleware (request-id + logger) — available on every request.
    requestId: string
    start: number
    log: Logger
    // Set by the auth middleware on protected routes only — so it's optional here.
    // In a protected handler, read it via requireUser(c) (middleware/auth.ts) rather
    // than c.get("user"), so an unguarded route can't pretend a user exists.
    user?: AuthUser
}
