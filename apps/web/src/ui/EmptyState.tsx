import type { ReactNode } from "react"
import { BrandMark } from "./icons"

// 构图化空状态：淡标记 + 标题 + 引导文案，而非干瘪一行。
export function EmptyState({
    title,
    description,
    action,
}: {
    title: string
    description?: string
    action?: ReactNode
}) {
    return (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
            <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-500">
                <BrandMark className="size-7" />
            </span>
            <p className="text-lg font-medium text-ink">{title}</p>
            {description ? (
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
                    {description}
                </p>
            ) : null}
            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    )
}
