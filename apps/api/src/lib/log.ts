import { env } from "@api/env"
import { pino } from "pino"

// Structured JSON logger. Stays JSON in every environment (Docker captures
// stdout); for pretty local output the dev script pipes through pino-pretty.
// `redact` keeps tokens/secrets out of the logs even if an object carrying one
// is accidentally logged.
export const log = pino({
    level: env.LOG_LEVEL,
    redact: {
        paths: ["req.headers.authorization", "*.authorization", "*.token", "*.password"],
        remove: true,
    },
})
