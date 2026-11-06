---
name: project-layouts
description: Use when writing or editing a layout in src/layouts/ (the atomic template tier), changing what goes in every page's <html> or <head> — title, meta, favicons, global CSS, Google Tag Manager — adding a layout that wraps BaseLayout, or debugging a page with missing head tags, styles or analytics.
---

# Layouts

Layouts are the *templates* tier of Atomic Design: they arrange organisms into a page shape
and leave the content to pages. Components are the `project-components` skill; routes are
the `project-pages` skill.

## BaseLayout owns the document

`src/layouts/BaseLayout.astro` is the only file that writes `<html>`, `<head>` and `<body>`.
It:

- imports `src/styles/global.css` (the reset plus global custom properties), so every page
  gets it;
- sets `charset`, `viewport`, the favicons, the generator tag and `<title>` from its required
  `title` prop;
- runs `loadGtm(import.meta.env.PUBLIC_GTM_ID, document)` from `#lib/gtm` in a processed
  `<script>`. Without `PUBLIC_GTM_ID` at build time the bundler drops the call, so dev and
  preview builds carry no GTM code;
- renders the page into `<body>` through its default `<slot />`.

Every page renders inside `BaseLayout`, directly or through another layout;
`tests/pages/pages.test.ts` fails otherwise. Something every page needs in `<head>` (a meta
tag, a font preload) goes here, not into pages.

## Rules

- A layout lives in `src/layouts/<Name>Layout.astro` and is imported as
  `#layouts/<Name>Layout.astro`.
- Layouts may import components from any tier and other layouts; they never import pages,
  and components never import layouts.
- Every layout other than `BaseLayout` wraps `BaseLayout` and forwards its `title` (and any
  other head prop); it never writes `<html>` or `<head>` itself.
- A layout arranges content; it does not hold page copy. Text, links and data come in
  through props or slots from the page.
- Use named slots for regions a page fills (`<slot name="aside" />`); the default slot is
  the main content.

## Example — a template wrapping BaseLayout

`src/layouts/ArticleLayout.astro`, a two-column article shell built from organisms:

```astro
---
import SiteFooter from "#components/organisms/SiteFooter.astro"
import SiteHeader from "#components/organisms/SiteHeader.astro"
import BaseLayout from "#layouts/BaseLayout.astro"

interface Props {
	title: string
	links: { href: string; label: string }[]
}

const { title, links } = Astro.props
---

<BaseLayout title={title}>
	<SiteHeader links={links} />
	<div row>
		<main>
			<h1>{title}</h1>
			<slot />
		</main>
		{Astro.slots.has("aside") && (
			<aside>
				<slot name="aside" />
			</aside>
		)}
	</div>
	<SiteFooter />
</BaseLayout>

<style>
	main {
		flex: 1;
	}
	aside {
		width: 16rem;
	}
</style>
```

- `Astro.slots.has("aside")` leaves out the `<aside>` when a page fills no aside, rather than
  rendering an empty column.
- `<div row>` because `@kcstyles/reset.css` makes a bare `div` a column.
- The page still passes `title`; it reaches `<title>` through `BaseLayout`.

## Testing

Render a layout with the Container API and pass slots, as with a component:

```ts
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { expect, test } from "vitest"
import ArticleLayout from "#layouts/ArticleLayout.astro"

test("renders the title and the aside only when given", async () => {
	const container = await AstroContainer.create()
	const props = { title: "Post", links: [] }
	const plain = await container.renderToString(ArticleLayout, { props, slots: { default: "<p>Body</p>" } })
	expect(plain).toMatch(/<title>Post<\/title>/)
	expect(plain).not.toMatch(/<aside/)

	const withAside = await container.renderToString(ArticleLayout, {
		props,
		slots: { default: "<p>Body</p>", aside: "<p>Note</p>" },
	})
	expect(withAside).toMatch(/<aside[^>]*>\s*<p>Note<\/p>/)
})
```

The Container does not run processed `<script>` tags, so `tests/layouts/BaseLayout.test.ts`
checks the GTM call in the source text, and `loadGtm` itself is tested in
`tests/lib/gtm.test.ts`. Head contents that only a browser shows (favicon, styles applied)
are preview checks in the PR.
