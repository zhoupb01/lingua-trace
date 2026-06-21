import { cn } from "./cn"
import { BrandMark } from "./icons"

// 字标：扁平翠绿标记 + 无衬线品牌名（Geist；CJK「译迹」回退系统黑体）。
export function Brand({
    name,
    size = "md",
    className,
}: {
    name: string
    size?: "sm" | "md"
    className?: string
}) {
    const mark = size === "sm" ? "size-7" : "size-9"
    const text = size === "sm" ? "text-lg" : "text-[22px]"
    return (
        <span className={cn("inline-flex items-center gap-2.5", className)}>
            <BrandMark className={cn(mark, "text-accent-600")} />
            <span className={cn("font-semibold tracking-tight text-ink", text)}>{name}</span>
        </span>
    )
}
