import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

export const users = pgTable(
    "users",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        logtoSub: text("logto_sub").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [uniqueIndex("users_logto_sub_idx").on(table.logtoSub)],
)
