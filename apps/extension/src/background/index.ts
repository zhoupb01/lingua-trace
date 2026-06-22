import { DEFAULT_TARGET_LANGUAGE, type TargetLanguage } from "@app/shared"
import {
    getAccessToken,
    getCurrentUser,
    isAuthenticated,
    signIn,
    signOut,
} from "@/auth/backgroundAuth"
import { env } from "@/lib/env"
import { readLocale } from "@/lib/locale"
import {
    type ExtensionMessage,
    TARGET_LANGUAGE_KEY,
    TRANSLATE_SELECTION_PORT,
    type TranslateSelectionEvent,
    type TranslateSelectionRequest,
} from "@/lib/messages"

function apiUrl(path: string) {
    return `${env.apiBaseUrl}${path}`
}

function post(port: chrome.runtime.Port, event: TranslateSelectionEvent) {
    port.postMessage(event)
}

function parseFrame(frame: string) {
    let event = "message"
    const data: string[] = []
    for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        if (line.startsWith("data:")) data.push(line.slice(5).trimStart())
    }
    return { event, data: data.join("\n") }
}

async function readErrorMessage(response: Response) {
    const text = await response.text()
    if (!text) return `Request failed: ${response.status}`
    try {
        const body = JSON.parse(text) as { message?: string }
        return body.message || `Request failed: ${response.status}`
    } catch {
        return text.replace(/\s+/g, " ").trim() || `Request failed: ${response.status}`
    }
}

async function readTargetLanguage(): Promise<TargetLanguage> {
    const stored = (await chrome.storage.local.get(TARGET_LANGUAGE_KEY))[TARGET_LANGUAGE_KEY]
    return typeof stored === "string" ? (stored as TargetLanguage) : DEFAULT_TARGET_LANGUAGE
}

async function streamTranslation(
    port: chrome.runtime.Port,
    request: TranslateSelectionRequest,
    signal: AbortSignal,
) {
    if (!(await isAuthenticated())) {
        post(port, { type: "translate-selection:auth-required" })
        return
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
        post(port, { type: "translate-selection:auth-required" })
        return
    }

    const targetLanguage = await readTargetLanguage()
    post(port, { type: "translate-selection:started", targetLanguage })

    const response = await fetch(apiUrl("/translate"), {
        method: "POST",
        headers: {
            "Accept-Language": await readLocale(),
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
            accept: "text/event-stream",
        },
        body: JSON.stringify({ text: request.text, targetLanguage }),
        signal,
    })

    if (!response.ok) {
        post(port, { type: "translate-selection:error", message: await readErrorMessage(response) })
        return
    }
    if (!response.body) {
        post(port, { type: "translate-selection:error", message: "Translation stream is empty" })
        return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    for (;;) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        const frames = buffer.split("\n\n")
        buffer = frames.pop() ?? ""
        for (const frame of frames) {
            const { event, data } = parseFrame(frame)
            if (!data) continue
            if (event === "delta") {
                post(port, { type: "translate-selection:delta", text: JSON.parse(data).text })
            }
            if (event === "done") {
                post(port, {
                    type: "translate-selection:done",
                    translatedText: JSON.parse(data).translatedText,
                })
                return
            }
            if (event === "error") {
                const error = JSON.parse(data) as { message?: string; code?: string }
                post(port, {
                    type: "translate-selection:error",
                    message: error.message ?? "Translation failed",
                    code: error.code,
                })
                return
            }
        }
        if (done) break
    }
    post(port, { type: "translate-selection:error", message: "Translation stream closed" })
}

chrome.runtime.onInstalled.addListener(async () => {
    const preferences = await chrome.storage.local.get(TARGET_LANGUAGE_KEY)
    if (!preferences[TARGET_LANGUAGE_KEY]) {
        await chrome.storage.local.set({ [TARGET_LANGUAGE_KEY]: DEFAULT_TARGET_LANGUAGE })
    }
})

chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) await chrome.sidePanel.open({ tabId: tab.id })
})

chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== TRANSLATE_SELECTION_PORT) return

    let abortController: AbortController | null = null
    port.onDisconnect.addListener(() => abortController?.abort())
    port.onMessage.addListener((message: TranslateSelectionRequest) => {
        abortController?.abort()
        abortController = new AbortController()
        void streamTranslation(port, message, abortController.signal).catch((error: unknown) => {
            if (abortController?.signal.aborted) return
            post(port, {
                type: "translate-selection:error",
                message: error instanceof Error ? error.message : String(error),
            })
        })
    })
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
