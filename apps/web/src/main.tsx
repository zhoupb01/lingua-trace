import { LogtoProvider } from "@logto/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { LOGTO_API_RESOURCE, LOGTO_APP_ID, LOGTO_ENDPOINT, LOGTO_SCOPES } from "@/auth"
import { I18nProvider } from "@/i18n"
import { LogtoBridge } from "@/LogtoBridge"
import { NotFound } from "@/NotFound"
import { routeTree } from "@/routeTree.gen"
import "@/styles.css"

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { refetchOnWindowFocus: false, retry: false },
        mutations: { retry: false },
    },
})
const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultNotFoundComponent: NotFound,
})

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}

const rootElement = document.getElementById("root") ?? document.getElementById("app")
if (!rootElement) throw new Error("root element not found")

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <I18nProvider>
                <LogtoProvider
                    config={{
                        endpoint: LOGTO_ENDPOINT,
                        appId: LOGTO_APP_ID,
                        resources: [LOGTO_API_RESOURCE],
                        scopes: LOGTO_SCOPES,
                    }}
                >
                    <LogtoBridge>
                        <RouterProvider router={router} />
                    </LogtoBridge>
                </LogtoProvider>
            </I18nProvider>
        </QueryClientProvider>
    </StrictMode>,
)
