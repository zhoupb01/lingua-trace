import { z } from "zod"

const Env = z.object({
    PORT: z.coerce.number().default(3000),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),

    // OpenBao (AppRole login -> DB static creds + KV)
    OPENBAO_ADDR: z.url(),
    OPENBAO_APPROLE_MOUNT: z.string().default("approle"),
    OPENBAO_ROLE_ID: z.string().min(1),
    OPENBAO_SECRET_ID: z.string().min(1),
    OPENBAO_KV_MOUNT: z.string().default("kv"),
    OPENBAO_KV_PATH: z.string().min(1),
    OPENBAO_DB_MOUNT: z.string().default("database"),
    OPENBAO_DB_ROLE: z.string().min(1),

    // Postgres (shared instance, this project's own database)
    PG_HOST: z.string().default("postgres18"),
    PG_PORT: z.coerce.number().default(5432),
    PG_DATABASE: z.string().min(1),

    // Logto — issuer is `${LOGTO_ENDPOINT}/oidc`, audience is the API resource.
    // Strip a trailing slash so the issuer can't become `https://host//oidc`
    // (a natural copy from the browser would otherwise silently break every token).
    LOGTO_ENDPOINT: z.url().transform((s) => s.replace(/\/+$/, "")),
    LOGTO_API_RESOURCE: z.string().min(1),

    // OpenAI — the API key lives in OpenBao KV (secrets.ts); model and base URL are
    // non-secret config. OPENAI_BASE_URL is optional (default OpenAI), set it to
    // target an OpenAI-compatible endpoint.
    OPENAI_MODEL: z.string().default("gpt-5.1"),
    OPENAI_BASE_URL: z.url().optional(),
})

// safeParse → one actionable line per bad/missing var, instead of a raw ZodError
// stack at module load (env is parsed the moment anything imports this file).
const parsed = Env.safeParse(process.env)
if (!parsed.success) {
    console.error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
    process.exit(1)
}
export const env = parsed.data
export type Env = z.infer<typeof Env>
