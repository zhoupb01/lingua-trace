import type { TextareaHTMLAttributes } from "react"
import { cn } from "./cn"

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            className={cn(
                "w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink caret-accent-600 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-faint focus-visible:border-accent-400 focus-visible:ring-2 focus-visible:ring-accent-400/40",
                className,
            )}
            {...props}
        />
    )
}
