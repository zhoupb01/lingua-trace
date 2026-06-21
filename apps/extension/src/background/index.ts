import { DEFAULT_TARGET_LANGUAGE, resolveAppLocale, translate } from "@app/shared"
import {
    getAccessToken,
    getCurrentUser,
    isAuthenticated,
    signIn,
    signOut,
} from "@/auth/backgroundAuth"
import { readLocale } from "@/lib/locale"
import {
    type ExtensionMessage,
    LOCALE_KEY,
    MENU_TRANSLATE_SELECTION,
    PENDING_SELECTION_KEY,
    TARGET_LANGUAGE_KEY,
} from "@/lib/messages"

async function createContextMenu() {
    const locale = await readLocale()
    await chrome.contextMenus.removeAll()
    chrome.contextMenus.create({
        id: MENU_TRANSLATE_SELECTION,
        title: translate(locale, "menuTranslate"),
        contexts: ["selection"],
    })
}

chrome.runtime.onInstalled.addListener(async () => {
    await createContextMenu()
    const preferences = await chrome.storage.local.get(TARGET_LANGUAGE_KEY)
    if (!preferences[TARGET_LANGUAGE_KEY]) {
        await chrome.storage.local.set({ [TARGET_LANGUAGE_KEY]: DEFAULT_TARGET_LANGUAGE })
    }
})

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[LOCALE_KEY]) return
    const next = changes[LOCALE_KEY].newValue
    if (typeof next !== "string") return
    chrome.contextMenus.update(
        MENU_TRANSLATE_SELECTION,
        { title: translate(resolveAppLocale(next), "menuTranslate") },
        () => void chrome.runtime.lastError,
    )
})

chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) await chrome.sidePanel.open({ tabId: tab.id })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== MENU_TRANSLATE_SELECTION || !tab?.id) return
    const text = info.selectionText?.trim()
    if (text) await chrome.storage.local.set({ [PENDING_SELECTION_KEY]: text })
    await chrome.sidePanel.open({ tabId: tab.id })
})

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    void (async () => {
        switch (message.type) {
            case "auth:sign-in":
                await signIn()
                sendResponse({ ok: true })
                return
            case "auth:sign-out":
                await signOut()
                sendResponse({ ok: true })
                return
            case "auth:status":
                sendResponse({ isAuthenticated: await isAuthenticated() })
                return
            case "auth:token":
                sendResponse({ accessToken: await getAccessToken() })
                return
            case "auth:user":
                sendResponse({ user: await getCurrentUser() })
                return
            case "selection:get-pending": {
                const data = await chrome.storage.local.get(PENDING_SELECTION_KEY)
                await chrome.storage.local.remove(PENDING_SELECTION_KEY)
                sendResponse({ text: (data[PENDING_SELECTION_KEY] as string | undefined) ?? null })
                return
            }
            case "selection:set-pending":
                await chrome.storage.local.set({ [PENDING_SELECTION_KEY]: message.text })
                sendResponse({ ok: true })
                return
            case "preferences:set-target-language":
                await chrome.storage.local.set({ [TARGET_LANGUAGE_KEY]: message.targetLanguage })
                sendResponse({ ok: true })
                return
            default:
                sendResponse({ ok: false })
        }
    })().catch((error: unknown) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
    )
    return true
})
