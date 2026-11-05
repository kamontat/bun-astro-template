# Changelog

What changed in this project and why, newest first.

## 2026-11-05: Astro template on Bun, ported from bun-lit-template

### Features

- A static Astro 7 site with a `HelloWorld` component rendered inside `BaseLayout`, which
  owns the `<html>` shell, favicons, the `@kcstyles/reset.css` global stylesheet and Google
  Tag Manager. Every file under `src/pages/` is a route, built to `dist/<route>.html`.
- Every package script runs on the Bun runtime through `[run] bun = true` in `bunfig.toml`,
  as Bun's Astro guide recommends with `bunx --bun astro`.
- `bun run check` runs `astro check` (every `.astro` and `.ts` file, under the
  `@kcconfigs/tsconfig` `bun` preset plus Astro's `strictest`) and then Biome.
- Tests run with Vitest through Astro's Vite config: components render with the Container
  API, browser code runs under happy-dom, and `tests/pages/pages.test.ts` fails if a page
  stops using `BaseLayout`.
- Google Tag Manager loads from `PUBLIC_GTM_ID`, inlined at build time. `Deploy Production`
  passes it from the `GTM_ID` repository variable; without it the build has no GTM code.
- The CI and Cloudflare Workers deploy workflows, `GET_START.md` agent setup prompt and
  Claude Code skills from bun-lit-template, adapted to Astro; `ui-components` is replaced by
  `astro-components`.
- `.vscode/extensions.json` recommends the Astro extension, and `bun run astro …` runs any
  other Astro CLI command, such as `bun run astro add <integration>`.

### Decisions

- Vitest replaces `bun test` because `.astro` files need Astro's Vite compiler, which
  `bun test` cannot load. It still runs on Bun, so no Node.js install is needed.
- `build.format: "file"` with `trailingSlash: "never"` keeps the bun-lit-template URL shape
  (`/about` served from `about.html`), and makes `dev` 404 the same paths production does.
- GTM stays a bundled module script calling `loadGtm`, not Google's inline snippet, so the
  id stays out of the repository and the call is dropped from builds without an id.
