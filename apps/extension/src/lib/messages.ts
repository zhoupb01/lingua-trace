import type { TargetLanguage } from "@/lib/translation"

export const MENU_TRANSLATE_SELECTION = "lingua-trace.translate-selection"
export const PENDING_SELECTION_KEY = "lingua-trace.pending-selection"
export const TARGET_LANGUAGE_KEY = "lingua-trace.target-language"
export const LOCALE_KEY = "lingua-trace.locale"

export type ExtensionMessage =
    | { type: "auth:sign-in" }
    | { type: "auth:sign-out" }
    | { type: "auth:status" }
    | { type: "auth:token" }
    | { type: "auth:user" }
    | { type: "selection:get-pending" }
    | { type: "selection:set-pending"; text: string }
    | { type: "preferences:set-target-language"; targetLanguage: TargetLanguage }

export type AuthStatus = { isAuthenticated: boolean }
export type TokenResponse = { accessToken: string | null }
export type AuthUser = {
    sub: string
    name: string | null
    email: string | null
    avatar: string | null
}
export type AuthUserResponse = { user: AuthUser | null }
export type PendingSelectionResponse = { text: string | null }
