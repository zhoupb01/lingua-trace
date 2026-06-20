import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Spinner } from "@/components/Spinner"

// Component test pattern: render with Testing Library, query, assert.
describe("Spinner", () => {
    test("renders its label", () => {
        render(<Spinner label="Working…" />)
        expect(screen.getByRole("status").textContent).toBe("Working…")
    })
})
