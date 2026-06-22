import type { PageSelection } from "./selection"

type CardHandlers = {
    onClose: () => void
    onRetry: () => void
    onSignIn: () => void
}

const cards = new WeakMap<HTMLElement, TranslationCard>()

export class TranslationCard {
    readonly host = document.createElement("div")
    readonly shadow = this.host.attachShadow({ mode: "open" })
    private readonly status: HTMLElement
    private readonly text: HTMLElement
    private readonly copyButton: HTMLButtonElement
    private readonly retryButton: HTMLButtonElement
    private readonly signInButton: HTMLButtonElement
    private translatedText = ""
    private handlers: CardHandlers = {
        onClose: () => undefined,
        onRetry: () => undefined,
        onSignIn: () => undefined,
    }

    constructor(
        readonly block: HTMLElement,
        public sourceText: string,
    ) {
        this.host.dataset.linguaTrace = "translation-card"
        this.shadow.innerHTML = `
            <style>
                :host {
                    all: initial;
                    display: block;
                    margin: 10px 0;
                    color-scheme: light;
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .card {
                    border: 1px solid #d4d9d7;
                    border-left: 3px solid #10b981;
                    border-radius: 12px;
                    background: #f7f9f8;
                    box-shadow: 0 1px 2px -1px rgb(17 24 39 / 0.06), 0 6px 16px -10px rgb(17 24 39 / 0.1);
                    padding: 10px 12px;
                }
                .status {
                    margin-bottom: 6px;
                    color: #6b7280;
                    font-size: 12px;
                    line-height: 1.4;
                }
                .text {
                    color: #1a1a1e;
                    font-size: 14px;
                    line-height: 1.65;
                    white-space: pre-wrap;
                }
                .text.error { color: #b91c1c; }
                .actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                }
                button {
                    border: 1px solid #d4d9d7;
                    border-radius: 8px;
                    background: #fff;
                    color: #3f3f46;
                    cursor: pointer;
                    font: 600 12px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    padding: 6px 9px;
                }
                button:hover:not(:disabled) { background: #eef1f0; color: #1a1a1e; }
                button:disabled { cursor: not-allowed; opacity: 0.45; }
                button.primary { background: #047857; border-color: #047857; color: #fff; }
                button.primary:hover:not(:disabled) { background: #065f46; }
                .hidden { display: none; }
            </style>
            <article class="card">
                <div class="status"></div>
                <div class="text"></div>
                <div class="actions">
                    <button type="button" data-action="copy">复制</button>
                    <button type="button" data-action="retry">重试</button>
                    <button type="button" data-action="signin" class="primary hidden">登录</button>
                    <button type="button" data-action="close">关闭</button>
                </div>
            </article>
        `
        this.status = this.required(".status")
        this.text = this.required(".text")
        this.copyButton = this.required('button[data-action="copy"]')
        this.retryButton = this.required('button[data-action="retry"]')
        this.signInButton = this.required('button[data-action="signin"]')
        this.bindActions()
        this.insertAfterBlock()
    }

    setHandlers(handlers: CardHandlers) {
        this.handlers = handlers
    }

    setLoading() {
        this.translatedText = ""
        this.status.textContent = "LinguaTrace 正在翻译…"
        this.text.classList.remove("error")
        this.text.textContent = "正在翻译…"
        this.copyButton.disabled = true
        this.retryButton.disabled = true
        this.signInButton.classList.add("hidden")
    }

    appendDelta(value: string) {
        if (!this.translatedText) this.text.textContent = ""
        this.translatedText += value
        this.text.textContent = this.translatedText
        this.copyButton.disabled = false
    }

    setDone(value: string) {
        this.translatedText = value || this.translatedText
        this.status.textContent = ""
        this.text.classList.remove("error")
        this.text.textContent = this.translatedText
        this.copyButton.disabled = !this.translatedText
        this.retryButton.disabled = false
    }

    setError(message: string) {
        this.status.textContent = ""
        this.text.classList.add("error")
        this.text.textContent = message
        this.copyButton.disabled = true
        this.retryButton.disabled = false
        this.signInButton.classList.add("hidden")
    }

    setAuthRequired() {
        this.status.textContent = ""
        this.text.classList.remove("error")
        this.text.textContent = "登录后使用 LinguaTrace 翻译"
        this.copyButton.disabled = true
        this.retryButton.disabled = true
        this.signInButton.classList.remove("hidden")
    }

    setSignedIn() {
        this.text.classList.remove("error")
        this.text.textContent = "已登录，请重试翻译。"
        this.retryButton.disabled = false
        this.signInButton.classList.add("hidden")
    }

    remove() {
        this.handlers.onClose()
        cards.delete(this.block)
        this.host.remove()
    }

    updateSourceText(text: string) {
        this.sourceText = text
        this.insertAfterBlock()
    }

    private required<T extends HTMLElement>(selector: string) {
        const element = this.shadow.querySelector<T>(selector)
        if (!element) throw new Error(`Missing ${selector}`)
        return element
    }

    private bindActions() {
        this.copyButton.addEventListener("click", async () => {
            await navigator.clipboard.writeText(this.translatedText)
            this.copyButton.textContent = "已复制"
            window.setTimeout(() => {
                this.copyButton.textContent = "复制"
            }, 1200)
        })
        this.retryButton.addEventListener("click", () => this.handlers.onRetry())
        this.signInButton.addEventListener("click", () => this.handlers.onSignIn())
        this.required<HTMLButtonElement>('button[data-action="close"]').addEventListener(
            "click",
            () => this.remove(),
        )
    }

    private insertAfterBlock() {
        if (this.block === document.body || !this.block.parentElement) {
            document.body.append(this.host)
            return
        }
        this.block.after(this.host)
    }
}

export function upsertTranslationCard(selection: PageSelection) {
    const current = cards.get(selection.block)
    if (current) {
        current.updateSourceText(selection.text)
        return current
    }

    const card = new TranslationCard(selection.block, selection.text)
    cards.set(selection.block, card)
    return card
}
