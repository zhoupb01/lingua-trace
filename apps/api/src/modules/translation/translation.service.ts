import { type DB, getDb } from "@api/db"
import { todayShanghaiDateKey } from "@api/lib/dates"
import { AppError } from "@api/lib/errors"
import { streamTranslation } from "@api/modules/translation/translation.ai"
import { translations, translationUsageDaily } from "@api/modules/translation/translation.schema"
import type { TargetLanguage } from "@api/modules/translation/translation.types"
import { and, desc, eq, sql } from "drizzle-orm"

export {
    buildRecognizeImageParams,
    recognizeImageText,
    streamTranslation,
    type TranslationStreamChunk,
} from "@api/modules/translation/translation.ai"

export const TRANSLATION_REQUESTS_PER_DAY = 100

type Translation = typeof translations.$inferSelect

export function translationResponse(row: Translation) {
    return {
        id: row.id,
        sourceText: row.sourceText,
        translatedText: row.translatedText,
        targetLanguage: row.targetLanguage as TargetLanguage,
        createdAt: row.createdAt.toISOString(),
    }
}
export type TranslationResponse = ReturnType<typeof translationResponse>

export async function saveTranslationRecord(
    userId: string,
    sourceText: string,
    translatedText: string,
    targetLanguage: TargetLanguage,
    db?: DB,
): Promise<TranslationResponse> {
    const conn = db ?? (await getDb())
    const [created] = await conn
        .insert(translations)
        .values({ userId, sourceText: sourceText.trim(), translatedText, targetLanguage })
        .returning()
    if (!created)
        throw new AppError(500, "TRANSLATION_SAVE_FAILED", "Failed to save the translation record")
    return translationResponse(created)
}

export async function createTranslationFromStream(
    userId: string,
    sourceText: string,
    targetLanguage: TargetLanguage,
    onDelta: (text: string) => Promise<void>,
    signal?: AbortSignal,
    db?: DB,
) {
    const conn = db ?? (await getDb())
    const chunks: string[] = []
    for await (const chunk of streamTranslation(sourceText, targetLanguage, signal)) {
        chunks.push(chunk.text)
        await onDelta(chunk.text)
    }
    const translatedText = chunks.join("").trim()
    if (!translatedText) {
        throw new AppError(500, "TRANSLATION_EMPTY_RESULT", "The model returned no translation")
    }
    return saveTranslationRecord(userId, sourceText, translatedText, targetLanguage, conn)
}

export async function listTranslations(userId: string, page: number, pageSize: number, db?: DB) {
    const conn = db ?? (await getDb())
    const where = eq(translations.userId, userId)
    const [items, totalRows] = await Promise.all([
        conn
            .select()
            .from(translations)
            .where(where)
            .orderBy(desc(translations.createdAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        conn.select({ total: sql<number>`count(*)::int` }).from(translations).where(where),
    ])
    return {
        items: items.map(translationResponse),
        page,
        pageSize,
        total: totalRows[0]?.total ?? 0,
    }
}

export async function reserveDailyTranslationUsage(userId: string, now = new Date(), db?: DB) {
    const conn = db ?? (await getDb())
    const [row] = await conn
        .insert(translationUsageDaily)
        .values({ userId, usageDate: todayShanghaiDateKey(now), requestCount: 1 })
        .onConflictDoUpdate({
            target: [translationUsageDaily.userId, translationUsageDaily.usageDate],
            set: {
                requestCount: sql`${translationUsageDaily.requestCount} + 1`,
                updatedAt: sql`now()`,
            },
            where: sql`${translationUsageDaily.requestCount} < ${TRANSLATION_REQUESTS_PER_DAY}`,
        })
        .returning({ requestCount: translationUsageDaily.requestCount })
    if (!row) {
        throw new AppError(
            429,
            "TRANSLATION_DAILY_QUOTA_EXCEEDED",
            "Daily translation quota exceeded. Please try again tomorrow.",
        )
    }
    return row.requestCount
}

export async function deleteTranslation(userId: string, id: string, db?: DB) {
    const conn = db ?? (await getDb())
    const [deleted] = await conn
        .delete(translations)
        .where(and(eq(translations.id, id), eq(translations.userId, userId)))
        .returning({ id: translations.id })
    if (!deleted) throw new AppError(404, "TRANSLATION_NOT_FOUND", "Translation record not found")
    return deleted
}
