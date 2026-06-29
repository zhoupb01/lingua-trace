import { describe, expect, test } from "bun:test"
import { assertAuthorizationUrl, explainAuthWindowError } from "./authWindow"

const diagnostics = {
    endpoint: "https://auth.example.com",
    appId: "extension-app",
    apiResource: "https://api.example.com",
    redirectUri: "https://abcdef.chromiumapp.org/",
}

describe("extension auth window diagnostics", () => {
    test("accepts generated http authorization URLs", () => {
        expect(assertAuthorizationUrl("https://auth.example.com/oidc/auth", diagnostics)).toBe(
            "https://auth.example.com/oidc/auth",
        )
    })

    test("rejects missing authorization URLs with Logto configuration context", () => {
        expect(() => assertAuthorizationUrl("", diagnostics)).toThrow(diagnostics.redirectUri)
        expect(() => assertAuthorizationUrl("", diagnostics)).toThrow(diagnostics.appId)
    })

    test("explains Chrome authorization page load failures with the extension redirect URI", () => {
        const error = explainAuthWindowError(
            new Error("Authorization page could not be loaded."),
            diagnostics,
        )

        expect(error.message).toContain("Authorization page could not be loaded.")
        expect(error.message).toContain(diagnostics.redirectUri)
        expect(error.message).toContain(diagnostics.appId)
    })
})
