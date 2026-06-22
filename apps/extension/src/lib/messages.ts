import type { TargetLanguage } from "@/lib/translation"

export const TRANSLATE_SELECTION_PORT = "lingua-trace.translate-selection"
export const TARGET_LANGUAGE_KEY = "lingua-trace.target-language"
export const LOCALE_KEY = "lingua-trace.locale"

export type ExtensionMessage =
    | { type: "auth:sign-in" }
    | { type: "auth:sign-out" }
    | { type: "auth:status" }
    | { type: "auth:token" }
    | { type: "auth:user" }
    | { type: "preferences:set-target-language"; targetLanguage: TargetLanguage }

export type TranslateSelectionRequest = {
    type: "translate-selection:start"
    text: string
}

export type TranslateSelectionEvent =
    | { type: "translate-selection:auth-required" }
    | { type: "translate-selection:started"; targetLanguage: TargetLanguage }
    | { type: "translate-selection:delta"; text: string }
    | { type: "translate-selection:done"; translatedText: string }
    | { type: "translate-selection:error"; message: string; code?: string }

export type AuthStatus = { isAuthenticated: boolean }
export type TokenResponse = { accessToken: string | null }
export type AuthUser = {
    sub: string
    name: string | null
    email: string | null
    avatar: string | null
}
export type AuthUserResponse = { user: AuthUser | null }
