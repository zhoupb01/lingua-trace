import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ApiError, translateStream, translationsClient } from "@/lib/api"
import { sendMessage, storageGet } from "@/lib/chrome"
import {
    type AuthStatus,
    type AuthUser,
    type AuthUserResponse,
    TARGET_LANGUAGE_KEY,
} from "@/lib/messages"
import {
    DEFAULT_TARGET_LANGUAGE,
    MAX_RECOGNIZE_IMAGE_BYTES,
    type RecognizeImageMediaType,
    SUPPORTED_IMAGE_MEDIA_TYPES,
    TARGET_LANGUAGES,
    type TargetLanguage,
    type TranslationResponse,
} from "@/lib/translation"
import { LanguageSelect, useI18n } from "./i18n"
import { ArrowRightIcon, BrandMark, LogoutIcon, RefreshIcon, SparkleIcon } from "./icons"
import {
    Brand,
    Button,
    CopyButton,
    cn,
    ErrorBanner,
    IconButton,
    Panel,
    Select,
    Skeleton,
    Textarea,
} from "./ui"

const PAGE_SIZE = 50
const IMAGE_ACCEPT = SUPPORTED_IMAGE_MEDIA_TYPES.join(",")

type AuthState = "checking" | "signed-in" | "signed-out"
type View = "translate" | "profile"

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

function RecordsSkeleton() {
    return (
        <div className="space-y-2.5">
            {[0, 1].map((i) => (
                <Panel key={i} className="space-y-2.5 p-3.5">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </Panel>
            ))}
        </div>
    )
}

function groupByDate(items: TranslationResponse[], locale: string) {
    const groups: Array<{ label: string; items: TranslationResponse[] }> = []
    for (const item of items) {
        const label = new Date(item.createdAt).toLocaleDateString(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
        const last = groups.at(-1)
        if (last?.label === label) last.items.push(item)
        else groups.push({ label, items: [item] })
    }
    return groups
}

function ViewButton({
    active,
    children,
    onClick,
}: {
    active: boolean
    children: string
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                active ? "bg-surface text-accent-700 shadow-card" : "text-ink-muted hover:text-ink",
            )}
        >
            {children}
        </button>
    )
}

