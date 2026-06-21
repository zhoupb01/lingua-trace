import type { SelectHTMLAttributes } from "react"
import { cn } from "./cn"
import { ChevronDownIcon } from "./icons"

// 原生 select 包一层：自定义箭头、冷色发丝边、翠绿 focus 环。保留原生可达性与移动端体验。
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="relative inline-flex w-full items-center">
            <select
                className={cn(
                    "w-full appearance-none rounded-xl border border-line bg-surface py-2.5 pr-9 pl-3.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-200 hover:border-line-strong focus-visible:border-accent-400 focus-visible:ring-2 focus-visible:ring-accent-400/40 disabled:cursor-not-allowed disabled:opacity-60",
                    className,
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 size-4 text-ink-faint" />
        </div>
    )
}
