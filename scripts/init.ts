// One-time project bootstrap — run once after `degit` + `bun install`:
//   bun run init <name>
// Replaces the {{project}} placeholder, names the root package, and (if missing)
// seeds .env from .env.example with your slug. Leaves the @app/api / @app/web
// workspace names alone — they're referenced by `bun --filter`, the workspace
// dependency, and the `@app/api` RPC type import. Idempotent: re-running is a no-op.
const raw = process.argv[2]
if (!raw) {
    console.error("usage: bun run init <name>   (e.g. bun run init my-idea)")
    process.exit(1)
}
const slug = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
if (!slug) {
    console.error(`"${raw}" has no letters or digits to build a project slug from`)
    process.exit(1)
}

// 1. README title placeholder
const readme = await Bun.file("README.md").text()
if (readme.includes("{{project}}")) {
    await Bun.write("README.md", readme.replaceAll("{{project}}", slug))
    console.log(`README.md → # ${slug}`)
}

// 2. Root package name (NOT the @app/* workspaces — those are load-bearing)
const pkg = await Bun.file("package.json").text()
const renamed = pkg.replace(/"name":\s*"[^"]*"/, `"name": "${slug}"`)
if (renamed !== pkg) {
    await Bun.write("package.json", renamed)
    console.log(`package.json name → ${slug}`)
}

// 3. Seed .env from .env.example (only if absent), swapping the example slug
if (await Bun.file(".env").exists()) {
    console.log(".env already exists — left untouched")
} else {
    const example = await Bun.file(".env.example").text()
    await Bun.write(".env", example.replaceAll("myapp", slug))
    console.log(`.env created from .env.example (PROJECT_SLUG=${slug}) — fill in the blanks`)
}

console.log(
    "\nDone. Next: provision infra (see platform/README.md), fill OPENBAO_*/LOGTO_* in .env, then run: bun dev",
)
