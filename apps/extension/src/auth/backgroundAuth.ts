import { Prompt } from "@logto/browser"
import { env } from "@/lib/env"
import type { AuthUser } from "@/lib/messages"
import { getLogtoClient } from "./client"

function redirectUri() {
    return chrome.identity.getRedirectURL()
}

const logto = getLogtoClient({
    endpoint: env.logtoEndpoint,
    appId: env.logtoAppId,
    resources: [env.logtoApiResource],
    scopes: ["email"],
})

function stringValue(value: unknown) {
    return typeof value === "string" && value.trim() ? value : null
}

function userFromClaims(claims: Record<string, unknown> | null | undefined): AuthUser | null {
    const sub = stringValue(claims?.sub)
    if (!sub) return null
    return {
        sub,
        name: stringValue(claims?.name) ?? stringValue(claims?.username),
        email: stringValue(claims?.email),
        avatar: stringValue(claims?.picture),
    }
}

async function launchAuthWindow(url: string) {
    const callbackUrl = await chrome.identity.launchWebAuthFlow({ url, interactive: true })
    if (!callbackUrl) throw new Error("sign-in cancelled")
    return callbackUrl
}

export async function signIn() {
    let signInUrl = ""
    logto.adapter.navigate = (url) => {
        signInUrl = url
    }
    await logto.signIn({ redirectUri: redirectUri(), prompt: Prompt.Consent })
    await logto.handleSignInCallback(await launchAuthWindow(signInUrl))
}

export async function signOut() {
    let signOutUrl = ""
    logto.adapter.navigate = (url) => {
        signOutUrl = url
    }
    await logto.signOut(redirectUri())
    if (signOutUrl)
        await chrome.identity
            .launchWebAuthFlow({ url: signOutUrl, interactive: false })
            .catch(() => undefined)
}

export function isAuthenticated() {
    return logto.isAuthenticated()
}

export async function getAccessToken() {
    if (!(await logto.isAuthenticated())) return null
    return logto.getAccessToken(env.logtoApiResource)
}

export async function getCurrentUser() {
    if (!(await logto.isAuthenticated())) return null
    try {
        return userFromClaims((await logto.fetchUserInfo()) as Record<string, unknown>)
    } catch {
        return userFromClaims((await logto.getIdTokenClaims()) as Record<string, unknown>)
    }
}
