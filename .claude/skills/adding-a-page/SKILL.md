---
name: adding-a-page
description: Use when adding a new page or route under src/pages/, or when a page builds but paints unstyled, has no Google Tag Manager, or 404s after deploy.
---

# Adding a page

## How routes map

Astro's file-based routing: every `.astro` (or `.md`) file under `src/pages/`, at any depth,
is a route — the path under `src/pages/` without the extension, with `index.astro` answering
its own directory. Files and directories starting with `_` are not routes.

```text
src/pages/index.astro          ->  /             (dist/index.html)
src/pages/about.astro          ->  /about        (dist/about.html)
src/pages/about/index.astro    ->  /about        (dist/about/index.html — same route, pick one)
src/pages/blog/post.astro      ->  /blog/post    (dist/blog/post.html)
```

`astro.config.ts` sets `build.format: "file"` and `trailingSlash: "never"`, so `about.astro`
lands at `dist/about.html` and Cloudflare's static assets serve it at `/about`. Nothing else
names a page: a new file is picked up with no other edit.

Dynamic routes (`[slug].astro`) need `getStaticPaths()` because the site is built with
`output: "static"`; without it `astro build` fails.

## Steps

1. Create `src/pages/<slug>.astro`. Wrap the content in `BaseLayout`:

   ```astro
   ---
   import BaseLayout from "#layouts/BaseLayout.astro";
   ---

   <BaseLayout title="About">
   	<h1>About</h1>
   </BaseLayout>
   ```

   `BaseLayout` owns the `<html>` shell: `charset`, `viewport`, favicons, the `<title>`,
   the global stylesheet and the Google Tag Manager script. A page never writes its own
   `<html>` or `<head>`.
2. Import components and layouts through the `#components/*` and `#layouts/*` aliases,
   with the `.astro` extension (`#components/atoms/HelloWorld.astro`).
3. Link between pages with root-relative links that match the route exactly — `/about`,
   never `/about/` (`trailingSlash: "never"` makes the dev server 404 the slash form, the
   same as production).
4. Files no page imports (favicon, `robots.txt`, images used by URL) go in `public/` and are
   copied to the root of `dist/` as-is.
5. Run `bun run build` and confirm the page appears in the `generating static routes` list,
   then `bun run preview` and open it.

## What the tests catch

`tests/pages/pages.test.ts` reads every `.astro` under `src/pages/` and fails when one does
not import and use `BaseLayout`, so a new page cannot silently drop analytics or the global
styles. Extend that test when another line becomes mandatory on every page.
