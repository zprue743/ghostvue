# Executable examples

Every runnable component sample lives as a typed Vue SFC under unpublished
`examples/<component>/<example>.vue`. The file is the single source of truth:
docs live previews, the playground gallery, e2e accessibility checks, and
manifest `examples` arrays all point at the same id.

This is not a publishable package. Do not add it to
`scripts/workspace-packages.mjs` or to a library `exports` map. A future MCP
`get_examples` tool should import `examples/registry.ts` rather than growing a
second catalog.

## File and id convention

```text
examples/button/icon-only.vue
```

- The **id** is the path without `examples/` or `.vue`: `button/icon-only`.
- `<component>` is the Ghost-stripped kebab name (`GhostButton` → `button`).
- The SFC is a complete, typechecked `<script setup lang="ts">` module.
  Import `@ghostvue/vue` for headless samples and `@ghostvue/themes` for
  visual ones. Inline decorative icons; do not invent unpublished icon
  components.
- Title, description, and `headless` / `themed` layer live in
  [`examples/registry.ts`](../../examples/registry.ts). Keep that list in
  lockstep with the files.

## Docs

On a component page, render a usage sample with:

```md
<GhostExample id="button/icon-only" />
```

The VitePress `GhostExample` host shows a live preview of the SFC (inside the
docs theme, so light/dark and the flagship switcher apply). The docs markdown
pipeline appends a `<<<` snippet for the same file so Shiki highlights the
source the way ordinary VitePress fences do. Do not paste a second copy into
the markdown.

Keep API tables, CSS snippets, and non-runnable illustrations as fenced
blocks.

## Manifests

Each component manifest's `examples` array lists the ids that belong to
that `Ghost*` contract. `pnpm manifests` fails when a listed id has no
file, when a file is listed on no manifest, or when an id's component
segment does not match the manifest `name`.

## Typecheck, playground, and e2e

`pnpm typecheck` includes the example SFCs through the playground
`vue-tsc` project. The playground serves them at `/examples.html` (gallery)
and `/examples.html?id=<id>` (one example). `pnpm test:e2e` visits every
registered id and runs axe on that page.

Per-example visual regression snapshots live in
[`tests/e2e/examples-visual.spec.ts`](../../tests/e2e/examples-visual.spec.ts),
driven automatically by `examples/registry.ts`. When adding or updating an
example, follow the
[visual regression workflow](../standards/testing.md#visual-regression) to
regenerate Linux baselines with `pnpm test:visual:docker`.
