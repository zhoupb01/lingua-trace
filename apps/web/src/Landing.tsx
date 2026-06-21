import { useLogto } from "@logto/react"
import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { signInToDashboard } from "@/auth"
import {
    ArrowRightIcon,
    BoltIcon,
    Brand,
    BrandMark,
    ChevronDownIcon,
    cn,
    GlobeIcon,
    HistoryIcon,
    LockIcon,
    PanelIcon,
    SparkleIcon,
} from "@/ui"

/*
 * 公开营销落地页(英文单语,面向 SEO / 全球访客)。
 * 无需登录、不套应用 Shell —— 自带 nav / footer。沿用全站 Clean Light 设计 token。
 * 路由放行见 routes/__root.tsx;应用本体在 /app。
 */

const SHELL = "mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8"
const CTA_PRIMARY =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-accent-700 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-800 active:bg-accent-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
const CTA_GHOST =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-5 py-3 text-sm font-semibold text-ink-soft transition-colors duration-200 hover:border-ink-faint hover:bg-paper-deep/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"

// 登录态感知的主 CTA:已登录 → 「Open app」(→ /app);未登录 → 调起 Logto。
function StartCta({
    label = "Get started — it’s free",
    authedLabel = "Open app",
    className = CTA_PRIMARY,
}: {
    label?: string
    authedLabel?: string
    className?: string
}) {
    const { isAuthenticated } = useLogto()
    if (isAuthenticated) {
        return (
            <Link to="/app" className={className}>
                {authedLabel}
                <ArrowRightIcon className="size-4" />
            </Link>
        )
    }
    return (
        <button type="button" onClick={() => void signInToDashboard()} className={className}>
            {label}
            <ArrowRightIcon className="size-4" />
        </button>
    )
}

const STEPS = [
    {
        title: "Type or select text",
        body: "Paste a sentence or a whole paragraph — or right-click selected text on any web page.",
    },
    {
        title: "Pick a target language",
        body: "Choose from 10+ languages. Your source text can be in any language.",
    },
    {
        title: "Translate & keep the trace",
        body: "Watch the translation stream in, then find it auto-saved to your private daily log.",
    },
]

const FEATURES = [
    {
        Icon: SparkleIcon,
        title: "Streaming translation",
        body: "Watch the translation appear token by token, without extra commentary or exposed model reasoning.",
    },
    {
        Icon: LockIcon,
        title: "Private by default",
        body: "Every translation is saved only to your account. Nothing is shared, nothing is public.",
    },
    {
        Icon: HistoryIcon,
        title: "Your translation history",
        body: "Each translation lands in your private history automatically — a quiet record of what you read and write.",
    },
    {
        Icon: GlobeIcon,
        title: "10+ languages",
        body: "Translate into English, Chinese, Japanese, Korean, French, German, Spanish and more.",
    },
    {
        Icon: PanelIcon,
        title: "Right in your browser",
        body: "An optional Chrome extension adds a side panel and a right-click Translate action.",
    },
    {
        Icon: BoltIcon,
        title: "Powered by OpenAI",
        body: "Context-aware translation with OpenAI — not word-for-word machine output.",
    },
]

const FAQS = [
    {
        q: "What is LinguaTrace?",
        a: "LinguaTrace is a minimal AI translator powered by OpenAI. You type or select any text, pick a target language, and it translates instantly — then automatically saves the result to your private log so you can look back on everything you’ve translated.",
    },
    {
        q: "Is LinguaTrace free to use?",
        a: "Yes. You sign in with a free account and start translating right away.",
    },
    {
        q: "Which languages can I translate into?",
        a: "LinguaTrace supports 10+ target languages, including English, Simplified Chinese, Japanese, Korean, French, German, Spanish, Portuguese, Italian and Russian. Source text can be in any language.",
    },
    {
        q: "Is my data private?",
        a: "Yes. Every translation is saved only to your own account and is never shared or made public. The Chrome extension never reads pages on its own — it only handles text you type or explicitly select.",
    },
    {
        q: "Do I need to install anything?",
        a: "No. LinguaTrace runs in your browser. There’s also an optional Chrome extension that adds a side panel and a right-click “Translate” action.",
    },
    {
        q: "How is this different from a normal translator?",
        a: "Most translators forget the moment you close the tab. LinguaTrace keeps a running record of what you translate, turning everyday translation into a personal language log you can learn from.",
    },
]

function Pill({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
            {children}
        </span>
    )
}

