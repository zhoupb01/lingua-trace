import { createFileRoute } from "@tanstack/react-router"
import { Bubble } from "@/components/chat/render"
import { useChatSession } from "@/components/chat/useChatSession"
import { ApiError } from "@/lib/api"

export const Route = createFileRoute("/chat/$sessionId")({
    component: ChatSessionRoute,
})

function ChatSessionRoute() {
    const { sessionId } = Route.useParams()
    // Key by sessionId so switching sessions remounts with fresh streaming state.
    return <ChatPane key={sessionId} sessionId={sessionId} />
}

function ChatPane({ sessionId }: { sessionId: string }) {
    const { lines, input, setInput, error, busy, send, stop, isLoading, loadError } =
        useChatSession(sessionId)

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="flex-1 space-y-2 overflow-y-auto">
                {isLoading ? (
                    <p className="text-neutral-500">Loading…</p>
                ) : loadError ? (
                    <p className="text-red-600">
                        Could not load this conversation: {loadError.message}
                        {loadError instanceof ApiError && loadError.requestId
                            ? ` (ref: ${loadError.requestId})`
                            : ""}
                    </p>
                ) : (
                    lines.map((l, i) => <Bubble key={i} line={l} />)
                )}
            </div>
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Ask something…"
                    className="flex-1 rounded border border-neutral-300 px-3 py-2"
                />
                {busy ? (
                    <button
                        type="button"
                        onClick={stop}
                        className="rounded bg-neutral-200 px-4 py-2 text-neutral-900"
                    >
                        Stop
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={send}
                        className="rounded bg-neutral-900 px-4 py-2 text-white"
                    >
                        Send
                    </button>
                )}
            </div>
            {error && <div className="rounded bg-red-50 p-4 text-red-700">{error}</div>}
        </div>
    )
}
