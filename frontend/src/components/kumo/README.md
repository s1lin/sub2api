# Kumo in the Vue platform

These adapters render the actual `@cloudflare/kumo` React components through
Veaury. Existing Vue screens keep their `v-model`, native event, slot, and DOM-ref
contracts. Shared controls live here so those contracts have one implementation.

`bridge.ts` reconciles initial Vue slot updates, normalizes Vue DOM properties, and
forwards refs across nested React slots. `controls.ts` handles forms and links;
the other modules compose Kumo dialogs, menus, tables, and selectors.

Kumo's precompiled Tailwind 4 stylesheet is served and emitted by
`tooling/kumoStyles.ts`. The Vue application retains Tailwind 3. Theme overrides
in `src/styles/kumo.css` use the platform's copper and graphite design tokens.

Run `pnpm typecheck`, `pnpm test:run`, and `pnpm build` from `frontend`.
Component tests import `src/__tests__/render.ts` to settle both renderers and
exercise accessible controls and portals.
Keep Vue Teleport enabled in these tests: Veaury uses it to render Vue content
inside React slots. Unmount screens after each test to release their React roots.

For browser verification, start the dev server on port 3002 with the Clerk key
set to a single space in the process environment, then run:

```sh
pnpm exec playwright install chromium
pnpm verify:kumo
pnpm verify:platform
```

`KUMO_PREVIEW_URL` changes the preview address. `PLAYWRIGHT_CHROMIUM_EXECUTABLE`
can point to an existing Chrome installation. Screenshots and reports are saved
under `output/kumo`. The browser fixtures intercept API requests; verification
does not modify real accounts or billing settings. The harness is a development
entry and is not included in the production application build.
