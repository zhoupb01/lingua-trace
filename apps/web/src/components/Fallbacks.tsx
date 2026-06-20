import { Link } from "@tanstack/react-router"
import { ApiError } from "@/lib/api"

// Default router fallbacks (wired in main.tsx). ErrorPage renders for uncaught
// render/loader errors; NotFoundPage for unknown routes. Styling matches __root.tsx.

export function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
    const isApi = error instanceof ApiError
    return (
        <div className="space-y-4 rounded bg-red-50 p-6 text-red-700">
            <h1 className="font-semibold text-lg">Something went wrong</h1>
            <p className="whitespace-pre-wrap">{error.message}</p>
            {isApi && error.requestId && (
                <p className="text-red-500 text-sm">ref: {error.requestId}</p>
            )}
            <button
                type="button"
                onClick={reset}
                className="rounded bg-neutral-900 px-4 py-2 text-sm text-white"
            >
                Try again
            </button>
        </div>
    )
}

export function NotFoundPage() {
    return (
        <div className="space-y-4">
            <h1 className="font-semibold text-lg">Page not found</h1>
            <Link to="/" className="text-neutral-600 hover:text-neutral-900">
                ← Back home
            </Link>
        </div>
    )
}
