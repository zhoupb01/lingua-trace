// SSE consumption for the chat stream. Both the "send a message" POST and the
// "re-attach to a running task" GET return the same event stream (text deltas +
// tool_call/tool_result/done/error), so both drive this one reader.

export type SSEHandlers = {
    onDelta: (text: string) => void
    onTool: (event: "tool_call" | "tool_result", data: string) => void
    onDone: () => void
    onError: (data: string) => void
}

// Parse one SSE frame into its event name + data payload.
function parseFrame(frame: string): { event: string; data: string } {
    let event = "message"
    const data: string[] = []
    for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""))
    }
    return { event, data: data.join("\n") }
}

// Read a streaming Response to completion, dispatching frames to handlers. Returns
// when the stream ends or a terminal (done/error) frame arrives.
export async function consumeSSE(res: Response, h: SSEHandlers): Promise<void> {
    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split("\n\n")
        buffer = frames.pop() ?? ""
        for (const frame of frames) {
            const { event, data } = parseFrame(frame)
            if (event === "done") return h.onDone()
            if (event === "error") return h.onError(data)
            if (event === "tool_call" || event === "tool_result") h.onTool(event, data)
            else if (data) h.onDelta(data)
        }
    }
}
