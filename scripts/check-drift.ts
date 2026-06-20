import { Glob } from "bun"

// CI guard for doc/config drift that typecheck + tests structurally can't see (shell,
// README, .env.example). Pure offline file reads; wired into `bun run ci`. Run from the
// template root. A degit'd project has no ../platform, so platform checks self-skip.
const errors: string[] = []
const read = (p: string) => Bun.file(p).text()
const exists = (p: string) => Bun.file(p).exists()

async function filesMatching(pattern: string): Promise<string[]> {
    const out: string[] = []
    for await (const f of new Glob(pattern).scan({ dot: true })) {
        if (!f.includes("node_modules")) out.push(f)
    }
    return out
}

// 1. Every env.ts schema key must be documented in .env.example (one direction only —
//    .env.example also carries deploy/VITE keys that aren't in the API's zod schema).
const envSrc = await read("apps/api/src/env.ts")
const exampleSrc = await read(".env.example")
const schemaKeys = [...envSrc.matchAll(/^[ \t]+([A-Z][A-Z0-9_]+):\s*z\b/gm)].map((m) => m[1])
const documented = new Set([...exampleSrc.matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]))
for (const key of schemaKeys) {
    if (!documented.has(key)) errors.push(`.env.example is missing ${key} (declared in env.ts)`)
}

// 2. The OpenBao KV key the app READS must match what provisioning WRITES.
const KV_KEY = "OPENAI_API_KEY"
if (!(await read("apps/api/src/lib/llm.ts")).includes(KV_KEY)) {
    errors.push(`lib/llm.ts no longer reads ${KV_KEY}`)
}
for (const p of ["../platform/provision.sh", "../platform/README.md"]) {
    if ((await exists(p)) && !(await read(p)).includes(KV_KEY)) {
        errors.push(`${p} no longer references ${KV_KEY}`)
    }
}

// 3. No stray ANTHROPIC — this template is OpenAI-only; a leftover key name is the
//    classic copy-paste drift. (Scans source + top-level docs + provisioning.)
const sourceFiles = [
    ...(await filesMatching("apps/api/src/**/*.ts")),
    ...(await filesMatching("apps/web/src/**/*.ts")),
    ...(await filesMatching("apps/web/src/**/*.tsx")),
    "README.md",
    "CLAUDE.md",
    ".env.example",
]
for (const p of ["../platform/provision.sh", "../platform/README.md"]) {
    if (await exists(p)) sourceFiles.push(p)
}
for (const f of sourceFiles) {
    if (/anthropic/i.test(await read(f))) {
        errors.push(`${f} mentions ANTHROPIC — this template is OpenAI-only`)
    }
}

// 4. The server port comes from env, never a hardcoded literal.
if (!(await read("apps/api/src/index.ts")).includes("env.PORT")) {
    errors.push("apps/api/src/index.ts should bind Bun.serve to env.PORT")
}
for (const f of await filesMatching("apps/api/src/**/*.ts")) {
    if (f.endsWith("env.ts")) continue
    if (/\bport:\s*\d/.test(await read(f))) errors.push(`${f} hardcodes a port — use env.PORT`)
}

if (errors.length > 0) {
    console.error(`drift check failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`)
    process.exit(1)
}
console.log("drift check passed")
