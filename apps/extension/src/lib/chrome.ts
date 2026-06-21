import { t } from "./i18n"

type FailedResponse = { ok: false; error?: string }

function isFailedResponse(value: unknown): value is FailedResponse {
    return (
        typeof value === "object" &&
        value !== null &&
        "ok" in value &&
        (value as { ok: unknown }).ok === false
    )
}

export async function sendMessage<T>(message: unknown): Promise<T> {
    const response = await chrome.runtime.sendMessage(message)
    if (isFailedResponse(response))
        throw new Error(response.error ?? t("requestFailed", { status: "—" }))
    return response as T
}

export function storageGet<T>(keys: string | string[] | Record<string, unknown>): Promise<T> {
    return chrome.storage.local.get(keys as never) as Promise<T>
}

export function storageRemove(keys: string | string[]) {
    return chrome.storage.local.remove(keys)
}

export function storageSet(items: Record<string, unknown>) {
    return chrome.storage.local.set(items)
}
