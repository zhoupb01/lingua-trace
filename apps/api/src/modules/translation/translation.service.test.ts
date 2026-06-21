import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test"
import * as account from "@api/modules/account/account.schema"
import * as translation from "@api/modules/translation/translation.schema"
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"

const client = new PGlite()
const db = drizzle(client, { schema: { ...account, ...translation } })

mock.module("@api/db", () => ({ getDb: async () => db }))

const service = await import("@api/modules/translation/translation.service")

const user1Id = "11111111-1111-4111-8111-111111111111"
const user2Id = "22222222-2222-4222-8222-222222222222"

beforeAll(async () => {
    await migrate(db, { migrationsFolder: `${import.meta.dir}/../../../drizzle` })
})

beforeEach(async () => {
    await db.insert(account.users).values([
        { id: user1Id, logtoSub: "u1" },
        { id: user2Id, logtoSub: "u2" },
    ])
})

afterEach(async () => {
    await db.delete(translation.translationUsageDaily)
    await db.delete(translation.translations)
    await db.delete(account.users)
})

afterAll(async () => {
    await client.close()
})

describe("translation.service", () => {
    test("saves, lists, and deletes records by current user", async () => {
        const created = await service.saveTranslationRecord(
            user1Id,
            " hello ",
            "你好",
            "Simplified Chinese",
        )
        await service.saveTranslationRecord(user2Id, "secret", "秘密", "Simplified Chinese")

        expect(created).not.toHaveProperty("userId")
        expect(created.sourceText).toBe("hello")

        const list = await service.listTranslations(user1Id, 1, 50)
        expect(list.total).toBe(1)
        expect(list.items.map((item) => item.id)).toEqual([created.id])

        await expect(service.deleteTranslation(user2Id, created.id)).rejects.toMatchObject({
            status: 404,
        })
        await expect(service.deleteTranslation(user1Id, created.id)).resolves.toEqual({
            id: created.id,
        })
    })

    test("reserves daily usage per Shanghai date", async () => {
        await expect(
            service.reserveDailyTranslationUsage(user1Id, new Date("2026-06-20T15:59:59.000Z")),
        ).resolves.toBe(1)
        await expect(
            service.reserveDailyTranslationUsage(user1Id, new Date("2026-06-20T16:00:00.000Z")),
        ).resolves.toBe(1)
    })

    test("builds OpenAI image OCR payload", () => {
        const params = service.buildRecognizeImageParams({
            imageBase64: "ZmFrZQ==",
            mediaType: "image/png",
        })

        expect(params.stream).toBeUndefined()
        expect(params.instructions).toContain("提取图片")
        expect(JSON.stringify(params.input)).toContain("data:image/png;base64,ZmFrZQ==")
        expect(JSON.stringify(params.input)).toContain("提取这张图片中所有可见文字")
    })

    test("rejects empty OCR result", async () => {
        const openai = {
            responses: {
                create: async () => ({
                    output_text: "   ",
                    error: null,
                    incomplete_details: null,
                }),
            },
        } as never

        await expect(
            service.recognizeImageText(
                { imageBase64: "ZmFrZQ==", mediaType: "image/png" },
                undefined,
                openai,
            ),
        ).rejects.toMatchObject({
            status: 422,
            code: "IMAGE_NO_TEXT_DETECTED",
        })
    })
})
