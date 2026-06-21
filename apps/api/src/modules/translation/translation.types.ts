import { z } from "zod"

export const TARGET_LANGUAGES = [
    "Simplified Chinese",
    "English",
    "Japanese",
    "Korean",
    "French",
    "German",
    "Spanish",
    "Portuguese",
    "Italian",
    "Russian",
] as const

export type TargetLanguage = (typeof TARGET_LANGUAGES)[number]

export const DEFAULT_TARGET_LANGUAGE: TargetLanguage = "Simplified Chinese"

export const TARGET_LANGUAGE_LABELS: Record<TargetLanguage, string> = {
    "Simplified Chinese": "简体中文",
    English: "英文",
    Japanese: "日文",
    Korean: "韩文",
    French: "法文",
    German: "德文",
    Spanish: "西班牙文",
    Portuguese: "葡萄牙文",
    Italian: "意大利文",
    Russian: "俄文",
}

export const targetLanguageSchema = z.enum(TARGET_LANGUAGES)

export const SUPPORTED_IMAGE_MEDIA_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
] as const

export type RecognizeImageMediaType = (typeof SUPPORTED_IMAGE_MEDIA_TYPES)[number]

export const recognizeImageMediaTypeSchema = z.enum(SUPPORTED_IMAGE_MEDIA_TYPES)

export const MAX_RECOGNIZE_IMAGE_BYTES = 6 * 1024 * 1024
export const MAX_RECOGNIZE_IMAGE_BODY_BYTES = 10 * 1024 * 1024

export const createTranslationSchema = z.object({
    text: z.string().min(1).max(20_000),
    targetLanguage: targetLanguageSchema,
})

export const recognizeImageSchema = z.object({
    imageBase64: z.string().min(1),
    mediaType: recognizeImageMediaTypeSchema,
})

export const listTranslationsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(50),
})

export type CreateTranslationInput = z.infer<typeof createTranslationSchema>
export type RecognizeImageInput = z.infer<typeof recognizeImageSchema>
export type ListTranslationsQuery = z.infer<typeof listTranslationsQuerySchema>
