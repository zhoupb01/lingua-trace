import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react"
import { cn } from "./cn"

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
    return (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <table className={cn("w-full text-left text-sm", className)} {...props} />
        </div>
    )
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <thead
            className={cn(
                "border-b border-line bg-paper-deep/40 text-xs tracking-wide text-ink-muted uppercase",
                className,
            )}
            {...props}
        />
    )
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
    return <tbody {...props} />
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr
            className={cn(
                "border-b border-line/70 transition-colors last:border-0 hover:bg-paper-deep/25",
                className,
            )}
            {...props}
        />
    )
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
    return <th className={cn("px-4 py-3 font-medium", className)} {...props} />
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
    return <td className={cn("px-4 py-3 text-ink-soft", className)} {...props} />
}
