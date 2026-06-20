import { env } from "@api/env"

// Minimal OpenBao (Vault-compatible) client: AppRole login, DB static creds, KV v2.

type CachedToken = { value: string; expiresAt: number }
let cached: CachedToken | null = null

async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${env.OPENBAO_ADDR}/v1/${path}`, init)
    if (!res.ok) {
        throw new Error(`OpenBao ${path} -> ${res.status} ${await res.text()}`)
    }
    return (await res.json()) as T
}

async function token(): Promise<string> {
    if (cached && Date.now() < cached.expiresAt - 10_000) return cached.value
    const json = await call<{ auth: { client_token: string; lease_duration: number } }>(
        `auth/${env.OPENBAO_APPROLE_MOUNT}/login`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                role_id: env.OPENBAO_ROLE_ID,
                secret_id: env.OPENBAO_SECRET_ID,
            }),
        },
    )
    cached = {
        value: json.auth.client_token,
        expiresAt: Date.now() + json.auth.lease_duration * 1000,
    }
    return cached.value
}

async function authed<T>(path: string): Promise<T> {
    return call<T>(path, { headers: { "x-vault-token": await token() } })
}

export type DbCreds = { username: string; password: string; ttl: number }

/** Postgres credentials from the database secrets engine (static role). */
export async function getDbCreds(): Promise<DbCreds> {
    const json = await authed<{ data: { username: string; password: string; ttl: number } }>(
        `${env.OPENBAO_DB_MOUNT}/static-creds/${env.OPENBAO_DB_ROLE}`,
    )
    return { username: json.data.username, password: json.data.password, ttl: json.data.ttl }
}

/** Arbitrary secrets (API keys, ...) from KV v2 at `<mount>/data/<path>`. */
export async function getSecrets(): Promise<Record<string, string>> {
    const json = await authed<{ data: { data: Record<string, string> } }>(
        `${env.OPENBAO_KV_MOUNT}/data/${env.OPENBAO_KV_PATH}`,
    )
    return json.data.data
}
