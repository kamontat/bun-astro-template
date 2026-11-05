/// <reference types="vitest/config" />
import {getViteConfig} from "astro/config"

export default getViteConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environmentOptions: {
			// Never fetch external scripts (such as gtm.js); report them as loaded instead of erroring.
			happyDOM: {settings: {handleDisabledFileLoadingAsSuccess: true}},
		},
	},
})
