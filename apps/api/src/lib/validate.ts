import { AppError } from "@api/lib/errors"
import { zValidator } from "@hono/zod-validator"
import type { ValidationTargets } from "hono"
import { z } from "zod"

// Use this instead of `zValidator` directly: on failure it throws AppError(400),
// so the standard error body + logging in app.onError applies and zValidator's
// verbose default 400 shape is bypassed. Validated input stays fully typed via
// `c.req.valid(target)`.
export function validate<T extends z.ZodType, Target extends keyof ValidationTargets>(
    target: Target,
    schema: T,
) {
    return zValidator(target, schema, (result) => {
        if (!result.success) {
            throw new AppError(400, "VALIDATION_ERROR", "validation failed", {
                fieldErrors: z.flattenError(result.error).fieldErrors,
            })
        }
    })
}
