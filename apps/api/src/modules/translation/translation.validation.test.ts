import { describe, expect, test } from "bun:test"
import { AppError } from "@api/lib/errors"
import { parseRecognizeImageBody } from "@api/modules/translation/translation.routes"

describe("translation request validation", () => {
    test("rejects image payloads over the decoded byte limit", () => {
        expect(() =>
            parseRecognizeImageBody({
                imageBase64: Buffer.alloc(6 * 1024 * 1024 + 1).toString("base64"),
                mediaType: "image/png",
            }),
        ).toThrow(AppError)

        try {
            parseRecognizeImageBody({
                imageBase64: Buffer.alloc(6 * 1024 * 1024 + 1).toString("base64"),
                mediaType: "image/png",
            })
        } catch (err) {
            expect(err).toMatchObject({ status: 413, code: "IMAGE_TOO_LARGE" })
        }
    })
})
