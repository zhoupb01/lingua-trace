import { users } from "@api/modules/account/account.schema"
import {
    date,
    index,
    integer,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core"

export const translations = pgTable(
    "translations",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id),
        sourceText: text("source_text").notNull(),
        translatedText: text("translated_text").notNull(),
        targetLanguage: text("target_language").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index("translations_user_created_idx").on(table.userId, table.createdAt)],
)

export const translationUsageDaily = pgTable(
    "translation_usage_daily",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id),
        usageDate: date("usage_date", { mode: "string" }).notNull(),
        requestCount: integer("request_count").notNull().default(0),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("translation_usage_daily_user_date_idx").on(table.userId, table.usageDate),
    ],
)
