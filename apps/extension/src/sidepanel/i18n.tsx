import {
    APP_LOCALE_LABELS,
    APP_LOCALES,
    type AppLocale,
    type MessageKey,
    type MessageValues,
    type TargetLanguage,
} from "@app/shared"
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react"
import { storageSet } from "@/lib/chrome"
import {
    getCurrentLocale,
    resolveInitialLocale,
    setCurrentLocale,
    targetLanguageLabel,
    translate,
} from "@/lib/i18n"
import { LOCALE_KEY } from "@/lib/messages"
import { ChevronDownIcon, GlobeIcon } from "./icons"

type I18nContextValue = {
    locale: AppLocale
    setLocale: (locale: AppLocale) => void
    t: (key: MessageKey, values?: MessageValues) => string
    targetLanguageLabel: (language: TargetLanguage) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState(resolveInitialLocale)

    useEffect(() => {
        setCurrentLocale(locale, false)
        document.documentElement.lang = locale
        // 同步当前界面语言到 chrome.storage，供后台 API 请求读取。
        void storageSet({ [LOCALE_KEY]: locale })
    }, [locale])

    const value = useMemo<I18nContextValue>(
        () => ({
            locale,
            setLocale: (nextLocale) => {
                setCurrentLocale(nextLocale)
                setLocaleState(nextLocale)
            },
            t: (key, values) => translate(locale, key, values),
            targetLanguageLabel: (language) => targetLanguageLabel(locale, language),
        }),
        [locale],
    )

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
    const context = useContext(I18nContext)
    if (context) return context
    const locale = getCurrentLocale()
    return {
        locale,
        setLocale: setCurrentLocale,
        t: (key: MessageKey, values?: MessageValues) => translate(locale, key, values),
        targetLanguageLabel: (language: TargetLanguage) => targetLanguageLabel(locale, language),
    }
}

export function LanguageSelect() {
    const { locale, setLocale, t } = useI18n()
    return (
        <div className="relative inline-flex items-center">
            <GlobeIcon className="pointer-events-none absolute left-2 size-4 text-ink-muted" />
            <select
                aria-label={t("languageLabel")}
                value={locale}
                onChange={(event) => setLocale(event.target.value as AppLocale)}
                className="appearance-none rounded-lg border border-line bg-surface/60 py-1.5 pr-6 pl-7 text-xs text-ink-soft transition-colors hover:border-line-strong focus-visible:border-accent-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/40"
            >
                {APP_LOCALES.map((item) => (
                    <option key={item} value={item}>
                        {APP_LOCALE_LABELS[item]}
                    </option>
                ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-1.5 size-3 text-ink-faint" />
        </div>
    )
}
