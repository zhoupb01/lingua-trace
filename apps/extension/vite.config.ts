import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import type { Plugin } from "vite"
import { defineConfig, loadEnv } from "vite"

const repoRoot = fileURLToPath(new URL("../..", import.meta.url))
const src = fileURLToPath(new URL("./src", import.meta.url))

function originPattern(value: string) {
    const url = new URL(value)
    return `${url.origin}/*`
}

function requiredExtensionEnv(env: Record<string, string>, name: string) {
    const value = env[name]
    if (!value) throw new Error(`Missing ${name}`)
    return value
}

function assertProductionOrigin(name: string, value: string) {
    const hostname = new URL(value).hostname
    if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "example.com" ||
        hostname.endsWith(".example.com")
    ) {
        throw new Error(`${name} cannot use development/example host in production`)
    }
}

function extensionApiBaseUrl(env: Record<string, string>) {
    return (
        env.VITE_EXTENSION_API_BASE_URL ||
        (env.DOMAIN ? `https://${env.DOMAIN}/api` : "http://127.0.0.1:3000")
    )
}

function extensionManifest(mode: string): Plugin {
    const env = loadEnv(mode, repoRoot, "")
    const production = mode === "production"
    const apiBaseUrl = extensionApiBaseUrl(env)
    const logtoEndpoint =
        env.VITE_EXTENSION_LOGTO_ENDPOINT || env.VITE_LOGTO_ENDPOINT || "https://auth.example.com"

    if (production) {
        if (!env.VITE_EXTENSION_LOGTO_APP_ID && !env.VITE_LOGTO_APP_ID) {
            requiredExtensionEnv(env, "VITE_EXTENSION_LOGTO_APP_ID")
        }
        if (!env.VITE_EXTENSION_LOGTO_API_RESOURCE && !env.VITE_LOGTO_API_RESOURCE) {
            requiredExtensionEnv(env, "VITE_EXTENSION_LOGTO_API_RESOURCE")
        }
        assertProductionOrigin("VITE_EXTENSION_API_BASE_URL", apiBaseUrl)
        assertProductionOrigin("VITE_EXTENSION_LOGTO_ENDPOINT", logtoEndpoint)
    }

    return {
        name: "lingua-trace-extension-manifest",
        generateBundle() {
            this.emitFile({
                type: "asset",
                fileName: "manifest.json",
                source: `${JSON.stringify(
                    {
                        manifest_version: 3,
                        name: "译迹 LinguaTrace",
                        short_name: "LinguaTrace",
                        description: "在网页中翻译选中文本，并自动保存到个人翻译记录。",
                        version: "0.1.0",
                        minimum_chrome_version: "116",
                        action: {
                            default_title: "打开 LinguaTrace",
                            default_icon: {
                                "16": "icons/icon-16.png",
                                "32": "icons/icon-32.png",
                                "48": "icons/icon-48.png",
                                "128": "icons/icon-128.png",
                            },
                        },
                        icons: {
                            "16": "icons/icon-16.png",
                            "32": "icons/icon-32.png",
                            "48": "icons/icon-48.png",
                            "128": "icons/icon-128.png",
                        },
                        background: { service_worker: "background.js", type: "module" },
                        content_scripts: [
                            {
                                matches: ["http://*/*", "https://*/*"],
                                js: ["content.js"],
                                run_at: "document_idle",
                            },
                        ],
                        side_panel: { default_path: "sidepanel.html" },
                        permissions: ["identity", "sidePanel", "storage"],
                        host_permissions: Array.from(
                            new Set([originPattern(apiBaseUrl), originPattern(logtoEndpoint)]),
                        ),
                        content_security_policy: {
                            extension_pages: "script-src 'self'; object-src 'self'",
                        },
                    },
                    null,
                    2,
                )}\n`,
            })
        },
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, repoRoot, "")
    return {
        base: "./",
        envDir: repoRoot,
        define: {
            "import.meta.env.VITE_EXTENSION_API_BASE_URL": JSON.stringify(extensionApiBaseUrl(env)),
        },
        resolve: { alias: { "@": src } },
        plugins: [react(), tailwindcss(), extensionManifest(mode)],
        build: {
            emptyOutDir: true,
            rollupOptions: {
                input: {
                    sidepanel: fileURLToPath(new URL("./sidepanel.html", import.meta.url)),
                    background: fileURLToPath(
                        new URL("./src/background/index.ts", import.meta.url),
                    ),
                    content: fileURLToPath(new URL("./src/content/index.ts", import.meta.url)),
                },
                output: {
                    entryFileNames: "[name].js",
                    chunkFileNames: "assets/[name].js",
                    assetFileNames: "assets/[name][extname]",
                },
            },
        },
    }
})
