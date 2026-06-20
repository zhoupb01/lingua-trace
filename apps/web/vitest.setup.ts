import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Unmount React trees between tests so the DOM doesn't leak across cases.
// (RTL's auto-cleanup only fires with `globals: true`; we import explicitly.)
afterEach(cleanup)
