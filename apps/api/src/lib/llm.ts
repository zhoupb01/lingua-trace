import { env } from "@api/env"
import { AppError } from "@api/lib/errors"
import { getSecrets } from "@api/secrets"
import { OpenAIProvider, setDefaultModelProvider, setTracingDisabled } from "@openai/agents"

// Shared LLM setup for the OpenAI Agents SDK. The API key comes from OpenBao KV
// (a secret); the model and base URL are config in env.ts. We install a default
// model provider (memoized) so `run()` resolves the agent's model name against it
// — OPENAI_BASE_URL (optional) lets you target an OpenAI-compatible endpoint.

// Whether the agent talks to the OpenAI Responses API (server-side state:
// previous_response_id, stored responses) vs Chat Completions. Default: true on
// OpenAI, false when a custom OPENAI_BASE_URL is set — most compatible endpoints
// implement only /chat/completions and the SDK's Chat Completions model rejects
// server-managed state. The chat module gates previous_response_id on this flag.
export const useResponsesApi = env.OPENAI_USE_RESPONSES ?? !env.OPENAI_BASE_URL

let ready = false

export async function ensureLLM(): Promise<void> {
    if (ready) return
    const { OPENAI_API_KEY } = await getSecrets()
    if (!OPENAI_API_KEY) {
        throw new AppError(500, "INTERNAL", "OPENAI_API_KEY missing from OpenBao KV")
    }
    setDefaultModelProvider(
        new OpenAIProvider({
            apiKey: OPENAI_API_KEY,
            baseURL: env.OPENAI_BASE_URL,
            useResponses: useResponsesApi,
        }),
    )
    // Self-hosted: don't upload run traces to OpenAI's backend (the exporter looks
    // for its own key and would otherwise warn "No API key … Exports will be
    // skipped"; with OPENAI_BASE_URL it could also point at a non-OpenAI endpoint).
    setTracingDisabled(true)
    ready = true
}
