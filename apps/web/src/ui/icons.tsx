import type { SVGProps } from "react"

// 内联 SVG 图标集（零依赖）。统一 stroke 1.75、round 端点、currentColor。
// 刻意避开 Lucide/Feather 的默认观感与火箭/盾牌等陈词。

type IconProps = SVGProps<SVGSVGElement>

function Stroke({ className, children, ...props }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
            {...props}
        >
            {children}
        </svg>
    )
}

export function GlobeIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
        </Stroke>
    )
}

export function ChevronDownIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <path d="m6 9 6 6 6-6" />
        </Stroke>
    )
}

export function CopyIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <rect x="9" y="9" width="11" height="11" rx="2.5" />
            <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
        </Stroke>
    )
}

export function CheckIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <path d="m20 6.5-11 11-5-5" />
        </Stroke>
    )
}

export function RefreshIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3.5V9h-5.5" />
        </Stroke>
    )
}

export function LogoutIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <path d="M9.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4.5" />
            <path d="m16 16.5 4.5-4.5L16 7.5" />
            <path d="M20 12H9.5" />
        </Stroke>
    )
}

export function ArrowRightIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <path d="M4.5 12h14" />
            <path d="m12.5 6 6 6-6 6" />
        </Stroke>
    )
}

export function AlertIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <path d="M10.3 4.4 2.5 17.9A1.7 1.7 0 0 0 4 20.5h16a1.7 1.7 0 0 0 1.5-2.6L13.7 4.4a1.7 1.7 0 0 0-2.9 0Z" />
            <path d="M12 9.5v4" />
            <path d="M12 17h.01" />
        </Stroke>
    )
}

export function SparkleIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <path d="M12 3.5c.6 3.9 1.6 4.9 5.5 5.5-3.9.6-4.9 1.6-5.5 5.5-.6-3.9-1.6-4.9-5.5-5.5 3.9-.6 4.9-1.6 5.5-5.5Z" />
            <path d="M18.5 14.5c.3 1.7.7 2.1 2.5 2.5-1.8.4-2.2.8-2.5 2.5-.3-1.7-.7-2.1-2.5-2.5 1.8-.4 2.2-.8 2.5-2.5Z" />
        </Stroke>
    )
}

export function BoltIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <path d="M13 2.5 5 13h5l-1 8.5L19 10.5h-5l-1-8Z" />
        </Stroke>
    )
}

export function LockIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            <path d="M12 14.5v2" />
        </Stroke>
    )
}

export function HistoryIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <path d="M4 12a8 8 0 1 0 2.6-5.9" />
            <path d="M3.5 4.5V8.5H7.5" />
            <path d="M12 8v4.2l2.8 1.8" />
        </Stroke>
    )
}

// 侧边栏标记：窗口 + 右侧分栏,贴合「Chrome 侧边栏」语义。
export function PanelIcon(props: IconProps) {
    return (
        <Stroke {...props}>
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M14.5 5v14" />
        </Stroke>
    )
}

// 品牌标记：扁平圆角方块 + 纯白「L」+ 点。currentColor 控制方块底色（用 text-accent-600）。
export function BrandMark({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className} {...props}>
            <rect x="3" y="3" width="26" height="26" rx="7.5" fill="currentColor" />
            <path
                d="M12 8.5v10.2c0 .9.7 1.6 1.6 1.6H21"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="21" cy="11" r="2.4" fill="#ffffff" />
        </svg>
    )
}
