import type { RecognizeImageMediaType } from "@app/shared"
import { SUPPORTED_IMAGE_MEDIA_TYPES } from "@app/shared"

export {
    DEFAULT_TARGET_LANGUAGE,
    type ListTranslationsResponse,
    MAX_RECOGNIZE_IMAGE_BYTES,
    type RecognizeImageMediaType,
    SUPPORTED_IMAGE_MEDIA_TYPES,
    TARGET_LANGUAGE_LABELS,
    TARGET_LANGUAGES,
    type TargetLanguage,
    type TranslationResponse,
} from "@app/shared"

export function isSupportedImageType(value: string): value is RecognizeImageMediaType {
    return SUPPORTED_IMAGE_MEDIA_TYPES.some((type) => type === value)
}