// 纯装饰的产品预览(对屏幕阅读器隐藏;真实信息在正文中)。
function HeroPreview() {
    return (
        <div
            aria-hidden
            className="rise rounded-2xl border border-line bg-surface p-4 shadow-pop sm:p-5"
        >
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-paper/60 p-3.5">
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-ink-muted">
                    翻译不是终点,翻译记录才是学习的起点。
                </p>
                <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-deep px-2 py-0.5 text-xs text-ink-muted">
                        <GlobeIcon className="size-3.5" /> English
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-3 py-1.5 text-xs font-semibold text-white">
                        Translate <ArrowRightIcon className="size-3.5" />
                    </span>
                </div>
            </div>

            <div className="mt-3 rounded-xl border border-accent-200 bg-accent-50/60 p-3.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-accent-700">
                    <SparkleIcon className="size-3.5" /> Translated to English
                </div>
                <p className="text-[15px] leading-relaxed text-ink">
                    Translation isn’t the finish line — the record is where learning begins.
                </p>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
                <HistoryIcon className="size-4 text-accent-500" />
                Saved to your history
            </div>
        </div>
    )
}

export function Landing() {
    return (
        <div className="flex min-h-dvh flex-col bg-paper">
            <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-md">
                <div className={cn(SHELL, "flex items-center justify-between gap-4 py-3.5")}>
                    <Brand name="LinguaTrace" size="sm" />
                    <nav className="hidden items-center gap-7 text-sm text-ink-muted md:flex">
                        <a href="#how" className="transition-colors hover:text-ink">
                            How it works
                        </a>
                        <a href="#features" className="transition-colors hover:text-ink">
                            Features
                        </a>
                        <a href="#faq" className="transition-colors hover:text-ink">
                            FAQ
                        </a>
                    </nav>
                    <StartCta label="Sign in" className={cn(CTA_PRIMARY, "px-4 py-2")} />
                </div>
            </header>

            <main className="flex-1">
                {/* Hero */}
                <section
                    className={cn(
                        SHELL,
                        "grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16",
                    )}
                >
                    <div className="flex flex-col gap-6">
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700">
                            <BoltIcon className="size-3.5" /> Powered by OpenAI
                        </span>
                        <h1 className="text-balance text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
                            Translate anything.
                            <br />
                            Remember everything.
                        </h1>
                        <p className="max-w-xl text-lg leading-relaxed text-ink-muted">
                            LinguaTrace turns any text into a clean, context-aware translation with
                            OpenAI — and quietly saves every one to your private log. Your
                            translations stop disappearing and start adding up.
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <StartCta />
                            <a href="#how" className={CTA_GHOST}>
                                See how it works
                            </a>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <Pill>
                                <LockIcon className="size-3.5" /> Private by default
                            </Pill>
                            <Pill>
                                <GlobeIcon className="size-3.5" /> 10+ languages
                            </Pill>
                            <Pill>
                                <PanelIcon className="size-3.5" /> Chrome extension
                            </Pill>
                            <Pill>No ads, no tracking</Pill>
                        </div>
                    </div>
                    <HeroPreview />
                </section>

                {/* How it works */}
                <section id="how" className="border-t border-line/70 bg-surface/40">
                    <div className={cn(SHELL, "py-16 sm:py-20")}>
                        <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                            From text to trace in three steps
                        </h2>
                        <p className="mt-3 max-w-2xl text-ink-muted">
                            No setup, no clutter. Translate the way you already think.
                        </p>
                        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
                            {STEPS.map((step, i) => (
                                <li
                                    key={step.title}
                                    className="rounded-2xl border border-line bg-surface p-6 shadow-card"
                                >
                                    <span className="tnum inline-flex size-9 items-center justify-center rounded-xl bg-accent-50 text-base font-semibold text-accent-700">
                                        {i + 1}
                                    </span>
                                    <h3 className="mt-4 text-base font-semibold text-ink">
                                        {step.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                                        {step.body}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Features */}
                <section id="features" className="border-t border-line/70">
                    <div className={cn(SHELL, "py-16 sm:py-20")}>
                        <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                            Everything you translate, worth keeping
                        </h2>
                        <p className="mt-3 max-w-2xl text-ink-muted">
                            A focused translator that respects your privacy and remembers your work.
                        </p>
                        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map(({ Icon, title, body }) => (
                                <div
                                    key={title}
                                    className="rounded-2xl border border-line bg-surface p-6 shadow-card"
                                >
                                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                                        <Icon className="size-5" />
                                    </span>
                                    <h3 className="mt-4 text-base font-semibold text-ink">
                                        {title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                                        {body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Chrome extension */}
                <section className="border-t border-line/70 bg-surface/40">
                    <div
                        className={cn(
                            SHELL,
                            "grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr]",
                        )}
                    >
                        <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
                                <PanelIcon className="size-3.5" /> Chrome extension
                            </span>
                            <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                                Translate without leaving the page
                            </h2>
                            <p className="mt-3 max-w-xl text-ink-muted">
                                Open the LinguaTrace side panel while you browse, or select text and
                                choose “Translate with LinguaTrace” from the right-click menu. It
                                never reads pages on its own — only the text you hand it — and saves
                                to the same private log as the web app.
                            </p>
                            <ul className="mt-6 flex flex-col gap-3 text-sm text-ink-soft">
                                <li className="flex items-start gap-2.5">
                                    <PanelIcon className="mt-0.5 size-4 shrink-0 text-accent-600" />
                                    Side panel that stays out of your way
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <SparkleIcon className="mt-0.5 size-4 shrink-0 text-accent-600" />
                                    Right-click any selection to translate it
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <HistoryIcon className="mt-0.5 size-4 shrink-0 text-accent-600" />
                                    Full history stays in sync with the web
                                </li>
                            </ul>
                        </div>
                        <div
                            aria-hidden
                            className="rounded-2xl border border-line bg-surface p-5 shadow-pop"
                        >
                            <div className="flex items-center gap-2 border-b border-line/70 pb-3">
                                <BrandMark className="size-6 text-accent-600" />
                                <span className="text-sm font-semibold text-ink">LinguaTrace</span>
                                <span className="ml-auto rounded-full bg-paper-deep px-2 py-0.5 text-[11px] text-ink-muted">
                                    Side panel
                                </span>
                            </div>
                            <div className="mt-3 rounded-xl border border-line bg-paper/60 p-3 text-[13px] text-ink-muted">
                                Select text on a page, then right-click → Translate.
                            </div>
                            <div className="mt-3 rounded-xl border border-accent-200 bg-accent-50/60 p-3 text-[13px] text-ink">
                                The translation appears here and is saved to your history.
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="border-t border-line/70">
                    <div className={cn(SHELL, "py-16 sm:py-20")}>
                        <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                            Frequently asked questions
                        </h2>
                        <div className="mt-8 flex flex-col gap-3">
                            {FAQS.map(({ q, a }) => (
                                <details
                                    key={q}
                                    className="group rounded-2xl border border-line bg-surface px-5 py-4 shadow-card"
                                >
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-ink">
                                        {q}
                                        <ChevronDownIcon className="size-5 shrink-0 text-ink-faint transition-transform duration-200 group-open:rotate-180" />
                                    </summary>
                                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                                        {a}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="border-t border-line/70">
                    <div className={cn(SHELL, "py-16 sm:py-24")}>
                        <div className="rounded-3xl border border-accent-200 bg-accent-50/60 px-6 py-12 text-center shadow-card sm:px-10 sm:py-16">
                            <BrandMark className="mx-auto size-12 text-accent-600" />
                            <h2 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                                Start keeping a trace
                            </h2>
                            <p className="mx-auto mt-3 max-w-md text-ink-muted">
                                Sign in and translate your first line in seconds. It’s free.
                            </p>
                            <div className="mt-7 flex justify-center">
                                <StartCta />
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-line/70">
                <div
                    className={cn(
                        SHELL,
                        "flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between",
                    )}
                >
                    <div className="max-w-xs">
                        <Brand name="LinguaTrace" size="sm" />
                        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                            AI translation with a memory. Translate anything, and keep every trace.
                        </p>
                    </div>
                    <nav className="flex flex-col gap-2.5 text-sm text-ink-muted">
                        <a href="#how" className="transition-colors hover:text-ink">
                            How it works
                        </a>
                        <a href="#features" className="transition-colors hover:text-ink">
                            Features
                        </a>
                        <a href="#faq" className="transition-colors hover:text-ink">
                            FAQ
                        </a>
                        <Link to="/app" className="transition-colors hover:text-ink">
                            Open the app
                        </Link>
                    </nav>
                </div>
                <div
                    className={cn(
                        SHELL,
                        "flex flex-col gap-1.5 border-t border-line/70 py-6 text-xs text-ink-faint",
                    )}
                >
                    <span className="inline-flex items-center gap-1.5 text-ink-muted">
                        <BrandMark className="size-3.5 text-accent-500" /> LinguaTrace
                    </span>
                    <span>
                        Your translations are saved only to your personal records, never shared.
                    </span>
                    <span>© 2026 LinguaTrace</span>
                </div>
            </footer>
        </div>
    )
}
