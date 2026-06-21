import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "./cn"

type Variant = "primary" | "ghost" | "quiet"

const base =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-[transform,background-color,border-color,color] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"

const variants: Record<Variant, string> = {
    // 翠绿主按钮：bg 用 accent-700 保证白字 AA 对比，hover/active 逐级加深；扁平无光晕。
    primary: "bg-accent-700 px-4 py-2.5 text-white hover:bg-accent-800 active:bg-accent-800",
    ghost: "border border-line-strong bg-surface px-4 py-2.5 text-ink-soft hover:border-ink-faint hover:bg-paper-deep/50",
    quiet: "px-3 py-2 text-ink-muted hover:bg-ink/5 hover:text-ink",
}

export function Button({
    className,
    variant = "primary",
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
    return <button className={cn(base, variants[variant], className)} {...props} />
}

// 图标按钮：必须传 label 作为无障碍名（退出/复制/刷新等）。
export function IconButton({
    className,
    label,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={cn(
                "inline-flex items-center justify-center rounded-lg p-2 text-ink-muted transition-colors duration-200 hover:bg-ink/5 hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                className,
            )}
            {...props}
        >
            {children}
        </button>
    )
}
