import { useLogto } from "@logto/react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "@/i18n"
import { translationsClient } from "@/lib/api"
import type { TranslationResponse } from "@/lib/translation"
import { AlertIcon, BrandMark, Button, CopyButton, cn, EmptyState, Skeleton } from "@/ui"

export const Route = createFileRoute("/profile")({ component: ProfilePage })

const PAGE_SIZE = 50
const TRANSLATIONS_QUERY_KEY = ["translations"] as const

type ProfileUser = {
    sub: string
    name: string | null
    email: string | null
    avatar: string | null
}

function stringValue(value: unknown) {
    return typeof value === "string" && value.trim() ? value : null
}

function profileFromClaims(claims: Record<string, unknown> | null | undefined): ProfileUser | null {
    const sub = stringValue(claims?.sub)
    if (!sub) return null
    return {
        sub,
        name: stringValue(claims?.name) ?? stringValue(claims?.username),
        email: stringValue(claims?.email),
        avatar: stringValue(claims?.picture),
    }
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
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

function RecordsSkeleton() {
    return (
        <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"
                >
                    <div className="mb-3 flex items-center justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="mt-2 h-4 w-2/3" />
                </div>
            ))}
        </div>
    )
}

function ClampableSource({ text }: { text: string }) {
    const { t } = useI18n()
    const ref = useRef<HTMLParagraphElement>(null)
    const [expanded, setExpanded] = useState(false)
    const [clampable, setClampable] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (el) setClampable(el.scrollHeight > el.clientHeight + 1)
    }, [text])

    return (
        <div className="space-y-0.5">
            <p
                ref={ref}
                className={cn(
                    "text-[13px] leading-relaxed break-words whitespace-pre-wrap text-ink-muted",
                    expanded ? "" : "line-clamp-2",
                )}
            >
                {text}
            </p>
            {clampable ? (
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="text-xs font-medium text-accent-700 hover:underline"
                >
                    {expanded ? t("collapse") : t("expand")}
                </button>
            ) : null}
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
            weekday: "short",
        })
        const last = groups.at(-1)
        if (last?.label === label) {
            last.items.push(item)
        } else {
            groups.push({ label, items: [item] })
        }
    }
    return groups
}

