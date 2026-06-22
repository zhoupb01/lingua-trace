import type { PageSelection } from "./selection"

const BUTTON_WIDTH = 42
const BUTTON_HEIGHT = 34
const GAP = 8

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

export function createTranslateButton(onTranslate: (selection: PageSelection) => void) {
    const host = document.createElement("div")
    host.dataset.linguaTrace = "translate-button"
    host.style.position = "fixed"
    host.style.zIndex = "2147483647"
    host.style.display = "none"

    const shadow = host.attachShadow({ mode: "open" })
    shadow.innerHTML = `
        <style>
            :host { all: initial; }
            button {
                width: ${BUTTON_WIDTH}px;
                height: ${BUTTON_HEIGHT}px;
                border: 1px solid rgb(255 255 255 / 0.42);
                border-radius: 999px;
                background: rgb(4 120 87 / 0.68);
                color: #fff;
                backdrop-filter: blur(10px) saturate(1.2);
                box-shadow: 0 10px 24px -14px rgb(17 24 39 / 0.38);
                cursor: pointer;
                font: 600 15px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            button:hover { background: rgb(4 120 87 / 0.82); }
            button:active { transform: scale(0.96); }
        </style>
        <button type="button" title="LinguaTrace 翻译">译</button>
    `

    let current: PageSelection | null = null
    const button = shadow.querySelector("button")
    button?.addEventListener("pointerdown", (event) => event.preventDefault())
    button?.addEventListener("click", (event) => {
        event.preventDefault()
        if (current) onTranslate(current)
    })

    function mount() {
        if (!host.isConnected) document.documentElement.append(host)
    }

    return {
        show(selection: PageSelection) {
            current = selection
            mount()
            const top = selection.rect.top - BUTTON_HEIGHT - GAP
            const left = selection.rect.right - BUTTON_WIDTH
            host.style.top = `${top > GAP ? top : selection.rect.bottom + GAP}px`
            host.style.left = `${clamp(left, GAP, window.innerWidth - BUTTON_WIDTH - GAP)}px`
            host.style.display = "block"
        },
        hide() {
            current = null
            host.style.display = "none"
        },
        contains(node: Node | null) {
            return Boolean(node && (node === host || host.contains(node)))
        },
    }
}
