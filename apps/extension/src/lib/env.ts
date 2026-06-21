function required(name: string, value: string | undefined) {
    if (!value) throw new Error(`Missing ${name}`)
    return value
}

function trimTrailingSlash(value: string) {
    return value.replace(/\/+$/, "")
}

export const env = {
    apiBaseUrl: trimTrailingSlash(
        required(
            "VITE_EXTENSION_API_BASE_URL",
            import.meta.env.PROD
                ? import.meta.env.VITE_EXTENSION_API_BASE_URL
                : import.meta.env.VITE_EXTENSION_API_BASE_URL ||
                      import.meta.env.VITE_API_BASE_URL ||
                      "http://127.0.0.1:3000",
        ),
    ),
    logtoEndpoint: trimTrailingSlash(
        required(
            "VITE_EXTENSION_LOGTO_ENDPOINT",
            import.meta.env.VITE_EXTENSION_LOGTO_ENDPOINT || import.meta.env.VITE_LOGTO_ENDPOINT,
        ),
    ),
    logtoAppId: required(
        "VITE_EXTENSION_LOGTO_APP_ID",
        import.meta.env.VITE_EXTENSION_LOGTO_APP_ID || import.meta.env.VITE_LOGTO_APP_ID,
    ),
    logtoApiResource: required(
        "VITE_EXTENSION_LOGTO_API_RESOURCE",
        import.meta.env.VITE_EXTENSION_LOGTO_API_RESOURCE ||
            import.meta.env.VITE_LOGTO_API_RESOURCE,
    ),
}
