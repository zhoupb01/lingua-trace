import { useLogto } from "@logto/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { useState } from "react"
import { api, unwrap } from "@/lib/api"
import { apiResource } from "@/lib/logto"

// The session sidebar: list, create, rename, delete. Selecting a session is a
// Link to /chat/$sessionId; the active one is highlighted.
export function SessionList() {
    const { getAccessToken } = useLogto()
    const qc = useQueryClient()
    const navigate = useNavigate()
    // Present only when on /chat/$sessionId (strict: false → optional param).
    const { sessionId } = useParams({ strict: false })
    const [editingId, setEditingId] = useState<string | null>(null)
    const [draft, setDraft] = useState("")

    const token = () => getAccessToken(apiResource)
    const invalidate = () => qc.invalidateQueries({ queryKey: ["chat", "sessions"] })

    const sessions = useQuery({
        queryKey: ["chat", "sessions"],
        queryFn: async () => unwrap(api(await token()).chat.sessions.$get()),
    })

    const create = useMutation({
        mutationFn: async () => unwrap(api(await token()).chat.sessions.$post({ json: {} })),
        onSuccess: async (s) => {
            await invalidate()
            navigate({ to: "/chat/$sessionId", params: { sessionId: s.id } })
        },
    })

    const remove = useMutation({
        mutationFn: async (id: string) =>
            unwrap(api(await token()).chat.sessions[":id"].$delete({ param: { id } })),
        onSuccess: async (_d, id) => {
            await invalidate()
            if (id === sessionId) navigate({ to: "/chat" })
        },
    })

    const rename = useMutation({
        mutationFn: async (v: { id: string; title: string }) =>
            unwrap(
                api(await token()).chat.sessions[":id"].$patch({
                    param: { id: v.id },
                    json: { title: v.title },
                }),
            ),
        onSuccess: async () => {
            setEditingId(null)
            await invalidate()
        },
    })

    function submitRename(id: string) {
        const title = draft.trim()
        if (title) rename.mutate({ id, title })
        else setEditingId(null)
    }

    return (
        <div className="flex h-full flex-col gap-2">
            <button
                type="button"
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
                + New chat
            </button>
            <ul className="flex-1 space-y-1 overflow-y-auto">
                {sessions.data?.map((s) => (
                    <li key={s.id} className="group flex items-center gap-1">
                        {editingId === s.id ? (
                            <input
                                ref={(el) => el?.focus()}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onBlur={() => submitRename(s.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") submitRename(s.id)
                                    if (e.key === "Escape") setEditingId(null)
                                }}
                                className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
                            />
                        ) : (
                            <>
                                <Link
                                    to="/chat/$sessionId"
                                    params={{ sessionId: s.id }}
                                    className="flex-1 truncate rounded px-2 py-1 text-sm hover:bg-neutral-100"
                                    activeProps={{ className: "bg-neutral-200 font-medium" }}
                                >
                                    {s.title ?? "新会话"}
                                </Link>
                                <button
                                    type="button"
                                    aria-label={`重命名「${s.title ?? "新会话"}」`}
                                    title="重命名"
                                    onClick={() => {
                                        setEditingId(s.id)
                                        setDraft(s.title ?? "")
                                    }}
                                    className="hidden px-1 text-neutral-400 text-xs hover:text-neutral-900 group-focus-within:block group-hover:block"
                                >
                                    ✎
                                </button>
                                <button
                                    type="button"
                                    aria-label={`删除「${s.title ?? "新会话"}」`}
                                    title="删除"
                                    onClick={() => remove.mutate(s.id)}
                                    className="hidden px-1 text-neutral-400 text-xs hover:text-red-600 group-focus-within:block group-hover:block"
                                >
                                    🗑
                                </button>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}
