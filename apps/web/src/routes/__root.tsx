import { useLogto } from "@logto/react"
import { createRootRoute, Link, Outlet, useRouterState } from "@tanstack/react-router"
import { type ReactNode, useEffect } from "react"
import { CALLBACK_PATH, LOGIN_PATH, logout, signInToDashboard } from "@/auth"
import { LanguageSelect, useI18n } from "@/i18n"
import { Brand, BrandMark, IconButton, LogoutIcon } from "@/ui"

export const Route = createRootRoute({ component: RootLayout })

const CONTAINER = "mx-auto w-full max-w-4xl px-5 sm:px-6 lg:px-8"

function NavLink({
    to,
    active,
    children,
}: {
    to: "/app" | "/profile"
    active: boolean
    children: ReactNode
}) {
    return (
        <Link
            to={to}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                    ? "bg-accent-50 text-accent-700"
                    : "text-ink-muted hover:bg-ink/5 hover:text-ink"
            }`}
        >
            {children}
        </Link>
    )
}

function Shell({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
    const { t } = useI18n()
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    return (
        <div className="flex min-h-dvh flex-col">
            <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-md">
                <div className={`${CONTAINER} flex items-center justify-between gap-4 py-3.5`}>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/app"
                            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                        >
                            <Brand name={t("appName")} size="sm" />
                        </Link>
                        {onLogout ? (
                            <nav className="hidden items-center gap-1 rounded-full border border-line bg-surface/70 p-1 sm:flex">
                                <NavLink to="/app" active={pathname === "/app"}>
                                    {t("navTranslate")}
                                </NavLink>
                                <NavLink to="/profile" active={pathname === "/profile"}>
                                    {t("navProfile")}
                                </NavLink>
                            </nav>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <LanguageSelect />
                        {onLogout ? (
                            <IconButton label={t("logout")} onClick={onLogout}>
                                <LogoutIcon className="size-[18px]" />
                            </IconButton>
                        ) : null}
                    </div>
                </div>
            </header>

            {onLogout ? (
                <nav className={`${CONTAINER} mt-3 flex items-center gap-1 sm:hidden`}>
                    <NavLink to="/app" active={pathname === "/app"}>
                        {t("navTranslate")}
                    </NavLink>
                    <NavLink to="/profile" active={pathname === "/profile"}>
                        {t("navProfile")}
                    </NavLink>
                </nav>
            ) : null}

            <main className={`${CONTAINER} flex-1 py-10 sm:py-14`}>{children}</main>

            <footer className="border-t border-line/70">
                <div className={`${CONTAINER} flex flex-col gap-1.5 py-6 text-xs text-ink-faint`}>
                    <span className="inline-flex items-center gap-1.5 text-ink-muted">
                        <BrandMark className="size-3.5 text-accent-500" />
                        {t("appName")}
                    </span>
                    <span>{t("footerNote")}</span>
                </div>
            </footer>
        </div>
    )
}

function CenteredStatus({ text }: { text: string }) {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 text-sm text-ink-muted">
            <BrandMark className="size-10 animate-pulse text-accent-500" />
            {text}
        </div>
    )
}

function RootLayout() {
    const { isAuthenticated, isLoading } = useLogto()
    const { t } = useI18n()
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    const isLanding = pathname === "/"
    const isAuthPage = pathname === LOGIN_PATH || pathname === CALLBACK_PATH
    // 公开路径(落地页 + 登录/回调)不触发登录重定向 —— 否则爬虫与访客会被弹去 Logto。
    const isPublic = isLanding || isAuthPage

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isPublic) void signInToDashboard()
    }, [isAuthenticated, isLoading, isPublic])

    // 公开落地页:对所有人开放,自带 header/footer,不套应用 Shell。
    if (isLanding) return <Outlet />

    // 登录页/回调页:居中渲染,只保留品牌与语言切换。
    if (isAuthPage) {
        return (
            <Shell>
                <div className="flex min-h-[58dvh] items-center justify-center">
                    <Outlet />
                </div>
            </Shell>
        )
    }

    // 已登录:始终渲染业务页。注意 isLoading 会在每次 getAccessToken(含静默续期)时翻转,
    // 绝不能因它卸载 <Outlet/> —— 否则页面反复卸载/重挂会触发重复请求并撞上认证态抖动,导致假 401 跳登录。
    if (isAuthenticated) {
        return (
            <Shell onLogout={() => void logout()}>
                <Outlet />
            </Shell>
        )
    }

    // 尚未登录:首次会话判定中显示加载;判定为未登录时由上面的 effect 跳转登录。
    return <CenteredStatus text={isLoading ? t("loading") : t("redirectingLogin")} />
}
