import { createFileRoute } from "@tanstack/react-router"
import { signInToDashboard } from "@/auth"
import { useI18n } from "@/i18n"
import { Brand, Button } from "@/ui"

export const Route = createFileRoute("/login")({ component: Login })

function Login() {
    const { t } = useI18n()
    return (
        <div className="w-full max-w-sm">
            <div className="rounded-2xl border border-line bg-surface p-8 shadow-card">
                <Brand name={t("appName")} />
                <p className="mt-5 text-sm leading-relaxed text-ink-muted">{t("loginSubtitle")}</p>
                <Button className="mt-7 w-full" onClick={() => void signInToDashboard()}>
                    {t("logtoLogin")}
                </Button>
            </div>
            <p className="mt-4 px-1 text-xs leading-relaxed text-ink-faint">{t("footerNote")}</p>
        </div>
    )
}
