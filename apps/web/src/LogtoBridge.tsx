import { useLogto } from "@logto/react"
import { type ReactNode, useEffect, useRef } from "react"
import { LOGTO_API_RESOURCE, setAuthState } from "./auth"

// 把 useLogto 的方法桥接成模块单例，让非 React 的 api.ts 也能取 token。
//
// 关键：用 ref 持有最新的 useLogto 返回值，authState 只在挂载时设置一次、且中途永不置空。
// 原因——useLogto().getAccessToken 被 SDK 包了一层，每次调用都会翻转全局 isLoading；
// 若把这些会变的值放进 effect 依赖、并在 cleanup 里 setAuthState(null)，那么每取一次 token
// 就会出现一个“authState 为 null”的窗口，期间并发请求拿不到 token、裸奔成 401 → 误跳登录。
export function LogtoBridge({ children }: { children: ReactNode }) {
    const logto = useLogto()
    const logtoRef = useRef(logto)
    logtoRef.current = logto
    useEffect(() => {
        setAuthState({
            getAccessToken: () => logtoRef.current.getAccessToken(LOGTO_API_RESOURCE),
            signIn: (redirectUri?: string) =>
                logtoRef.current.signIn(redirectUri ?? window.location.href),
            signOut: (postLogoutRedirectUri?: string) =>
                logtoRef.current.signOut(postLogoutRedirectUri),
        })
        return () => setAuthState(null)
    }, [])
    return children
}
