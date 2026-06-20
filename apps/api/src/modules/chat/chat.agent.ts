import { env } from "@api/env"
import { tools } from "@api/modules/chat/chat.tools"
import { Agent } from "@openai/agents"

// The agent. The SDK runs the loop (LLM call → tool round-trips → final answer);
// there's no hand-written while/tool_use dispatch. `ensureLLM()` (lib/llm.ts) must
// run once before `run(agent, …)` so the OpenAI key + base URL are set. The model
// is config (env.OPENAI_MODEL); the provider resolves it at run time.
const SYSTEM = "You are a helpful assistant."

export const agent = new Agent({
    name: "assistant",
    instructions: SYSTEM,
    tools,
    model: env.OPENAI_MODEL,
})
