// Rendering helpers shared by the chat detail view. A "line" is one displayable
// row — a chat message or a tool round-trip. These mirror what the api streams
// (chat.tasks.ts) and what it persists (SDK history items).

export type Line = { kind: "user" | "assistant" | "tool"; text: string }

// Best-effort render of a stored SDK history item (AgentInputItem) to a line.
// The items are self-describing; we only surface text + tool calls for the demo.
export function renderItem(item: unknown): Line | null {
    const it = item as {
        type?: string
        role?: string
        name?: string
        arguments?: string
        output?: unknown
        content?: unknown
    }
    if (it.type === "function_call") {
        return { kind: "tool", text: `🔧 ${it.name}(${it.arguments ?? ""})` }
    }
    if (it.type === "function_call_result") {
        return { kind: "tool", text: `🔧 ${it.name} → ${stringify(it.output)}` }
    }
    if (it.role === "user" || it.role === "assistant") {
        const text = textOf(it.content)
        return text ? { kind: it.role, text } : null
    }
    return null
}

function textOf(content: unknown): string {
    if (typeof content === "string") return content
    if (!Array.isArray(content)) return ""
    return content
        .map((p) => (p && typeof p === "object" && "text" in p ? String(p.text) : ""))
        .join("")
}

function stringify(v: unknown): string {
    return typeof v === "string" ? v : JSON.stringify(v)
}

export function Bubble({ line }: { line: Line }) {
    if (line.kind === "tool") {
        return <div className="text-neutral-500 text-sm italic">{line.text}</div>
    }
    const label = line.kind === "user" ? "bg-neutral-900 text-white" : "bg-neutral-100"
    return <div className={`whitespace-pre-wrap rounded p-3 ${label}`}>{line.text}</div>
}

// A streamed tool_call/tool_result event payload → a tool line.
export function toolText(event: string, data: string): string {
    try {
        const p = JSON.parse(data) as { name?: string; args?: string; output?: unknown }
        return event === "tool_call"
            ? `🔧 ${p.name}(${p.args ?? ""})`
            : `🔧 ${p.name} → ${stringify(p.output)}`
    } catch {
        return "🔧 tool"
    }
}

// A streamed terminal `error` event payload → a user-facing message.
export function errorText(data: string): string {
    try {
        const e = JSON.parse(data) as { message?: string; requestId?: string }
        return `${e.message ?? "stream failed"}${e.requestId ? ` (ref: ${e.requestId})` : ""}`
    } catch {
        return "stream failed"
    }
}
