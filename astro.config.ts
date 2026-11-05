import { defineConfig } from "astro/config";

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	output: "static",
	// "file" writes about.astro to dist/about.html, served at /about by Cloudflare static assets.
	build: { format: "file" },
	trailingSlash: "never",
});
