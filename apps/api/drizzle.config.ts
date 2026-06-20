import { defineConfig } from "drizzle-kit"

// Used by drizzle-kit at dev time. `generate` needs no DB; `migrate`/`studio`
// get their connection from OpenBao via scripts/db.ts, which injects DATABASE_URL.
// Runtime migrations on boot also use OpenBao creds — see src/db/index.ts.
export default defineConfig({
    schema: "./src/modules/**/*.schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL ?? "",
    },
})
