import { useLogto } from "@logto/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { errorText, type Line, renderItem, toolText } from "@/components/chat/render"
import { consumeSSE } from "@/components/chat/sse"
import { ApiError, api, unwrap } from "@/lib/api"
import { apiResource } from "@/lib/logto"

// State + actions for one chat session. The caller should mount this keyed by
// sessionId so switching sessions remounts with fresh state.
//
// History (persisted messages) comes from TanStack Query; the in-flight assistant
// turn is local streaming state delivered over a single per-session SSE endpoint
// (GET /sessions/:id/stream). The SAME stream is used to (a) resume after a refresh
// — opened on mount, it replays any in-flight turn — and (b) receive a reply after
// sending. The client never deals with a task id.
export function useChatSession(sessionId: string) {
    const { getAccessToken } = useLogto()
    const qc = useQueryClient()
    const [streaming, setStreaming] = useState("")
    const [streamTools, setStreamTools] = useState<Line[]>([])
    const [pendingUser, setPendingUser] = useState<string | null>(null)
    const [input, setInput] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    // The one in-flight stream connection; opening a new one supersedes the old.
    const streamRef = useRef<AbortController | null>(null)

    const history = useQuery({
        queryKey: ["chat", "session", sessionId],
        queryFn: async () => {
            const token = await getAccessToken(apiResource)
            return unwrap(api(token).chat.sessions[":id"].$get({ param: { id: sessionId } }))
        },
    })

    const historyLines = useMemo<Line[]>(
        () => (history.data?.items ?? []).map(renderItem).filter((l): l is Line => l !== null),
        [history.data],
    )

    // Open the session stream and pipe it into the streaming state. Replays any
    // in-flight turn (catch-up) then streams live; a `done` arrives immediately when
    // the session is idle. Only the latest open finalizes — a superseding open (or
    // unmount) nulls/replaces streamRef so the stale one bails without touching state.
    const openStream = useCallback(async () => {
        streamRef.current?.abort()
        const ac = new AbortController()
        streamRef.current = ac
        const isCurrent = () => streamRef.current === ac
        setBusy(true)
        let received = false
        try {
            const token = await getAccessToken(apiResource)
            if (!isCurrent()) return
            const res = await fetch(`/api/chat/sessions/${sessionId}/stream`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: ac.signal,
            })
            if (!isCurrent() || !res.ok) {
                if (isCurrent() && !res.ok) setError(`stream failed (${res.status})`)
                return
            }
            await consumeSSE(res, {
                onDelta: (t) => {
                    received = true
                    setStreaming((s) => s + t)
                },
                onTool: (e, d) => {
                    received = true
                    setStreamTools((p) => [...p, { kind: "tool", text: toolText(e, d) }])
                },
                onDone: () => {},
                onError: (d) => setError(errorText(d)),
            })
        } catch (err) {
            // An abort (superseded open / unmount) is expected and silent. Surface
            // anything else (token refresh failure, network drop) — otherwise the
            // stream just vanishes back to idle with no sign of what went wrong.
            if (isCurrent() && !ac.signal.aborted) {
                setError(err instanceof Error ? err.message : "stream connection failed")
            }
        } finally {
            if (isCurrent()) {
                // Only refresh history if a turn actually streamed (an idle open that
                // got an immediate `done` shouldn't re-fetch on every session open).
                if (received) {
                    await Promise.all([
                        qc.invalidateQueries({ queryKey: ["chat", "session", sessionId] }),
                        qc.invalidateQueries({ queryKey: ["chat", "sessions"] }),
                    ])
                }
                setStreaming("")
                setStreamTools([])
                setPendingUser(null)
                setBusy(false)
            }
        }
    }, [sessionId, getAccessToken, qc])

    const send = useCallback(async () => {
        const message = input.trim()
        if (!message || busy) return
        setBusy(true)
        setInput("")
        setError(null)
        setPendingUser(message)
        try {
            const token = await getAccessToken(apiResource)
            // Just starts the turn; the reply arrives over the session stream below.
            const res = await api(token).chat.sessions[":id"].messages.$post({
                param: { id: sessionId },
                json: { message },
            })
            if (!res.ok) {
                const err = await ApiError.fromResponse(res)
                setError(`${err.message}${err.requestId ? ` (ref: ${err.requestId})` : ""}`)
                setBusy(false)
                setPendingUser(null)
                return
            }
        } catch (e) {
            setError(String(e))
            setBusy(false)
            setPendingUser(null)
            return
        }
        await openStream()
    }, [input, busy, sessionId, getAccessToken, openStream])

    // Stop the in-flight turn. The server persists the partial reply then emits `done`,
    // which ends the open stream → its finally refreshes history (showing the partial).
    // We deliberately don't abort the local stream: letting the server's post-persist
    // `done` drive the close keeps the history refetch from racing ahead of the save.
    const stop = useCallback(async () => {
        if (!busy) return
        try {
            const token = await getAccessToken(apiResource)
            await unwrap(api(token).chat.sessions[":id"].stop.$post({ param: { id: sessionId } }))
        } catch (e) {
            setError(e instanceof ApiError ? e.message : String(e))
        }
    }, [busy, sessionId, getAccessToken])

    // Resume on mount: open the session stream (idle → immediate done, no-op).
    useEffect(() => {
        void openStream()
        return () => {
            streamRef.current?.abort()
            streamRef.current = null
        }
    }, [openStream])

    const lines = useMemo<Line[]>(() => {
        const out = [...historyLines]
        if (pendingUser) out.push({ kind: "user", text: pendingUser })
        out.push(...streamTools)
        if (streaming) out.push({ kind: "assistant", text: streaming })
        return out
    }, [historyLines, pendingUser, streamTools, streaming])

    return {
        lines,
        input,
        setInput,
        error,
        busy,
        send,
        stop,
        isLoading: history.isLoading,
        loadError: history.error,
    }
}
