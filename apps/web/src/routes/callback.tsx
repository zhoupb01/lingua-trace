import { useHandleSignInCallback } from "@logto/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { DASHBOARD_PATH } from "@/auth"
import { useI18n } from "@/i18n"
import { BrandMark, cn } from "@/ui"

export const Route = createFileRoute("/callback")({ component: Callback })

function Callback() {
    const navigate = useNavigate()
    const { t } = useI18n()
    const { isLoading, error } = useHandleSignInCallback(() => {
        void navigate({ to: DASHBOARD_PATH, replace: true })
    })

    const status = isLoading
        ? t("callbackLoading")
        : error
          ? t("callbackFailed")
          : t("callbackSuccess")

    return (
        <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
            <div className="flex justify-center">
                <BrandMark
                    className={cn("size-11 text-accent-600", isLoading && "animate-pulse")}
                />
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">{status}</h1>
            {error ? (
                <p className="mt-2 text-sm break-words text-danger-700">{error.message}</p>
            ) : null}
        </div>
    )
}
