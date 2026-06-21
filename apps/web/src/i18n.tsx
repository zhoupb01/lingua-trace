import {
    APP_LOCALE_LABELS,
    APP_LOCALES,
    type AppLocale,
    type MessageKey,
    type MessageValues,
    resolveAppLocale,
    type TargetLanguage,
    targetLanguageLabel,
    translate,
} from "@app/shared"
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react"
import { ChevronDownIcon, GlobeIcon } from "@/ui/icons"

const LOCALE_STORAGE_KEY = "lingua-trace.locale"

// 非 React 代码（api.ts）也要按当前界面语言取错误文案，故 translate 从这里再导出。
export { targetLanguageLabel, translate }

let currentLocale = resolveInitialLocale()

function localStorageValue() {
    try {
        return globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY)
    } catch {
        return null
    }
}

function browserLanguages() {
    const navigatorLanguages = globalThis.navigator?.languages
    if (navigatorLanguages?.length) return navigatorLanguages
    const language = globalThis.navigator?.language
    return language ? [language] : []
}

export function resolveInitialLocale(): AppLocale {
    const stored = localStorageValue()
    return stored ? resolveAppLocale(stored) : resolveAppLocale(browserLanguages())
}

export function getCurrentLocale() {
    return currentLocale
}

export function setCurrentLocale(locale: AppLocale, persist = true) {
    currentLocale = locale
    if (!persist) return
    globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale)
}

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
    return {
        locale: currentLocale,
        setLocale: setCurrentLocale,
        t: (key: MessageKey, values?: MessageValues) => translate(currentLocale, key, values),
        targetLanguageLabel: (language: TargetLanguage) =>
            targetLanguageLabel(currentLocale, language),
    }
}

// 语言切换器：地球图标 + 原生 select（无障碍可达），冷色发丝边，翠绿 focus 环。
export function LanguageSelect() {
    const { locale, setLocale, t } = useI18n()
    return (
        <div className="relative inline-flex items-center">
            <GlobeIcon className="pointer-events-none absolute left-2.5 size-4 text-ink-muted" />
            <select
                aria-label={t("languageLabel")}
                value={locale}
                onChange={(event) => setLocale(event.target.value as AppLocale)}
                className="appearance-none rounded-lg border border-line bg-surface/60 py-1.5 pr-7 pl-8 text-sm text-ink-soft transition-colors hover:border-line-strong focus-visible:border-accent-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/40"
            >
                {APP_LOCALES.map((item) => (
                    <option key={item} value={item}>
                        {APP_LOCALE_LABELS[item]}
                    </option>
                ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2 size-3.5 text-ink-faint" />
        </div>
    )
}
