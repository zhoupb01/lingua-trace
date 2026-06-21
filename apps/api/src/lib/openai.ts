import { env } from "@api/env"
import { AppError } from "@api/lib/errors"
import { getSecrets } from "@api/secrets"
import OpenAI from "openai"

let client: OpenAI | null = null

export async function getOpenAI(): Promise<OpenAI> {
    if (client) return client
    const { OPENAI_API_KEY } = await getSecrets()
    if (!OPENAI_API_KEY) {
        throw new AppError(500, "INTERNAL", "OPENAI_API_KEY missing from OpenBao KV")
    }
    client = new OpenAI({
        apiKey: OPENAI_API_KEY,
        baseURL: env.OPENAI_BASE_URL,
    })
    return client
}
