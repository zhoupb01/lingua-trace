import type { Storage } from "@logto/browser"

function key(appId: string, item: string) {
    return `logto:${appId}:${item}`
}

export class ChromeStorage implements Storage<string> {
    constructor(private readonly appId: string) {}

    async getItem(item: string) {
        const data = await chrome.storage.local.get(key(this.appId, item))
        return (data[key(this.appId, item)] as string | undefined) ?? null
    }

    async setItem(item: string, value: string) {
        await chrome.storage.local.set({ [key(this.appId, item)]: value })
    }

    async removeItem(item: string) {
        await chrome.storage.local.remove(key(this.appId, item))
    }
}
