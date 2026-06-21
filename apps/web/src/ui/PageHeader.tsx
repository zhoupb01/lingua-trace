import type { ReactNode } from "react"

export function PageHeader({
    title,
    subtitle,
    eyebrow,
    actions,
}: {
    title: string
    subtitle?: string
    eyebrow?: ReactNode
    actions?: ReactNode
}) {
    return (
        <div className="flex items-end justify-between gap-4">
            <div>
                {eyebrow ? (
                    <div className="mb-2 text-xs font-medium tracking-[0.16em] text-accent-700 uppercase">
                        {eyebrow}
                    </div>
                ) : null}
                <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-ink text-balance">
                    {title}
                </h1>
                {subtitle ? (
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
                        {subtitle}
                    </p>
                ) : null}
            </div>
            {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </div>
    )
}
