import { getDb } from "@api/db"
import { log } from "@api/lib/log"
import { sql } from "drizzle-orm"

const POLL_INTERVAL_MS = 10_000
const workerLog = log.child({ component: "worker" })

async function processBatch(): Promise<void> {
    const db = await getDb()
    // Replace `select 1` with real job logic. CLAIM rows atomically — a plain
    // `select … where status='pending'` lets a second worker (or a restart mid-batch)
    // pick up the same job and reprocess it forever. `for update skip locked` hands
    // each pending row to exactly one worker; mark it done/failed when it finishes.
    // (Job tables live in a module's *.schema.ts, aggregated by `@api/db`.)
    //
    //   const claimed = await db.execute(sql`
    //     update jobs set status = 'running'
    //     where id in (
    //       select id from jobs where status = 'pending'
    //       order by created_at for update skip locked limit 10
    //     )
    //     returning *`)
    //   for (const job of claimed) {
    //     try {
    //       await handle(job) // IO-bound work
    //       await db.execute(sql`update jobs set status = 'done' where id = ${job.id}`)
    //     } catch (err) {
    //       workerLog.error({ err, job: job.id }, "job failed")
    //       await db.execute(sql`update jobs set status = 'failed' where id = ${job.id}`)
    //     }
    //   }
    await db.execute(sql`select 1`)
}

// Runs in the SAME process as the api (started from index.ts) — no separate
// service or image. Keep jobs IO-bound; they share the api's event loop.
// Returns stop() — await it on shutdown to let the in-flight batch finish.
export function startWorker(): { stop: () => Promise<void> } {
    let running = true
    let wake: (() => void) | null = null
    workerLog.info("worker started (in-process)")

    const loop = (async () => {
        while (running) {
            try {
                await processBatch()
            } catch (err) {
                workerLog.error({ err }, "worker batch failed")
            }
            if (!running) break
            // Interruptible idle so shutdown doesn't wait out the full poll interval.
            await new Promise<void>((resolve) => {
                const timer = setTimeout(resolve, POLL_INTERVAL_MS)
                wake = () => {
                    clearTimeout(timer)
                    resolve()
                }
            })
            wake = null
        }
    })()

    return {
        stop: async () => {
            running = false
            wake?.() // cut the idle short
            await loop // wait for the current batch to drain before returning
        },
    }
}
