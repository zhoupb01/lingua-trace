import { type DB, getDb } from "@api/db"
import { AppError } from "@api/lib/errors"
import { users } from "@api/modules/account/account.schema"

export type User = typeof users.$inferSelect

export async function findOrCreateUser(logtoSub: string, db?: DB): Promise<User> {
    const conn = db ?? (await getDb())
    const [user] = await conn
        .insert(users)
        .values({ logtoSub })
        .onConflictDoUpdate({
            target: users.logtoSub,
            set: { logtoSub },
        })
        .returning()
    if (!user) throw new AppError(500, "INTERNAL", "failed to resolve current user")
    return user
}
