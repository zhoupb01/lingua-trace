import { Link } from "@tanstack/react-router"
import { useI18n } from "@/i18n"
import { ArrowRightIcon, BrandMark } from "@/ui"

// 自定义 404：分支于 router 的 defaultNotFoundComponent，渲染在已登录外壳内。
export function NotFound() {
    const { t } = useI18n()
    return (
        <div className="flex min-h-[52dvh] flex-col items-center justify-center gap-5 text-center">
            <BrandMark className="size-12 text-accent-400" />
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-ink">
                    {t("notFoundTitle")}
                </h1>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
                    {t("notFoundBody")}
                </p>
            </div>
            <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors duration-200 hover:border-ink-faint hover:bg-paper-deep/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
                <ArrowRightIcon className="size-4 -scale-x-100" />
                {t("backHome")}
            </Link>
        </div>
    )
}
