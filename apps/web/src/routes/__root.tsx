import { useLogto } from "@logto/react"
import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router"

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: RootComponent,
})

function RootComponent() {
    const { isAuthenticated, isLoading, signIn, signOut } = useLogto()
    const origin = window.location.origin

    return (
        <div className="min-h-screen bg-neutral-50 text-neutral-900">
            <nav className="flex items-center gap-4 border-b border-neutral-200 px-6 py-3">
                <Link to="/" className="font-semibold">
                    App
                </Link>
                <Link to="/chat" className="text-neutral-600 hover:text-neutral-900">
                    Chat
                </Link>
                <div className="ml-auto">
                    {/* Render nothing until Logto settles, so an authenticated user
                        doesn't briefly see "Sign in" on every load. */}
                    {isLoading ? null : isAuthenticated ? (
                        <button
                            type="button"
                            onClick={() => signOut(origin)}
                            className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white"
                        >
                            Sign out
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => signIn(`${origin}/callback`)}
                            className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white"
                        >
                            Sign in
                        </button>
                    )}
                </div>
            </nav>
            <main className="px-6 py-8">
                <Outlet />
            </main>
        </div>
    )
}
