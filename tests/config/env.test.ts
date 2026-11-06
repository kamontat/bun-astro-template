import { expect, test } from "vitest"

// `bun run check` (astro check) type-checks this file: it fails when the
// @kcstyles/reset.css layout attributes are missing from src/env.d.ts.
test("div accepts the reset's row and block attributes", () => {
	const row: astroHTML.JSX.HTMLAttributes = { row: true }
	const block: astroHTML.JSX.HTMLAttributes = { block: true }
	expect([row, block]).toEqual([{ row: true }, { block: true }])
})
