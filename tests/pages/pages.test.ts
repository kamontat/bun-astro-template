import { Glob } from "bun"
import { expect, test } from "vitest"

const pages = Array.from(new Glob("**/*.astro").scanSync({ cwd: "src/pages" }))
const layouts = Array.from(new Glob("*.astro").scanSync({ cwd: "src/layouts" })).map((file) =>
	file.replace(/\.astro$/, ""),
)

// Layouts a source file imports through #layouts/* and renders as a tag.
const usedLayouts = (source: string) =>
	[...source.matchAll(/^import (\w+) from "#layouts\/(\w+)\.astro";?$/gm)]
		.filter(([, local]) => new RegExp(`<${local}\\b`).test(source))
		.map(([, , layout]) => layout as string)

// True when the layout is BaseLayout or renders one that reaches it.
const reachesBase = async (layout: string, seen = new Set<string>()): Promise<boolean> => {
	if (layout === "BaseLayout") return true
	if (seen.has(layout)) return false
	seen.add(layout)
	const source = await Bun.file(`src/layouts/${layout}.astro`).text()
	for (const inner of usedLayouts(source)) {
		if (await reachesBase(inner, seen)) return true
	}
	return false
}

test("src/pages has at least one page", () => {
	expect(pages.length).toBeGreaterThan(0)
})

test.each(pages)("%s renders inside BaseLayout, which loads Google Tag Manager", async (page) => {
	const source = await Bun.file(`src/pages/${page}`).text()
	const used = usedLayouts(source)
	expect(used.length).toBeGreaterThan(0)
	for (const layout of used) expect(await reachesBase(layout)).toBe(true)
})

test.each(layouts)("layout %s wraps BaseLayout", async (layout) => {
	expect(await reachesBase(layout)).toBe(true)
})
