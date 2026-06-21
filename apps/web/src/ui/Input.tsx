import type { InputHTMLAttributes } from "react"
import { cn } from "./cn"

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn(
                "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink caret-accent-600 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-faint focus-visible:border-accent-400 focus-visible:ring-2 focus-visible:ring-accent-400/40",
                className,
            )}
            {...props}
        />
    )
}
