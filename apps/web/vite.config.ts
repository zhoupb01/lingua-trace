import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
// `vitest/config` is a superset of Vite's defineConfig (adds the `test` key), so
// tests reuse this exact config — same plugins, `@` alias, import.meta.env.
import { defineConfig } from "vitest/config"

export default defineConfig({
    // Load .env from the monorepo root (one .env for both apps; prod uses the same
    // file via docker-compose `env_file`). Only VITE_-prefixed vars reach the bundle.
    envDir: fileURLToPath(new URL("../../", import.meta.url)),
    plugins: [
        // router plugin must come before the react plugin
        tanstackRouter({ target: "react", autoCodeSplitting: true }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    server: {
        port: 5173,
        // mirror Traefik: /api -> api service, prefix stripped
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
    test: {
        // happy-dom gives component tests a window/document; cleanup in setup.
        environment: "happy-dom",
        setupFiles: ["./vitest.setup.ts"],
    },
})
