import { useHandleSignInCallback } from "@logto/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/callback")({
    component: Callback,
})

function Callback() {
    const navigate = useNavigate()
    const { isLoading } = useHandleSignInCallback(() => {
        navigate({ to: "/" })
    })
    return <p className="text-neutral-600">{isLoading ? "Signing you in…" : "Done."}</p>
}
