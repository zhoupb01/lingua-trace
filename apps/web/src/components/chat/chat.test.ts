import { describe, expect, test } from "vitest"
import { errorText, renderItem, toolText } from "@/components/chat/render"
import { consumeSSE, type SSEHandlers } from "@/components/chat/sse"

// Build a streaming Response from SSE frames, split across two chunks to exercise
// the reader's cross-chunk buffering.
function sseResponse(frames: string[]): Response {
    const body = frames.map((f) => `${f}\n\n`).join("")
    const bytes = new TextEncoder().encode(body)
    const mid = Math.ceil(bytes.length / 2)
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(bytes.slice(0, mid))
            controller.enqueue(bytes.slice(mid))
            controller.close()
        },
    })
    return new Response(stream)
}

function collector() {
    const out = {
        deltas: [] as string[],
        tools: [] as string[],
        done: false,
        error: null as string | null,
    }
    const handlers: SSEHandlers = {
        onDelta: (t) => out.deltas.push(t),
        onTool: (e, d) => out.tools.push(`${e}:${d}`),
        onDone: () => {
            out.done = true
        },
        onError: (d) => {
            out.error = d
        },
    }
    return { out, handlers }
}

describe("consumeSSE", () => {
    test("dispatches text deltas then done", async () => {
        const { out, handlers } = collector()
        await consumeSSE(
            sseResponse(["data: Hello", "data:  world", "event: done\ndata:"]),
            handlers,
        )
        expect(out.deltas.join("")).toBe("Hello world")
        expect(out.done).toBe(true)
        expect(out.error).toBeNull()
    })

    test("surfaces tool events and stops at a terminal error", async () => {
        const { out, handlers } = collector()
        await consumeSSE(
            sseResponse([
                'event: tool_call\ndata: {"name":"get_time","args":"{}"}',
                'event: error\ndata: {"message":"boom"}',
                "data: never", // after the error → not delivered
            ]),
            handlers,
        )
        expect(out.tools).toEqual(['tool_call:{"name":"get_time","args":"{}"}'])
        expect(out.error).toBe('{"message":"boom"}')
        expect(out.deltas).toEqual([])
    })
})

describe("render helpers", () => {
    test("renderItem maps messages and tool calls", () => {
        expect(renderItem({ role: "user", content: "hi" })).toEqual({ kind: "user", text: "hi" })
        expect(
            renderItem({ role: "assistant", content: [{ type: "output_text", text: "yo" }] }),
        ).toEqual({ kind: "assistant", text: "yo" })
        expect(renderItem({ type: "function_call", name: "get_time", arguments: "{}" })).toEqual({
            kind: "tool",
            text: "🔧 get_time({})",
        })
    })

    test("toolText and errorText format payloads", () => {
        expect(toolText("tool_result", '{"name":"get_time","output":"12:00"}')).toBe(
            "🔧 get_time → 12:00",
        )
        expect(errorText('{"message":"boom","requestId":"r1"}')).toBe("boom (ref: r1)")
    })
})
