export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""
export const LOGTO_ENDPOINT = import.meta.env.VITE_LOGTO_ENDPOINT ?? ""
export const LOGTO_APP_ID = import.meta.env.VITE_LOGTO_APP_ID ?? ""
export const LOGTO_API_RESOURCE = import.meta.env.VITE_LOGTO_API_RESOURCE ?? ""
export const LOGTO_SCOPES: string[] = ["email"]
export const LOGIN_PATH = "/login"
export const CALLBACK_PATH = "/callback"
// 应用本体在 /app(`/` 已让位给公开落地页);登录成功后回到这里。
export const DASHBOARD_PATH = "/app"

// 只暴露非 React 代码(api.ts 与下面的跳转函数)真正用到的方法。
// 刻意不放 isAuthenticated / isLoading:它们是会频繁翻转的状态,放进来既会诱导调用方
// 依赖快照值,也会逼 LogtoBridge 在每次变动时重设 authState、制造“无 token 窗口”。
type AuthState = {
    getAccessToken: () => Promise<string | undefined>
    signIn: (redirectUri?: string) => Promise<void>
    signOut: (postLogoutRedirectUri?: string) => Promise<void>
}

let state: AuthState | null = null
export function setAuthState(next: AuthState | null) {
    state = next
}
export function getAuthState() {
    return state
}
export function buildRedirectUri() {
    return `${window.location.origin}${CALLBACK_PATH}`
}
export async function signInToDashboard() {
    await state?.signIn(buildRedirectUri())
}
export async function redirectToLogin() {
    await state?.signIn(buildRedirectUri())
}
export async function logout() {
    await state?.signOut(`${window.location.origin}${LOGIN_PATH}`)
}
