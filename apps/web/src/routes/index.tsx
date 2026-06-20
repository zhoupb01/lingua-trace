import { useLogto } from "@logto/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ApiError, api, unwrap } from "@/lib/api"
import { apiResource } from "@/lib/logto"

export const Route = createFileRoute("/")({
    component: Home,
})

function Home() {
    const { isAuthenticated, isLoading: authLoading, getAccessToken } = useLogto()

    const { data, isLoading, error } = useQuery({
        queryKey: ["me"],
        enabled: isAuthenticated,
        queryFn: async () => {
            const token = await getAccessToken(apiResource)
            // unwrap → typed body on success, throws ApiError otherwise.
            return unwrap(api(token).me.$get())
        },
    })

    // Wait for Logto to settle so an authenticated user doesn't flash the sign-in prompt.
    if (authLoading) return <p>Loading…</p>
    if (!isAuthenticated) return <p>Sign in to see your profile.</p>
    if (isLoading) return <p>Loading…</p>
    if (error)
        return (
            <p className="text-red-600">
                Could not load profile: {error.message}
                {error instanceof ApiError && error.requestId ? ` (ref: ${error.requestId})` : ""}
            </p>
        )

    return (
        <pre className="mx-auto max-w-3xl overflow-auto rounded bg-neutral-100 p-4 text-sm">
            {JSON.stringify(data, null, 2)}
        </pre>
    )
}