export function App() {
    const { locale, t, targetLanguageLabel } = useI18n()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [view, setView] = useState<View>("translate")
    const [authState, setAuthState] = useState<AuthState>("checking")
    const [authError, setAuthError] = useState<string | null>(null)
    const [user, setUser] = useState<AuthUser | null>(null)
    const [userError, setUserError] = useState<string | null>(null)
    const [text, setText] = useState("")
    const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(DEFAULT_TARGET_LANGUAGE)
    const [recognizedText, setRecognizedText] = useState("")
    const [translatedText, setTranslatedText] = useState("")
    const [isRecognizingImage, setIsRecognizingImage] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [translateError, setTranslateError] = useState<string | null>(null)
    const [records, setRecords] = useState<TranslationResponse[]>([])
    const [recordsPage, setRecordsPage] = useState(0)
    const [recordsTotal, setRecordsTotal] = useState(0)
    const [recordsError, setRecordsError] = useState<string | null>(null)
    const [recordsLoading, setRecordsLoading] = useState(false)
    const [recordsLoadingMore, setRecordsLoadingMore] = useState(false)

    const isSignedIn = authState === "signed-in"
    const canTranslate =
        isSignedIn && text.trim().length > 0 && !isRecognizingImage && !isTranslating
    const canImportImage = isSignedIn && !isRecognizingImage && !isTranslating
    const hasMoreRecords = records.length < recordsTotal
    const groups = useMemo(() => groupByDate(records, locale), [records, locale])

    const formatTime = (value: string) =>
        new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })

    const loadUser = useCallback(async () => {
        setUserError(null)
        try {
            const data = await sendMessage<AuthUserResponse>({ type: "auth:user" })
            setUser(data.user)
        } catch (error) {
            setUserError(errorMessage(error))
        }
    }, [])

    const refreshAuth = useCallback(async () => {
        setAuthError(null)
        const status = await sendMessage<AuthStatus>({ type: "auth:status" })
        setAuthState(status.isAuthenticated ? "signed-in" : "signed-out")
        if (status.isAuthenticated) await loadUser()
        else {
            setUser(null)
            setRecords([])
            setRecordsPage(0)
            setRecordsTotal(0)
        }
    }, [loadUser])

    const applyAuthError = useCallback((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 401) return
        setAuthState("signed-out")
        setUser(null)
        setRecords([])
        setRecordsPage(0)
        setRecordsTotal(0)
    }, [])

    const loadRecords = useCallback(
        async (reset = true) => {
            if (authState !== "signed-in") return
            const nextPage = reset ? 1 : recordsPage + 1
            reset ? setRecordsLoading(true) : setRecordsLoadingMore(true)
            setRecordsError(null)
            try {
                const data = await translationsClient.list({ page: nextPage, pageSize: PAGE_SIZE })
                setRecords((current) => (reset ? data.items : [...current, ...data.items]))
                setRecordsPage(data.page)
                setRecordsTotal(data.total)
            } catch (error) {
                applyAuthError(error)
                setRecordsError(errorMessage(error))
            } finally {
                reset ? setRecordsLoading(false) : setRecordsLoadingMore(false)
            }
        },
        [applyAuthError, authState, recordsPage],
    )

    useEffect(() => {
        void (async () => {
            const preferences =
                await storageGet<Record<string, TargetLanguage | undefined>>(TARGET_LANGUAGE_KEY)
            setTargetLanguage(preferences[TARGET_LANGUAGE_KEY] ?? DEFAULT_TARGET_LANGUAGE)
            await refreshAuth()
        })().catch((error: unknown) => setAuthError(errorMessage(error)))
    }, [refreshAuth])

    useEffect(() => {
        if (isSignedIn && view === "profile" && recordsPage === 0 && !recordsLoading)
            void loadRecords(true)
    }, [isSignedIn, loadRecords, recordsLoading, recordsPage, view])

    const signIn = async () => {
        setAuthError(null)
        try {
            await sendMessage({ type: "auth:sign-in" })
            await refreshAuth()
        } catch (error) {
            setAuthError(errorMessage(error))
        }
    }

    const signOut = async () => {
        setAuthError(null)
        try {
            await sendMessage({ type: "auth:sign-out" })
            setAuthState("signed-out")
            setUser(null)
            setRecords([])
            setRecordsPage(0)
            setRecordsTotal(0)
        } catch (error) {
            setAuthError(errorMessage(error))
        }
    }

    const updateTargetLanguage = (language: TargetLanguage) => {
        setTargetLanguage(language)
        void sendMessage({ type: "preferences:set-target-language", targetLanguage: language })
    }

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
            if (recordsPage > 0) void loadRecords(true)
        } catch (error) {
            applyAuthError(error)
            setTranslateError(errorMessage(error))
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
        } catch (error) {
            applyAuthError(error)
            setTranslateError(errorMessage(error))
        } finally {
            setIsRecognizingImage(false)
        }
    }

    const deleteRecord = async (id: string) => {
        setRecordsError(null)
        try {
            await translationsClient.delete(id)
            setRecords((current) => current.filter((item) => item.id !== id))
            setRecordsTotal((current) => Math.max(0, current - 1))
        } catch (error) {
            applyAuthError(error)
            setRecordsError(errorMessage(error))
        }
    }

    const displayName = user?.name ?? user?.email ?? user?.sub ?? t("profileUnavailable")

    return (
        <main className="min-h-dvh px-4 pt-4 pb-6 text-ink">
            <header className="mb-4">
                <div className="flex items-start justify-between gap-2">
                    <Brand name={t("appName")} />
                    <div className="flex shrink-0 items-center gap-0.5">
                        <LanguageSelect />
                        {isSignedIn ? (
                            <IconButton label={t("logout")} onClick={() => void signOut()}>
                                <LogoutIcon className="size-[18px]" />
                            </IconButton>
                        ) : null}
                    </div>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                    {t("extSubtitle")}
                </p>
            </header>

            {authState === "checking" ? (
                <div className="flex flex-col items-center gap-3 py-12 text-sm text-ink-muted">
                    <BrandMark className="size-9 animate-pulse text-accent-500" />
                    {t("checkingAuth")}
                </div>
            ) : null}

            {authState === "signed-out" ? (
                <Panel className="space-y-4">
                    <div>
                        <h2 className="text-base font-semibold text-ink">{t("signInTitle")}</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                            {t("signInBody")}
                        </p>
                    </div>
                    <Button className="w-full" onClick={() => void signIn()}>
                        {t("logtoLogin")}
                    </Button>
                </Panel>
            ) : null}

            {authError ? (
                <div className="mt-3">
                    <ErrorBanner message={authError} />
                </div>
            ) : null}

            {isSignedIn ? (
                <div className="space-y-4">
                    <div className="flex rounded-2xl border border-line bg-paper-deep p-1">
                        <ViewButton
                            active={view === "translate"}
                            onClick={() => setView("translate")}
                        >
                            {t("navTranslate")}
                        </ViewButton>
                        <ViewButton active={view === "profile"} onClick={() => setView("profile")}>
                            {t("navProfile")}
                        </ViewButton>
                    </div>

                    {view === "translate" ? (
                        <>
                            <Panel className="space-y-3">
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
                                    onChange={(event) => updateText(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" &&
                                            (event.ctrlKey || event.metaKey)
                                        ) {
                                            event.preventDefault()
                                            void submit()
                                        }
                                    }}
                                    onPaste={(event) => {
                                        const image = Array.from(event.clipboardData.items)
                                            .find(
                                                (item) =>
                                                    item.kind === "file" &&
                                                    item.type.startsWith("image/"),
                                            )
                                            ?.getAsFile()
                                        if (!image) return
                                        event.preventDefault()
                                        void importImage(image)
                                    }}
                                    rows={6}
                                    placeholder={t("extInputPlaceholder")}
                                    aria-label={t("sourceText")}
                                    disabled={isTranslating || isRecognizingImage}
                                />
                                <div className="flex items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <Select
                                            value={targetLanguage}
                                            onChange={(event) =>
                                                updateTargetLanguage(
                                                    event.target.value as TargetLanguage,
                                                )
                                            }
                                            disabled={isTranslating || isRecognizingImage}
                                            aria-label={t("targetLanguage")}
                                        >
                                            {TARGET_LANGUAGES.map((language) => (
                                                <option key={language} value={language}>
                                                    {targetLanguageLabel(language)}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={!canImportImage}
                                    >
                                        {isRecognizingImage
                                            ? t("recognizingImage")
                                            : t("uploadImage")}
                                    </Button>
                                    <Button onClick={() => void submit()} disabled={!canTranslate}>
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
                                <div className="flex items-center justify-between gap-3 text-xs text-ink-faint">
                                    <span>{t("pasteImageHint")}</span>
                                    <span>{t("shortcutHint")}</span>
                                </div>
                            </Panel>

                            {translateError ? <ErrorBanner message={translateError} /> : null}

                            {isRecognizingImage || recognizedText || translatedText ? (
                                <div className="grid gap-3">
                                    {isRecognizingImage || recognizedText ? (
                                        <Panel className="rise">
                                            <div className="mb-2 flex items-center justify-between gap-2">
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
                                            <div className="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink">
                                                {isRecognizingImage
                                                    ? t("recognizingImage")
                                                    : recognizedText}
                                            </div>
                                        </Panel>
                                    ) : null}

                                    {translatedText ? (
                                        <Panel className="rise border-accent-200 bg-accent-50/60">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <span className="text-xs font-medium text-accent-700">
                                                    {t("translatedAs", {
                                                        language:
                                                            targetLanguageLabel(targetLanguage),
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
                                            <div className="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink">
                                                {translatedText}
                                                {isTranslating ? (
                                                    <span className="caret-blink" />
                                                ) : null}
                                            </div>
                                        </Panel>
                                    ) : null}
                                </div>
                            ) : null}
                        </>
                    ) : null}

                    {view === "profile" ? (
                        <section className="space-y-3">
                            <Panel className="space-y-3">
                                <div className="flex items-center gap-3">
                                    {user?.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={t("avatarAlt")}
                                            className="size-11 rounded-full border border-line object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="flex size-11 items-center justify-center rounded-full border border-line bg-accent-50 text-accent-700">
                                            <BrandMark className="size-5" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink">
                                            {displayName}
                                        </p>
                                        {user?.email ? (
                                            <p className="truncate text-xs text-ink-muted">
                                                {user.email}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                {user?.sub ? (
                                    <p className="break-all text-[11px] text-ink-faint">
                                        <span className="font-medium text-ink-muted">
                                            {t("userId")}
                                        </span>{" "}
                                        {user.sub}
                                    </p>
                                ) : null}
                                {userError ? <ErrorBanner message={userError} /> : null}
                            </Panel>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-semibold text-ink">
                                        {t("historyTitle")}
                                    </h2>
                                    {recordsTotal > 0 ? (
                                        <span className="tnum rounded-full bg-paper-deep px-2 py-0.5 text-[11px] text-ink-muted">
                                            {t("recordsCount", { count: recordsTotal })}
                                        </span>
                                    ) : null}
                                </div>
                                <IconButton
                                    label={t("refresh")}
                                    onClick={() => void loadRecords(true)}
                                >
                                    <RefreshIcon className="size-4" />
                                </IconButton>
                            </div>

                            {recordsError ? <ErrorBanner message={recordsError} /> : null}
                            {recordsLoading && records.length === 0 ? <RecordsSkeleton /> : null}

                            {!recordsLoading && !recordsError && records.length === 0 ? (
                                <Panel className="border-dashed bg-surface/50 py-8 text-center">
                                    <BrandMark className="mx-auto mb-2.5 size-8 text-accent-400" />
                                    <p className="text-sm text-ink-muted">
                                        {t("historyEmptyTitle")}
                                    </p>
                                </Panel>
                            ) : null}

                            {groups.map((group) => (
                                <div key={group.label} className="space-y-2.5">
                                    <h3 className="text-xs font-semibold text-ink-muted">
                                        {group.label}
                                    </h3>
                                    {group.items.map((item, i) => (
                                        <Panel
                                            key={item.id}
                                            className="rise space-y-2 p-3.5"
                                            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                                        >
                                            <div className="flex items-center justify-between gap-2 text-[11px] text-ink-faint">
                                                <span>
                                                    {targetLanguageLabel(item.targetLanguage)}
                                                </span>
                                                <span className="tnum">
                                                    {formatTime(item.createdAt)}
                                                </span>
                                            </div>
                                            <p className="line-clamp-2 text-xs leading-5 break-words whitespace-pre-wrap text-ink-muted">
                                                {item.sourceText}
                                            </p>
                                            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink">
                                                {item.translatedText}
                                            </p>
                                            <div className="flex justify-end pt-0.5">
                                                <CopyButton
                                                    value={item.translatedText}
                                                    label={t("copy")}
                                                    copiedLabel={t("copied")}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => void deleteRecord(item.id)}
                                                    className="rounded-lg px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-danger-700"
                                                >
                                                    {t("deleteRecord")}
                                                </button>
                                            </div>
                                        </Panel>
                                    ))}
                                </div>
                            ))}

                            {hasMoreRecords ? (
                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => void loadRecords(false)}
                                    disabled={recordsLoadingMore}
                                >
                                    {recordsLoadingMore ? t("loadingMore") : t("loadMore")}
                                </Button>
                            ) : records.length > 0 ? (
                                <p className="py-1 text-center text-[11px] text-ink-faint">
                                    {t("allCaughtUp")}
                                </p>
                            ) : null}
                        </section>
                    ) : null}
                </div>
            ) : null}
        </main>
    )
}
