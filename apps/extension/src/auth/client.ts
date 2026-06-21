import {
    BaseClient,
    createRequester,
    generateCodeChallenge,
    generateCodeVerifier,
    generateState,
    type LogtoConfig,
} from "@logto/browser"
import { ChromeStorage } from "./chromeStorage"

function client(config: LogtoConfig) {
    return new BaseClient(config, {
        requester: createRequester(fetch),
        storage: new ChromeStorage(config.appId),
        generateCodeChallenge,
        generateCodeVerifier,
        generateState,
        navigate: () => undefined,
    })
}

let instance: BaseClient | null = null

export function getLogtoClient(config: LogtoConfig) {
    instance ??= client(config)
    return instance
}
