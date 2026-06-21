import { createFileRoute } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { useI18n } from "@/i18n"
import { translateStream, translationsClient } from "@/lib/api"
import {
    DEFAULT_TARGET_LANGUAGE,
    MAX_RECOGNIZE_IMAGE_BYTES,
    type RecognizeImageMediaType,
    SUPPORTED_IMAGE_MEDIA_TYPES,
    TARGET_LANGUAGES,
    type TargetLanguage,
} from "@/lib/translation"
import { AlertIcon, ArrowRightIcon, Button, CopyButton, Select, SparkleIcon, Textarea } from "@/ui"

export const Route = createFileRoute("/app")({ component: HomePage })

const IMAGE_ACCEPT = SUPPORTED_IMAGE_MEDIA_TYPES.join(",")

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}

function isSupportedImageType(value: string): value is RecognizeImageMediaType {
    return SUPPORTED_IMAGE_MEDIA_TYPES.some((type) => type === value)
}

async function readFileAsBase64(file: File) {
    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error("Failed to read image file"))
        reader.onload = () => {
            if (typeof reader.result !== "string") {
                reject(new Error("Failed to read image file"))
                return
            }
            const comma = reader.result.indexOf(",")
            resolve(comma >= 0 ? reader.result.slice(comma + 1) : reader.result)
        }
        reader.readAsDataURL(file)
    })
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm text-danger-700"
        >
            <AlertIcon className="mt-0.5 size-4 shrink-0 text-danger-600" />
            <span className="break-words">{message}</span>
        </div>
    )
}

function HomePage() {
    const { t, targetLanguageLabel } = useI18n()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [text, setText] = useState("")
    const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(DEFAULT_TARGET_LANGUAGE)
    const [recognizedText, setRecognizedText] = useState("")
    const [translatedText, setTranslatedText] = useState("")
    const [isRecognizingImage, setIsRecognizingImage] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [translateError, setTranslateError] = useState<string | null>(null)
    const canSubmit = text.trim().length > 0 && !isRecognizingImage && !isTranslating
    const canImportImage = !isRecognizingImage && !isTranslating

    const updateText = (value: string) => {
        setText(value)
        if (!value.trim()) setRecognizedText("")
    }

    const submitText = async (sourceText: string) => {
        const value = sourceText.trim()
        if (!value || isTranslating) return

        setIsTranslating(true)
        setTranslateError(null)
        setTranslatedText("")
        try {
            await translateStream({ text: value, targetLanguage }, (chunk) =>
                setTranslatedText((current) => current + chunk),
            )
        } catch (err) {
            setTranslateError(errorMessage(err))
        } finally {
            setIsTranslating(false)
        }
    }

    const submit = async () => {
        await submitText(text)
    }

    const importImage = async (file: File) => {
        if (!canImportImage) return
        setTranslateError(null)
        setTranslatedText("")
        setRecognizedText("")
        if (!isSupportedImageType(file.type)) {
            setTranslateError(t("imageUnsupportedType"))
            return
        }
        if (file.size > MAX_RECOGNIZE_IMAGE_BYTES) {
            setTranslateError(t("imageTooLarge"))
            return
        }
        setIsRecognizingImage(true)
        try {
            const imageBase64 = await readFileAsBase64(file)
            const result = await translationsClient.recognizeImage({
                imageBase64,
                mediaType: file.type,
            })
            setRecognizedText(result.recognizedText)
            setText(result.recognizedText)
            setIsRecognizingImage(false)
            await submitText(result.recognizedText)
        } catch (err) {
            setTranslateError(errorMessage(err))
        } finally {
            setIsRecognizingImage(false)
        }
    }

    return (
        <section className="mx-auto flex max-w-3xl flex-col gap-5">
            <h1 className="max-w-[32ch] text-[26px] leading-snug font-semibold tracking-tight text-balance text-ink">
                {t("homeSubtitle")}
            </h1>

            <form
                className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"
                onSubmit={(e) => {
                    e.preventDefault()
                    void submit()
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0]
                        event.target.value = ""
                        if (file) void importImage(file)
                    }}
                />
                <Textarea
                    value={text}
                    onChange={(e) => updateText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault()
                            void submit()
                        }
                    }}
                    onPaste={(event) => {
                        const image = Array.from(event.clipboardData.items)
                            .find((item) => item.kind === "file" && item.type.startsWith("image/"))
                            ?.getAsFile()
                        if (!image) return
                        event.preventDefault()
                        void importImage(image)
                    }}
                    rows={6}
                    placeholder={t("inputPlaceholder")}
                    aria-label={t("sourceText")}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-ink-muted">
                        <label htmlFor="target-language" className="shrink-0">
                            {t("targetLanguage")}
                        </label>
                        <span className="w-44">
                            <Select
                                id="target-language"
                                value={targetLanguage}
                                onChange={(e) =>
                                    setTargetLanguage(e.target.value as TargetLanguage)
                                }
                                disabled={isTranslating || isRecognizingImage}
                            >
                                {TARGET_LANGUAGES.map((language) => (
                                    <option key={language} value={language}>
                                        {targetLanguageLabel(language)}
                                    </option>
                                ))}
                            </Select>
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!canImportImage}
                            >
                                {isRecognizingImage ? t("recognizingImage") : t("uploadImage")}
                            </Button>
                            <Button type="submit" disabled={!canSubmit}>
                                {isTranslating ? (
                                    <>
                                        <SparkleIcon className="size-4 animate-pulse" />
                                        {t("translating")}
                                    </>
                                ) : (
                                    <>
                                        {t("translate")}
                                        <ArrowRightIcon className="size-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-ink-faint">
                    <span>{t("pasteImageHint")}</span>
                    <span className="tnum">
                        {text.length > 0 ? t("charCount", { count: text.length }) : ""}
                    </span>
                </div>
            </form>

            {translateError ? <ErrorBanner message={translateError} /> : null}

            {isRecognizingImage || recognizedText || translatedText ? (
                <div className="grid gap-4">
                    {isRecognizingImage || recognizedText ? (
                        <div className="rise rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="text-xs font-medium text-ink-muted">
                                    {t("recognizedText")}
                                </span>
                                {recognizedText && !isRecognizingImage ? (
                                    <CopyButton
                                        value={recognizedText}
                                        label={t("copy")}
                                        copiedLabel={t("copied")}
                                    />
                                ) : null}
                            </div>
                            <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">
                                {isRecognizingImage ? t("recognizingImage") : recognizedText}
                            </div>
                        </div>
                    ) : null}

                    {translatedText ? (
                        <div className="rise rounded-2xl border border-accent-200 bg-accent-50/60 p-4 shadow-card sm:p-5">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="text-xs font-medium text-accent-700">
                                    {t("translatedAs", {
                                        language: targetLanguageLabel(targetLanguage),
                                    })}
                                </span>
                                {!isTranslating ? (
                                    <CopyButton
                                        value={translatedText}
                                        label={t("copy")}
                                        copiedLabel={t("copied")}
                                    />
                                ) : null}
                            </div>
                            <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">
                                {translatedText}
                                {isTranslating ? <span className="caret-blink" /> : null}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </section>
    )
}
