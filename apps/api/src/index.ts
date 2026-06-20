import { app } from "@api/app"
import { closeDb, runMigrations } from "@api/db"
import { env } from "@api/env"
import { log } from "@api/lib/log"
import { abortAll } from "@api/modules/chat/chat.tasks"
import { startWorker } from "@api/worker"

// `bun server.js migrate` applies pending migrations then exits — used in dev and
// on the server (the image bundles ./drizzle). Plain `bun server.js` just serves;
// migrations are never run on boot.
if (process.argv[2] === "migrate") {
    try {
        await runMigrations()
    } catch (err) {
        log.fatal({ err }, "migration failed")
        process.exit(1)
    }
    await closeDb()
    process.exit(0)
}

const server = Bun.serve({ port: env.PORT, fetch: app.fetch })
const worker = startWorker()
log.info({ port: server.port }, "api listening (worker running in-process)")

let shuttingDown = false
async function shutdown(): Promise<void> {
    if (shuttingDown) return // a second signal shouldn't re-enter
    shuttingDown = true
    abortAll() // stop in-flight LLM runs now (the user message persisted; clients resume from history)
    await server.stop(true) // force-close connections — open SSE streams never end on their own
    await worker.stop() // let the current worker batch finish…
    await closeDb() // …then drain the pool, after nothing else touches it
    process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
