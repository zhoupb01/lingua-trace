// Example shared UI component. Reusable, presentational (no hooks) — easy to test.
export function Spinner({ label = "Loading…" }: { label?: string }) {
    return (
        <span role="status" className="text-neutral-500">
            {label}
        </span>
    )
}
