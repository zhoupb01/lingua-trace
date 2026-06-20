// Test environment — loaded before any test file (see bunfig.toml [test] preload),
// so importing modules that parse env at load time (env.ts) doesn't throw.
// `??=` keeps any real env you've exported.
process.env.LOG_LEVEL ??= "silent"
process.env.OPENBAO_ADDR ??= "http://openbao.test"
process.env.OPENBAO_ROLE_ID ??= "test-role-id"
process.env.OPENBAO_SECRET_ID ??= "test-secret-id"
process.env.OPENBAO_KV_PATH ??= "test/dev"
process.env.OPENBAO_DB_ROLE ??= "test-dev"
process.env.PG_DATABASE ??= "test-dev"
process.env.LOGTO_ENDPOINT ??= "https://auth.test"
process.env.LOGTO_API_RESOURCE ??= "https://api.test"

// Pin the LLM mode so tests don't inherit it from a local `.env` (Bun auto-loads one).
// `useResponsesApi` derives from OPENAI_BASE_URL — a developer pointing at an
// OpenAI-compatible endpoint would otherwise flip it off and break the chat tests that
// exercise the Responses-API path (previous_response_id). The LLM itself is always mocked.
process.env.OPENAI_USE_RESPONSES ??= "true"
