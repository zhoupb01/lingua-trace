import { LogtoProvider } from "@logto/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ErrorPage, NotFoundPage } from "@/components/Fallbacks"
import { ApiError } from "@/lib/api"
import { logtoConfig } from "@/lib/logto"
import { routeTree } from "@/routeTree.gen"
import "@/styles.css"

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Don't retry client errors (a 4xx won't fix itself); retry the rest.
            retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
        },
    },
})
const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultErrorComponent: ErrorPage,
    defaultNotFoundComponent: NotFoundPage,
})

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("root element not found")

createRoot(rootElement).render(
    <StrictMode>
        <LogtoProvider config={logtoConfig}>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </LogtoProvider>
    </StrictMode>,
)
