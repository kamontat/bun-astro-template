---
name: project-deploy
description: Use when changing `bun run build`, `bun run dev`, `bun run preview`, astro.config.ts, public/, wrangler.jsonc, the dist/ output shape, or anything under .github/workflows/ — including bumping a pinned action SHA or debugging a Cloudflare deploy.
---

# Build and deployment

## Build

`dev`, `build` and `preview` are each one `astro` command in `package.json`, with no wrapper
script, run on the Bun runtime through `bunfig.toml`'s `[run] bun = true` (see the
`project-scripts` skill). `astro build` renders every route under `src/pages/` (see the
`project-pages` skill) to static HTML in `dist/`, with bundled scripts and styles in
`dist/_astro/` under hashed names, and copies `public/` to the root of `dist/` unchanged.
Astro empties `dist/` before each build, so no stale file from an earlier build reaches a
deploy.

`astro.config.ts` fixes the output shape: `output: "static"` (no server code, no adapter),
`build.format: "file"` (`about.astro` becomes `dist/about.html`, not `dist/about/index.html`)
and `trailingSlash: "never"`. Cloudflare's static assets serve `about.html` at `/about`, so
the three must change together. Adding an adapter or `output: "server"` turns the deploy
into a Worker script, which `wrangler.jsonc` is not set up for.

Small scripts and stylesheets are inlined into the HTML rather than written to `_astro/`
(Vite's `assetsInlineLimit`), so a page can ship with no separate JS file at all. A grep for
something baked into a script must read the HTML as well as `_astro/*.js`.

`import.meta.env.PUBLIC_*` is replaced at build time from the environment (or a `.env`
file). Declare each variable on `ImportMetaEnv` in `src/env.d.ts`. One exists today:
`PUBLIC_GTM_ID`, read by `BaseLayout` (see "Google Tag Manager" below). Unset at build time,
the reference becomes `undefined`. Variables without the `PUBLIC_` prefix are available in
frontmatter at build time but never reach the browser.

`dist/` is what Cloudflare serves — `wrangler.jsonc` names it as `assets.directory` — so
its shape is part of the deployment contract, not a local convenience.

## Deployment

The site is a Cloudflare Worker serving static assets. `wrangler.jsonc` sets
`build.command` to `bun run build` and points `assets.directory` at `dist/`, so wrangler
runs the build itself and neither deploy workflow builds beforehand. Changing where the
build writes means changing that file too.

Three workflows, each pinning every action to a full commit SHA with the release tag in a
trailing comment:

- `main.yml` — every push: install, `bun run check`, `bun run build`, `bun run test`.
- `deploy-preview.yml` — pull requests: `wrangler versions upload --preview-alias
  pr-<number>`, reporting into the `preview` environment.
- `deploy-production.yml` — pushes to `main`: `wrangler deploy`, reporting into the
  `production` environment.

Both deploy jobs carry `if: ${{ !github.event.repository.is_template }}`: the template
repository has no Worker of its own, so it skips them, while a repository created from it
is not a template and deploys. Keep the guard on any new deploy job.

Each workflow's `environment.url` is only the link GitHub shows on the deployment; wrangler
does not read it. It is built by hand because the action's `deployment-url` output knows
neither preview aliases nor custom domains, so it must be edited whenever the Worker name,
the workers.dev subdomain or the custom domain changes.

Both deploy workflows need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets, and grant `deployments: write` on the job rather than at the top — the files open
with `permissions: {}` and hand back only what each job needs. Keep that shape in anything
new.

Bun's local version is pinned in `mise.toml`; keep any CI pin in sync with it.

A pinned SHA is bumped by resolving the tag again, never by hand:

```sh
gh api repos/actions/checkout/releases/latest --jq .tag_name   # e.g. v7.0.1
gh api repos/actions/checkout/commits/v7.0.1 --jq .sha         # the SHA to pin
```

Update the trailing comment in the same edit — a stale comment is worse than none, since it
is the only readable record of which version the SHA is.

Pushing any change under `.github/workflows/` needs a token with the `workflow` scope:
`gh auth refresh -h github.com -s workflow`.

## Google Tag Manager

`deploy-production.yml` sets `PUBLIC_GTM_ID: ${{ vars.GTM_ID }}` on the wrangler step,
since wrangler runs the build as its own child; `deploy-preview.yml` deliberately does not,
so previews never send analytics. An unset `GTM_ID` variable arrives as `""`, which
`loadGtm` rejects, so GTM is simply off. Changing the container means changing the
variable and re-running `Deploy Production` — the ID is baked into the build, not read at
runtime. To confirm a deploy carries it, grep the page for the ID: the script is small
enough that Astro inlines it into the HTML. A build without an ID has no GTM code at all,
because the bundler drops the call it can prove does nothing.

## Debugging a failed deploy

- `gh run view <id> --log-failed` first; quote the decisive line.
- `Authentication error` / `10000`: the token is an account API token scoped to one Worker
  with **Editor**. Check it is scoped to the Worker named in `wrangler.jsonc` (a renamed
  Worker needs a new token), lives in the `CLOUDFLARE_ACCOUNT_ID` account, and has
  **Workers Routes: Edit** on the zone when a custom domain is set. A Worker-scoped token
  cannot create a Worker: a new Worker name needs one local `bunx wrangler deploy` under
  `wrangler login` first.
- Worker name in the error is `<TODO>`: the template was never customized — see
  `GET_START.md`.
- Deploy passed but the page is unstyled or broken: open the browser console. A 404 on an
  `/_astro/` file means a stale or partial `dist/`; a 404 on the page itself means no file
  under `src/pages/` maps to that path, or the link has a trailing slash (see
  `project-pages`).
