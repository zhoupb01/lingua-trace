import {
    type AppLocale,
    type MessageKey,
    type MessageValues,
    resolveAppLocale,
    targetLanguageLabel,
    translate,
} from "@app/shared"

// 纯（非 React）locale 状态：供 lib/api.ts、lib/chrome.ts 等非组件代码按当前界面语言取文案。
// sidepanel/i18n.tsx 在此之上加 React 层。
export const LOCALE_STORAGE_KEY = "lingua-trace.locale"

function storedLocale() {
    try {
        return localStorage.getItem(LOCALE_STORAGE_KEY)
    } catch {
        return null
    }
}

function browserLanguages() {
    const languages = navigator?.languages
    if (languages?.length) return languages
    return navigator?.language ? [navigator.language] : []
}

export function resolveInitialLocale(): AppLocale {
    const stored = storedLocale()
    return stored ? resolveAppLocale(stored) : resolveAppLocale(browserLanguages())
}

let currentLocale: AppLocale = resolveInitialLocale()

export function getCurrentLocale() {
    return currentLocale
}

export function setCurrentLocale(locale: AppLocale, persist = true) {
    currentLocale = locale
    if (!persist) return
    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
        // 隐私模式等场景下 localStorage 不可写，忽略即可。
    }
}

export function t(key: MessageKey, values?: MessageValues) {
    return translate(currentLocale, key, values)
}

export { targetLanguageLabel, translate }
