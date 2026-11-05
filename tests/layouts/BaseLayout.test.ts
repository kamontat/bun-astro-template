import {expect, test} from "vitest"

test("BaseLayout loads Google Tag Manager from PUBLIC_GTM_ID", async () => {
	const source = await Bun.file("src/layouts/BaseLayout.astro").text()
	expect(source).toContain('import { loadGtm } from "#lib/gtm";')
	expect(source).toContain("loadGtm(import.meta.env.PUBLIC_GTM_ID, document);")
})
