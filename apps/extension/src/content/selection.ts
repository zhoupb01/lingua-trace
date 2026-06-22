export type PageSelection = {
    text: string
    block: HTMLElement
    rect: DOMRect
}

const SKIP_SELECTOR = [
    "input",
    "textarea",
    "select",
    "button",
    "pre",
    "code",
    "[contenteditable]",
    "[data-lingua-trace]",
].join(",")

const BLOCK_TAGS = new Set([
    "ADDRESS",
    "ARTICLE",
    "ASIDE",
    "BLOCKQUOTE",
    "DD",
    "DIV",
    "DL",
    "DT",
    "FIELDSET",
    "FIGCAPTION",
    "FIGURE",
    "FOOTER",
    "FORM",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HEADER",
    "LI",
    "MAIN",
    "NAV",
    "OL",
    "P",
    "PRE",
    "SECTION",
    "TABLE",
    "TD",
    "TH",
    "TR",
    "UL",
])

function elementFromNode(node: Node) {
    return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
}

function isInsideSkippedArea(range: Range) {
    const start = elementFromNode(range.startContainer)
    const end = elementFromNode(range.endContainer)
    return Boolean(start?.closest(SKIP_SELECTOR) || end?.closest(SKIP_SELECTOR))
}

function isBlockElement(element: Element) {
    if (BLOCK_TAGS.has(element.tagName)) return true
    const display = getComputedStyle(element).display
    return display === "block" || display === "list-item" || display === "table"
}

function nearestBlock(node: Node) {
    let element = elementFromNode(node)
    while (element && element !== document.body) {
        if (isBlockElement(element)) return element as HTMLElement
        element = element.parentElement
    }
    return document.body
}

function selectionRect(range: Range) {
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0)
    return rects.at(-1) ?? range.getBoundingClientRect()
}

export function readPageSelection(): PageSelection | null {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null

    const text = selection.toString().trim()
    if (!text) return null

    const range = selection.getRangeAt(0)
    if (isInsideSkippedArea(range)) return null

    const rect = selectionRect(range)
    if (rect.width <= 0 || rect.height <= 0) return null

    return {
        text,
        block: nearestBlock(range.endContainer),
        rect,
    }
}
