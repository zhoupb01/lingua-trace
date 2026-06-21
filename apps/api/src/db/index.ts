import { existsSync } from "node:fs"
import { env } from "@api/env"
import { log } from "@api/lib/log"
import * as account from "@api/modules/account/account.schema"
import * as translation from "@api/modules/translation/translation.schema"
import { type DbCreds, getDbCreds } from "@api/secrets"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

// Every module's *.schema.ts is aggregated here so Drizzle sees all tables.
const schema = { ...account, ...translation }

export type DB = PostgresJsDatabase<typeof schema>

// OpenBao rotates the static role's password. Instead of rebuilding the pool on
// a timer (which races the rotation), we hand postgres-js a password *callback*:
// it runs for every NEW connection, so connections opened after a rotation pick
// up the fresh password automatically, while existing connections keep working
// (Postgres doesn't drop sessions when a role's password changes).
//
// The password is cached for (most of) the credential's TTL — honoring what OpenBao
// returns and refreshing a few seconds early — so a burst of new connections doesn't
// hammer OpenBao yet we never serve a password past its lease. Single-flight so
// concurrent cache misses share one OpenBao read.
const CRED_TTL_LEAD_MS = 5_000 // refresh this long before the lease actually ends
const CRED_FALLBACK_TTL_MS = 10_000 // when OpenBao reports a zero/absent ttl

let cached: { value: string; until: number } | null = null
let pwInflight: Promise<string> | null = null

function cacheCreds(creds: DbCreds): string {
    const ttlMs = creds.ttl > 0 ? creds.ttl * 1000 - CRED_TTL_LEAD_MS : CRED_FALLBACK_TTL_MS
    cached = { value: creds.password, until: Date.now() + Math.max(ttlMs, 1_000) }
    return creds.password
}

async function currentPassword(): Promise<string> {
    if (cached && Date.now() < cached.until) return cached.value
    pwInflight ??= getDbCreds()
        .then(cacheCreds)
        .finally(() => {
            pwInflight = null
        })
    return pwInflight
}

let db: DB | null = null
let sql: ReturnType<typeof postgres> | null = null
let dbInflight: Promise<DB> | null = null

async function init(): Promise<DB> {
    // One fetch warms the password cache and gives us the (stable) username.
    const creds = await getDbCreds()
    cacheCreds(creds)
    sql = postgres({
        host: env.PG_HOST,
        port: env.PG_PORT,
        database: env.PG_DATABASE,
        username: creds.username,
        password: currentPassword, // re-read per connection → survives rotation
        max: 10,
    })
    db = drizzle(sql, { schema })
    return db
}

export async function getDb(): Promise<DB> {
    if (db) return db
    // Single-flight: concurrent first callers share one init so we never build two pools.
    dbInflight ??= init().finally(() => {
        dbInflight = null
    })
    return dbInflight
}

function isAuthFailure(err: unknown): boolean {
    // Postgres 28P01 = invalid_password: the cached credential was rotated out from
    // under us (out-of-band rotation; normal rotation is handled by the TTL cache).
    return (err as { code?: string })?.code === "28P01"
}

// Run a DB op, retrying once on an auth failure after dropping the cached password so
// a fresh connection re-reads from OpenBao. Use it for boot / hot paths that must
// survive an out-of-band credential rotation (normal rotation needs no retry).
export async function withDbCredRetry<T>(fn: (db: DB) => Promise<T>): Promise<T> {
    try {
        return await fn(await getDb())
    } catch (err) {
        if (!isAuthFailure(err)) throw err
        cached = null
        return fn(await getDb())
    }
}

// Drain the pool on shutdown so in-flight queries finish and sockets close cleanly.
export async function closeDb(): Promise<void> {
    await sql?.end({ timeout: 5 })
    sql = null
    db = null
    cached = null
    dbInflight = null
}

// Apply pending migrations from ./drizzle. NOT run on boot — invoked explicitly via
// the `migrate` subcommand (`bun server.js migrate`), used in dev and on the server.
export async function runMigrations(): Promise<void> {
    // No migrations generated yet → skip (avoids a missing meta/_journal.json crash).
    if (!existsSync("./drizzle/meta/_journal.json")) {
        log.info("no migrations to run")
        return
    }
    await withDbCredRetry((db) => migrate(db, { migrationsFolder: "./drizzle" }))
}
