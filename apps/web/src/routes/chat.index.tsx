import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/chat/")({
    component: ChatIndex,
})

function ChatIndex() {
    return (
        <div className="grid h-full place-items-center text-neutral-500">
            选择左侧会话，或点 “+ New chat” 新建一个
        </div>
    )
}
