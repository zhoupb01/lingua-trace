type AuthWindowDiagnostics = {
    endpoint: string
    appId: string
    apiResource: string
    redirectUri: string
}

function configHint(diagnostics: AuthWindowDiagnostics) {
    return [
        "Check the extension Logto application configuration.",
        `Register this redirect URI in Logto: ${diagnostics.redirectUri}`,
        `endpoint=${diagnostics.endpoint}`,
        `appId=${diagnostics.appId}`,
        `resource=${diagnostics.apiResource}`,
    ].join(" ")
}

export function assertAuthorizationUrl(url: string, diagnostics: AuthWindowDiagnostics) {
    const trimmed = url.trim()
    if (!trimmed)
        throw new Error(`Logto did not generate an authorization URL. ${configHint(diagnostics)}`)

    let parsed: URL
    try {
        parsed = new URL(trimmed)
    } catch {
        throw new Error(`Logto generated an invalid authorization URL. ${configHint(diagnostics)}`)
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error(
            `Logto generated an unsupported authorization URL. ${configHint(diagnostics)}`,
        )
    }

    return trimmed
}

export function explainAuthWindowError(error: unknown, diagnostics: AuthWindowDiagnostics) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("Authorization page could not be loaded")) {
        return new Error(`${message} ${configHint(diagnostics)}`)
    }
    return error instanceof Error ? error : new Error(message)
}
