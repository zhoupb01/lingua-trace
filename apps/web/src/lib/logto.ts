import type { LogtoConfig } from "@logto/react"

const apiResource = import.meta.env.VITE_LOGTO_API_RESOURCE

export const logtoConfig: LogtoConfig = {
    endpoint: import.meta.env.VITE_LOGTO_ENDPOINT,
    appId: import.meta.env.VITE_LOGTO_APP_ID,
    resources: [apiResource],
}

// The API resource indicator — pass to getAccessToken() to mint a token the API accepts.
export { apiResource }
