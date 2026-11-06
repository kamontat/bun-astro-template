---
name: project-components
description: Use when writing, editing or moving an Astro component in src/components/ (atoms, molecules, organisms), deciding which atomic tier a component belongs to, adding client-side script, styling with src/styles/ or the CSS reset, writing a component test, or debugging a component that renders nothing, loses its styles or ships no JavaScript.
---

# Components

Layouts are the `project-layouts` skill; routes are the `project-pages` skill.

## Atomic tiers

Components follow Atomic Design. Every component is an `.astro` file in
`src/components/<tier>/<PascalName>.astro`, and its tier limits which components it imports:

| Tier | Directory | Holds | May import |
|---|---|---|---|
| Atoms | `atoms/` | one element: heading, button, input, link, icon | no component |
| Molecules | `molecules/` | a few atoms acting as one unit: input + button = search form | atoms |
| Organisms | `organisms/` | a page section: header, footer, card grid | atoms, molecules, organisms |

Atomic *templates* are `src/layouts/` and *pages* are `src/pages/`; both may import any tier.
`tests/components/atomic.test.ts` (rules in `tests/components/atomic.ts`) fails on a
component outside a tier, or on an import its tier does not allow — a molecule importing a
molecule included.

- Pick the lowest tier that fits. An atom that needs another component is a molecule; a
  molecule that needs another molecule is an organism. Move it up instead of loosening the
  rule.
- Components take their content through props or `<slot />`; none hardcodes page copy. Copy
  lives in pages.
- Moving a component between tiers moves its test too (`tests/components/<tier>/`), and
  every import of it.

## Examples

The sample `src/components/atoms/HelloWorld.astro` is a real atom. The ones below show the
shape of each tier; they are not in `src/`.

### Atom — one element, no component imports

`src/components/atoms/Button.astro`:

```astro
---
import type { HTMLAttributes } from "astro/types"

interface Props extends HTMLAttributes<"button"> {
	variant?: "primary" | "ghost"
}

const { variant = "primary", type = "button", ...attrs } = Astro.props
---

<button type={type} class={variant} {...attrs}><slot /></button>

<style>
	button {
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
	}
	.primary {
		background: var(--accent);
		color: var(--on-accent);
	}
	.ghost {
		background: transparent;
	}
</style>
```

`src/components/atoms/Input.astro` is the same shape around `<input {...attrs} />`, and
`src/components/atoms/Link.astro` wraps `<a href={href} aria-current={current ? "page" :
undefined}><slot /></a>`. Extending
`HTMLAttributes<"…">` lets callers pass any native attribute (`name`, `aria-label`, `disabled`)
without the atom listing each one.

### Molecule — atoms working as one unit

`src/components/molecules/SearchForm.astro`:

```astro
---
import Button from "#components/atoms/Button.astro"
import Input from "#components/atoms/Input.astro"

interface Props {
	action?: string
	label?: string
}

const { action = "/search", label = "Search" } = Astro.props
---

<form action={action} method="get" role="search">
	<div row>
		<Input type="search" name="q" aria-label={label} placeholder={label} />
		<Button type="submit">{label}</Button>
	</div>
</form>
```

The molecule owns how its atoms combine (the row, the shared `label`), not what they look
like. `<div row>` because the reset makes a bare `div` a column.

### Organism — a page section

`src/components/organisms/SiteHeader.astro`:

```astro
---
import Link from "#components/atoms/Link.astro"
import SearchForm from "#components/molecules/SearchForm.astro"

interface Props {
	links: { href: string; label: string }[]
}

const { links } = Astro.props
const current = Astro.url.pathname
---

<header>
	<nav aria-label="Main">
		<ul>
			{links.map((link) => (
				<li><Link href={link.href} current={link.href === current}>{link.label}</Link></li>
			))}
		</ul>
	</nav>
	<SearchForm />
</header>
```

An organism may read `Astro.url` and map over data, but it still gets the data (`links`) from
its caller, so a layout or page decides what the header shows.

## Shape of a component

A component is a frontmatter script that runs at build time, then the template.

- Props are typed by an `interface Props` in the frontmatter; `astro check` enforces it at
  every call site. Optional props get their default in the destructuring.
- Children go through `<slot />` (and named slots, `<slot name="aside" />`).
- Import with the alias, tier and extension: `import Button from "#components/atoms/Button.astro"`.
- `src/components/` may import from `src/lib/` and `src/styles/`, never from `src/layouts/` or
  `src/pages/`.

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
reviewer to delete. `src/env.d.ts` declares `row` and `block` on `astroHTML.JSX.HTMLAttributes`
so `astro check` accepts them; without it, `<div row>` is a type error.

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
import Greeting from "#components/atoms/Greeting.astro";

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