function ProfilePage() {
    const { fetchUserInfo, getIdTokenClaims } = useLogto()
    const { locale, t, targetLanguageLabel } = useI18n()
    const queryClient = useQueryClient()
    const [profile, setProfile] = useState<ProfileUser | null>(null)
    const [profileError, setProfileError] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        async function loadProfile() {
            setProfileError(null)
            try {
                const userInfo = profileFromClaims(
                    (await fetchUserInfo()) as Record<string, unknown> | null | undefined,
                )
                const claims =
                    userInfo ??
                    profileFromClaims(
                        (await getIdTokenClaims()) as Record<string, unknown> | null | undefined,
                    )
                if (active) setProfile(claims)
            } catch (error) {
                if (active) setProfileError(errorMessage(error))
            }
        }
        void loadProfile()
        return () => {
            active = false
        }
    }, [fetchUserInfo, getIdTokenClaims])

    const history = useInfiniteQuery({
        queryKey: TRANSLATIONS_QUERY_KEY,
        initialPageParam: 1,
        queryFn: ({ pageParam }) =>
            translationsClient.list({ page: pageParam, pageSize: PAGE_SIZE }),
        getNextPageParam: (lastPage) =>
            lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
    })

    const deleteRecord = useMutation({
        mutationFn: (id: string) => translationsClient.delete(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: TRANSLATIONS_QUERY_KEY })
        },
    })

    const items = useMemo(
        () => history.data?.pages.flatMap((page) => page.items) ?? [],
        [history.data],
    )
    const total = history.data?.pages[0]?.total ?? 0
    const groups = useMemo(() => groupByDate(items, locale), [items, locale])
    const displayName = profile?.name ?? profile?.email ?? profile?.sub ?? t("profileUnavailable")

    return (
        <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-2">
                <p className="text-sm font-medium text-accent-700">{t("accountTitle")}</p>
                <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-ink">
                    {t("profileTitle")}
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
                    {t("profileSubtitle")}
                </p>
            </section>

            <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
                    <div className="flex items-center gap-3.5">
                        {profile?.avatar ? (
                            <img
                                src={profile.avatar}
                                alt={t("avatarAlt")}
                                className="size-12 rounded-full border border-line object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="flex size-12 items-center justify-center rounded-full border border-line bg-accent-50 text-accent-700">
                                <BrandMark className="size-6" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-ink">
                                {displayName}
                            </p>
                            {profile?.email ? (
                                <p className="truncate text-sm text-ink-muted">{profile.email}</p>
                            ) : null}
                        </div>
                    </div>
                    <div className="mt-4 space-y-1.5 text-xs text-ink-faint">
                        {profile?.sub ? (
                            <p className="break-all">
                                <span className="font-medium text-ink-muted">{t("userId")}</span>{" "}
                                {profile.sub}
                            </p>
                        ) : null}
                        {profileError ? <ErrorBanner message={profileError} /> : null}
                    </div>
                </div>

                <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
                    <p className="text-sm text-ink-muted">{t("historyTitle")}</p>
                    <p className="tnum mt-2 text-4xl font-semibold tracking-tight text-ink">
                        {total}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                        {t("recordsCount", { count: total })}
                    </p>
                </div>
            </section>

            <section className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-medium text-ink">{t("historyTitle")}</h2>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void history.refetch()}
                        disabled={history.isRefetching}
                    >
                        {t("refresh")}
                    </Button>
                </div>

                {history.error ? <ErrorBanner message={errorMessage(history.error)} /> : null}
                {deleteRecord.error ? (
                    <ErrorBanner message={errorMessage(deleteRecord.error)} />
                ) : null}

                {history.isLoading ? <RecordsSkeleton /> : null}

                {!history.isLoading && !history.error && items.length === 0 ? (
                    <EmptyState
                        title={t("historyEmptyTitle")}
                        description={t("historyEmptyDescription")}
                    />
                ) : null}

                {groups.map((group) => (
                    <div key={group.label} className="space-y-3">
                        <h3 className="sticky top-[73px] z-10 bg-paper/90 py-1 text-sm font-semibold text-ink-muted backdrop-blur">
                            {group.label}
                        </h3>
                        <div className="flex flex-col gap-3">
                            {group.items.map((item, index) => (
                                <article
                                    key={item.id}
                                    className="rise rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"
                                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                                >
                                    <div className="mb-2.5 flex items-center justify-between gap-3 text-xs text-ink-faint">
                                        <span className="rounded-full bg-paper-deep px-2 py-0.5 font-medium text-ink-muted">
                                            {targetLanguageLabel(item.targetLanguage)}
                                        </span>
                                        <div className="flex items-center gap-2.5">
                                            <span className="tnum">
                                                {new Date(item.createdAt).toLocaleString(locale)}
                                            </span>
                                            <CopyButton
                                                value={item.translatedText}
                                                label={t("copy")}
                                                copiedLabel={t("copied")}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => deleteRecord.mutate(item.id)}
                                                disabled={deleteRecord.isPending}
                                                className="rounded-lg px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-danger-700 disabled:pointer-events-none disabled:opacity-50"
                                            >
                                                {t("deleteRecord")}
                                            </button>
                                        </div>
                                    </div>
                                    <ClampableSource text={item.sourceText} />
                                    <p className="mt-2 text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">
                                        {item.translatedText}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                ))}

                {history.hasNextPage ? (
                    <Button
                        type="button"
                        variant="ghost"
                        className="self-center"
                        onClick={() => void history.fetchNextPage()}
                        disabled={history.isFetchingNextPage}
                    >
                        {history.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
                    </Button>
                ) : items.length > 0 ? (
                    <p className="py-2 text-center text-xs text-ink-faint">{t("allCaughtUp")}</p>
                ) : null}
            </section>
        </div>
    )
}
