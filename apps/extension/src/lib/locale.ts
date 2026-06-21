import { type AppLocale, resolveAppLocale } from "@app/shared"
import { LOCALE_KEY } from "./messages"

// 后台（service worker）读取界面语言：优先用侧边栏持久化到 chrome.storage 的选择，
// 否则回退浏览器语言。用于右键菜单标题、后台抛出的用户可见错误等。
export async function readLocale(): Promise<AppLocale> {
    try {
        const stored = (await chrome.storage.local.get(LOCALE_KEY))[LOCALE_KEY]
        if (typeof stored === "string" && stored) return resolveAppLocale(stored)
    } catch {
        // storage 不可用时回退浏览器语言。
    }
    return resolveAppLocale(navigator?.languages ?? [])
}
