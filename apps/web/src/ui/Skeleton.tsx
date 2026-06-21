import { cn } from "./cn"

// 骨架屏块：形状由调用方用 className 控制（贴合实际布局），微光由 .skeleton 提供。
export function Skeleton({ className }: { className?: string }) {
    return <div className={cn("skeleton rounded-md", className)} />
}
