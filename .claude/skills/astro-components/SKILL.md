---
name: astro-components
description: Use when writing or editing an Astro component or layout in src/components/ or src/layouts/, adding client-side script, styling with src/styles/ or the CSS reset, writing a component test, or debugging a component that renders nothing, loses its styles or ships no JavaScript.
---

# Components

## Shape of a component

Every component is an `.astro` file in `src/components/<PascalName>.astro`: a frontmatter
script that runs at build time, then the template.

```astro
---
interface Props {
	name?: string;
}

const { name = "World" } = Astro.props;
---

<p>Hello, {name}!</p>

<style>
	p {
		color: var(--accent);
	}
</style>
```

- Props are typed by an `interface Props` in the frontmatter; `astro check` enforces it at
  every call site. Optional props get their default in the destructuring.
- Children go through `<slot />` (and named slots, `<slot name="aside" />`).
- Import with the alias and the extension: `import Greeting from "#components/Greeting.astro";`.
- `src/components/` may import from `src/lib/` and `src/styles/`, never from `src/pages/`.
- Layouts (`src/layouts/`) are components that render the `<html>` shell; pages wrap their
  content in `BaseLayout` (see the `adding-a-page` skill).

The frontmatter runs **once, at build time**, not in the browser: `Astro.props`, `fetch`, and
file reads there are baked into the HTML. Nothing in it reaches the visitor.

## Client-side script

Interactivity goes in a `<script>` tag inside the component. Astro bundles it with Vite
(TypeScript and `#lib/*` imports work), dedupes it across every instance of the component,
and emits it as a module script — inlined when small, a hashed file in `dist/_astro/`
otherwise. `<script is:inline>` opts out of all of that and ships the tag verbatim.

`import.meta.env.PUBLIC_*` inside such a script is replaced at build time. A variable unset at
build time becomes `undefined`, and when that lets the bundler prove a call does nothing it
drops the code entirely — which is how `BaseLayout`'s Google Tag Manager script disappears
from builds without `PUBLIC_GTM_ID`. Declare every such variable on `ImportMetaEnv` in
`src/env.d.ts`.

Frontmatter values do not reach a processed `<script>`. Pass them through a `data-*`
attribute and read it from the element, or use `define:vars` (which implies `is:inline`).

## Styles

A `<style>` in a component is **scoped**: Astro adds a `data-astro-cid-*` attribute to the
component's elements and rewrites the selectors, so `p { … }` only hits this component's
paragraphs, not those passed in through a slot or rendered by a child component. Use
`:global(…)` for a selector that must reach further, or `<style is:global>` for a whole block.

`src/styles/global.css` holds the reset and anything global; `BaseLayout` imports it, so every
page gets it. Theme values belong in custom properties defined once on `:root` there and read
with `var(--…)`; a component that hardcodes a colour also hardcodes a theme.

`@kcstyles/reset.css` makes every bare `div` `display: flex; flex-direction: column`
(opt out with `<div row>` for a row or `<div block>` for block). A `div` that wants a row
must say so even after `display: flex`, or it silently stacks — that is not a redundancy for a
reviewer to delete.

## Biome and `.astro` files

Biome lints and formats only the frontmatter of an `.astro` file. It cannot see the template,
so an import used only there looks unused; `biome.json` turns off `noUnusedImports`,
`noUnusedVariables`, `useConst` and `useImportType` for `**/*.astro`. Without that override,
`bun run format` deletes component imports. Don't remove it.

## Testing

Tests live in `tests/`, mirroring `src/`, and run with Vitest (`vitest.config.ts` wraps
Astro's `getViteConfig`, so `.astro` imports and the `#…` aliases resolve). Render a component
to an HTML string with the Container API:

```ts
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";
import Greeting from "#components/Greeting.astro";

test("renders the name", async () => {
	const container = await AstroContainer.create();
	const html = await container.renderToString(Greeting, { props: { name: "Bun" } });
	expect(html).toMatch(/<p[^>]*>Hello, Bun!<\/p>/);
});
```

- Elements carry `data-astro-cid-*` attributes when the component has a scoped style, so
  match `<p[^>]*>` rather than `<p>`.
- Slots go in `{ slots: { default: "<span>child</span>" } }`.
- The Container renders the frontmatter and template only; it does not run or emit processed
  `<script>` tags. Put script logic in `src/lib/` as a function taking its inputs (see
  `loadGtm(id, document)`) and test it there with `// @vitest-environment happy-dom`.
- Nothing renders in a browser, so no test proves a component is styled. The browser is the
  only check for colour, spacing and layout; list those as preview checks in the PR.
