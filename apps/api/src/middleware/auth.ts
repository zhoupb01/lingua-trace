import { env } from "@api/env"
import { AppError } from "@api/lib/errors"
import { findOrCreateUser } from "@api/modules/account/account.service"
import type { AuthUser, Variables } from "@api/types"
import type { Context } from "hono"
import { createMiddleware } from "hono/factory"
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose"

// Logto signs access tokens; we verify them against its JWKS.
const jwks = createRemoteJWKSet(new URL(`${env.LOGTO_ENDPOINT}/oidc/jwks`))

export const auth = createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const header = c.req.header("authorization")
    if (!header?.startsWith("Bearer ")) {
        throw new AppError(401, "UNAUTHORIZED", "missing bearer token")
    }

    let payload: JWTPayload
    try {
        payload = (
            await jwtVerify(header.slice(7), jwks, {
                issuer: `${env.LOGTO_ENDPOINT}/oidc`,
                audience: env.LOGTO_API_RESOURCE,
            })
        ).payload
    } catch (err) {
        if (err instanceof AppError) throw err
        throw new AppError(401, "INVALID_TOKEN", "invalid or expired token")
    }

    const identity = userFromJwtPayload(payload)
    const user = await findOrCreateUser(identity.logtoSub)
    c.set("user", { ...identity, id: user.id })
    await next()
})

export function userFromJwtPayload(payload: JWTPayload): Omit<AuthUser, "id"> {
    if (typeof payload.sub !== "string" || payload.sub.trim() === "") {
        throw new AppError(401, "INVALID_TOKEN", "invalid token subject")
    }
    return {
        sub: payload.sub,
        logtoSub: payload.sub,
        scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
        raw: payload as Record<string, unknown>,
    }
}

// Read the authenticated user, or throw 401. Use this in protected handlers instead
// of `c.get("user")` directly: Variables.user is optional (set only on routes that ran
// `auth`), so this is the one spot that turns "no user" into a clean 401 — and it keeps
// handlers from compiling against a user that an unguarded route never set.
export function requireUser(c: Context<{ Variables: Variables }>): AuthUser {
    const user = c.get("user")
    if (!user) throw new AppError(401, "UNAUTHORIZED", "authentication required")
    return user
}

// Authorization: run AFTER `auth` (it reads c.get("user")). 403 if the verified
// token's scopes don't include `scope`. Chain it: .use("*", auth).use("*", requireScope("translation:write")).
export const requireScope = (scope: string) =>
    createMiddleware<{ Variables: Variables }>(async (c, next) => {
        const user = requireUser(c)
        if (!user.scopes.includes(scope)) {
            throw new AppError(403, "FORBIDDEN", `missing required scope: ${scope}`)
        }
        await next()
    })
