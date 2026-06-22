import { type PageSelection, readPageSelection } from "./selection"
import { createTranslateButton } from "./translateButton"
import { type TranslationCard, upsertTranslationCard } from "./translationCard"

const TRANSLATE_SELECTION_PORT = "lingua-trace.translate-selection"

type ExtensionMessage = { type: "auth:sign-in" }
type TranslateSelectionRequest = {
    type: "translate-selection:start"
    text: string
}
type TranslateSelectionEvent =
    | { type: "translate-selection:auth-required" }
    | { type: "translate-selection:started" }
    | { type: "translate-selection:delta"; text: string }
    | { type: "translate-selection:done"; translatedText: string }
    | { type: "translate-selection:error"; message: string }

const ports = new WeakMap<TranslationCard, chrome.runtime.Port>()

function disconnect(card: TranslationCard) {
    ports.get(card)?.disconnect()
    ports.delete(card)
}

async function sendMessage<T>(message: ExtensionMessage) {
    return chrome.runtime.sendMessage(message) as Promise<T>
}

function signIn(card: TranslationCard) {
    disconnect(card)
    card.setLoading()
    card.setHandlers(cardHandlers(card))
    void sendMessage<{ ok: boolean; error?: string }>({ type: "auth:sign-in" })
        .then((response) => {
            if (!response.ok) throw new Error(response.error ?? "登录失败")
            card.setSignedIn()
        })
        .catch((error: unknown) =>
            card.setError(error instanceof Error ? error.message : String(error)),
        )
}

function cardHandlers(card: TranslationCard) {
    return {
        onClose: () => disconnect(card),
        onRetry: () => startTranslation(card),
        onSignIn: () => signIn(card),
    }
}

function startTranslation(card: TranslationCard) {
    disconnect(card)
    card.setLoading()

    const port = chrome.runtime.connect({ name: TRANSLATE_SELECTION_PORT })
    ports.set(card, port)
    let finished = false

    port.onMessage.addListener((event: TranslateSelectionEvent) => {
        if (ports.get(card) !== port) return
        if (event.type === "translate-selection:auth-required") {
            finished = true
            card.setAuthRequired()
            disconnect(card)
            return
        }
        if (event.type === "translate-selection:delta") {
            card.appendDelta(event.text)
            return
        }
        if (event.type === "translate-selection:done") {
            finished = true
            card.setDone(event.translatedText)
            disconnect(card)
            return
        }
        if (event.type === "translate-selection:error") {
            finished = true
            card.setError(event.message)
            disconnect(card)
        }
    })
    port.onDisconnect.addListener(() => {
        ports.delete(card)
        if (!finished) card.setError("翻译已中断")
    })

    port.postMessage({
        type: "translate-selection:start",
        text: card.sourceText,
    } satisfies TranslateSelectionRequest)
}

function translate(selection: PageSelection) {
    translateButton.hide()
    const card = upsertTranslationCard(selection)
    card.setHandlers(cardHandlers(card))
    startTranslation(card)
}

const translateButton = createTranslateButton(translate)
let showTimer: number | null = null

function refreshTranslateButton() {
    if (showTimer) window.clearTimeout(showTimer)
    showTimer = window.setTimeout(() => {
        const selection = readPageSelection()
        if (selection) translateButton.show(selection)
        else translateButton.hide()
    }, 40)
}

document.addEventListener("mouseup", refreshTranslateButton)
document.addEventListener("keyup", (event) => {
    if (event.key === "Escape") translateButton.hide()
    else refreshTranslateButton()
})
document.addEventListener(
    "mousedown",
    (event) => {
        if (!translateButton.contains(event.target as Node | null)) translateButton.hide()
    },
    true,
)
document.addEventListener("scroll", () => translateButton.hide(), true)
window.addEventListener("resize", () => translateButton.hide())
