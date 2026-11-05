import { Glob } from "bun"
import { expect, test } from "vitest"

const pages = Array.from(new Glob("**/*.astro").scanSync({ cwd: "src/pages" }))

test("src/pages has at least one page", () => {
	expect(pages.length).toBeGreaterThan(0)
})

test.each(pages)("%s renders inside BaseLayout, which loads Google Tag Manager", async (page) => {
	const source = await Bun.file(`src/pages/${page}`).text()
	expect(source).toMatch(/^import BaseLayout from "#layouts\/BaseLayout\.astro";$/m)
	expect(source).toMatch(/<BaseLayout\b/)
})
