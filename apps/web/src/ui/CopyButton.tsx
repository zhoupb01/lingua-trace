import { useEffect, useRef, useState } from "react"
import { cn } from "./cn"
import { CheckIcon, CopyIcon } from "./icons"

// 复制按钮：点击后短暂切到「已复制」+ 朱砂对勾，再自动复位。
export function CopyButton({
    value,
    label,
    copiedLabel,
    className,
}: {
    value: string
    label: string
    copiedLabel: string
    className?: string
}) {
    const [copied, setCopied] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => () => clearTimeout(timer.current ?? undefined), [])

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            clearTimeout(timer.current ?? undefined)
            timer.current = setTimeout(() => setCopied(false), 1600)
        } catch {
            // 剪贴板不可用时静默：用户可手动选择文本复制。
        }
    }

    return (
        <button
            type="button"
            onClick={onCopy}
            aria-label={copied ? copiedLabel : label}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                copied ? "text-accent-700" : "text-ink-muted hover:bg-ink/5 hover:text-ink",
                className,
            )}
        >
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            <span>{copied ? copiedLabel : label}</span>
        </button>
    )
}
