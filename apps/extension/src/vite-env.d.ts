/// <reference types="vite/client" />
/// <reference types="chrome" />

interface ImportMetaEnv {
    readonly VITE_EXTENSION_API_BASE_URL?: string
    readonly VITE_EXTENSION_LOGTO_ENDPOINT?: string
    readonly VITE_EXTENSION_LOGTO_APP_ID?: string
    readonly VITE_EXTENSION_LOGTO_API_RESOURCE?: string
    readonly VITE_LOGTO_ENDPOINT?: string
    readonly VITE_LOGTO_APP_ID?: string
    readonly VITE_LOGTO_API_RESOURCE?: string
}
