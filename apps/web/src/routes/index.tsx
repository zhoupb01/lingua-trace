import { createFileRoute } from "@tanstack/react-router"
import { Landing } from "@/Landing"

// 公开英文落地页(面向 SEO)。应用本体见 routes/app.tsx(/app),登录门禁见 routes/__root.tsx。
export const Route = createFileRoute("/")({ component: Landing })
