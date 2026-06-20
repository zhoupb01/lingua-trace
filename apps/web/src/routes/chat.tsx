import { useLogto } from "@logto/react"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { SessionList } from "@/components/chat/SessionList"

export const Route = createFileRoute("/chat")({
    component: ChatLayout,
})

// Two-pane chat: session list on the left, the selected session on the right.
function ChatLayout() {
    const { isAuthenticated, isLoading } = useLogto()
    // Wait for Logto to settle so an authenticated user doesn't flash "Sign in".
    if (isLoading) return <p className="text-neutral-500">Loading…</p>
    if (!isAuthenticated) return <p>Sign in to use chat.</p>

    return (
        <div className="flex h-[calc(100vh-9rem)] gap-4">
            <aside className="w-60 shrink-0 border-neutral-200 border-r pr-3">
                <SessionList />
            </aside>
            <section className="min-w-0 flex-1 overflow-y-auto">
                <Outlet />
            </section>
        </div>
    )
}
