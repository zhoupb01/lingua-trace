import {
    type ButtonHTMLAttributes,
    type HTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
    useEffect,
    useRef,
    useState,
} from "react"
import { AlertIcon, BrandMark, CheckIcon, ChevronDownIcon, CopyIcon } from "./icons"

export function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ")
}

type Variant = "primary" | "ghost"

const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-[transform,background-color,border-color,color] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"

const buttonVariants: Record<Variant, string> = {
    primary: "bg-accent-700 px-4 py-2.5 text-white hover:bg-accent-800 active:bg-accent-800",
    ghost: "border border-line-strong bg-surface px-3.5 py-2 text-ink-soft hover:border-ink-faint hover:bg-paper-deep/50",
}

export function Button({
    className,
    variant = "primary",
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
    return <button className={cn(buttonBase, buttonVariants[variant], className)} {...props} />
}

export function GhostButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <Button variant="ghost" {...props} />
}

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

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            className={cn(
                "w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink caret-accent-600 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-faint focus-visible:border-accent-400 focus-visible:ring-2 focus-visible:ring-accent-400/40",
                className,
            )}
            {...props}
        />
    )
}

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

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <section
            className={cn("rounded-2xl border border-line bg-surface p-4 shadow-card", className)}
            {...props}
        />
    )
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn("skeleton rounded-md", className)} />
}

export function Brand({ name, className }: { name: string; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-2", className)}>
            <BrandMark className="size-7 text-accent-600" />
            <span className="text-lg font-semibold tracking-tight text-ink">{name}</span>
        </span>
    )
}

export function ErrorBanner({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm text-danger-700"
        >
            <AlertIcon className="mt-0.5 size-4 shrink-0 text-danger-600" />
            <span className="break-words">{message}</span>
        </div>
    )
}

export function CopyButton({
    value,
    label = "Copy",
    copiedLabel = "Copied",
}: {
    value: string
    label?: string
    copiedLabel?: string
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
            // 剪贴板不可用时静默。
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
            )}
        >
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            <span>{copied ? copiedLabel : label}</span>
        </button>
    )
}
