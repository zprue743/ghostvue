# Executable examples

Every runnable component sample lives as a typed Vue SFC under unpublished
`examples/<component>/<example>.vue`. The file is the single source of truth:
docs live previews, the playground gallery, e2e accessibility checks, and
manifest `examples` arrays all point at the same id.

The examples directory is unpublished. Keep it out of
`scripts/workspace-packages.mjs` and library `exports` maps.

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
- Set the title, description, and `headless` or `themed` layer in the
  component's authored `packages/vue/registry/<component>.registry.json`.
  Match the layer to the sample's component import.

## Register and preview an example

Use the existing themed DataTable example as a reference.

1. Add the typed SFC. [`examples/data-table/themed-invoices.vue`](https://github.com/zprue743/ghostvue/blob/master/examples/data-table/themed-invoices.vue)
   imports the component from `@ghostvue/themes`, so its id is
   `data-table/themed-invoices` and its layer is `themed`.
2. Add the id, title, description, and layer to the `examples` array in
   [`packages/vue/registry/data-table.registry.json`](https://github.com/zprue743/ghostvue/blob/master/packages/vue/registry/data-table.registry.json).
3. List the id under `examples` in the manifest for the package whose
   component contract the sample demonstrates. This id belongs to
   [the themed DataTable manifest](https://github.com/zprue743/ghostvue/blob/master/packages/themes/manifests/ghost-data-table.manifest.json).
   Keep manifest example ids with the other authored metadata when regenerating
   source-derived API fields.
4. Run `pnpm registries:write` to regenerate the gitignored
   `examples/.registries/examples-catalog.generated.ts`. Docs and the playground
   read this catalog through [`examples/registry.ts`](https://github.com/zprue743/ghostvue/blob/master/examples/registry.ts).
   Run `pnpm registries` to check the generated output matches the registry
   metadata, and `pnpm manifests` to check manifest validity and example
   ownership, including missing files and unlisted ids.
5. Embed the id on the [DataTable page](../components/data-table.md) using
   the tag below. Start the playground
   with `pnpm --filter @ghostvue/playground dev` and open
   `/examples.html?id=data-table/themed-invoices` on its local URL. Run
   `pnpm docs:dev` and open the DataTable page to try the themed preview and
   copy its SFC. Run `pnpm docs:build` followed by `pnpm docs:links` to check
   links in the built site, and `pnpm verify` before submitting the change.

```md
<GhostExample id="data-table/themed-invoices" />
```

The MCP [`get_examples` tool](../tooling/mcp-server.md#get_examples) reads
the packaged catalog and SFCs. Request
`{"id":"data-table/themed-invoices","layer":"themed"}` for the registered
metadata and raw Vue source. An id or component query includes source by
default, and `includeSource: false` requests metadata alone. A catalog query
without an id or component returns paginated metadata.
See the [asset source loader](https://github.com/zprue743/ghostvue/blob/master/scripts/lib/mcp-asset-sources.js) and
[`get_examples` implementation](https://github.com/zprue743/ghostvue/blob/master/packages/mcp/src/get-examples.ts).

## Docs

On a component page, render a usage sample with:

```md
<GhostExample id="button/icon-only" />
```

The VitePress `GhostExample` host shows a live preview of the SFC (inside the
docs theme, so light/dark and the flagship switcher apply). The docs markdown
pipeline expands the tag so its source slot holds a `<<<` snippet for the same
file; Shiki highlights it the way ordinary VitePress fences do, and the host
renders it in a collapsible **Code** disclosure that never remounts the live
demo. Do not paste a second copy or a sibling `<<<` snippet into the markdown;
`llms-full.txt` gets exactly one `vue` fence per example.

The highlighted snippet reaches the slot as one `v-html` string on its
`language-*` wrapper, not as template markup. Vue never stringifies static
markup inside a component slot, so markup there compiles to one vnode call
per Shiki token; with many large examples that ran the docs build out of
heap. `bindExampleSourceHtml` in
`apps/docs/.vitepress/expand-example-snippets.ts` does this, and local search
still renders the markup so example code stays indexed.

`GhostExample` is a thin id adapter over the docs-only `DemoPreview` frame
(`apps/docs/.vitepress/theme/DemoPreview.vue`, styles in `demo-preview.css`).
The frame renders the title, description, toolbar, optional controls, a
block-layout canvas, and the source disclosure. Headless samples get a
**Headless** badge. The canvas does
not center or resize the demo, so give an example a single root element that
owns its layout (a grid, a row with a gap). Examples with several root elements
fall back to a wrapping row. While a demo chunk loads, or if it fails, the
canvas shows an explained status instead of an empty box.

The [`GhostExample` adapter](https://github.com/zprue743/ghostvue/blob/master/apps/docs/.vitepress/theme/GhostExample.vue)
loads the raw SFC for the toolbar's **Copy** action.
[`DemoPreview`](https://github.com/zprue743/ghostvue/blob/master/apps/docs/.vitepress/theme/DemoPreview.vue) writes that
source with a trailing newline and reports success or failure in a polite
live region. Without a usable clipboard it opens the source and selects it
for a manual copy.

The **Width** disclosure reveals a "Preview width" band with Auto, 320, 480 and
768 presets and a range. It narrows the canvas only, capped at the width the
frame has, and reports the applied size; it is not viewport emulation, so
`@media` queries still see the real window. The demo sits in an inline-size
query container named `ghost-demo`, so an example that should adapt to the
preview width uses `@container ghost-demo (min-width: …)`. The container adds
no layout containment, so inline popovers (`:portal="false"`) still position
against the canvas.

Keep API tables, CSS snippets, and non-runnable illustrations as fenced
blocks.

## Props playgrounds

A few examples opt into a typed props playground: a row of controls above
the canvas that changes chosen props on the live demo. Today these are
`button/action-bar` (size, loading), `button/themed` (size, tone, variant)
and `input/search` (size, disabled, invalid). A playground is an explicit
adapter in `apps/docs/.vitepress/theme/demo-playgrounds.ts`; examples without
one are unchanged.

To add one:

1. Give the example SFC optional props for the values to explore and pass
   each one to the component explicitly. Destructure defaults are what the
   sample renders on its own, so the file stays runnable as written:

   ```ts
   const { size = 'md' } = defineProps<{ size?: GhostButtonSize }>()
   ```

2. Add an adapter for the id, checked with `satisfies`:

   ```ts
   const buttonThemed = {
     component: 'GhostButton',
     controls: [/* ... */],
   } satisfies DemoPlayground<
     DemoPlaygroundProps<typeof ButtonThemedExample, typeof GhostButton>
   >
   ```

   That type only accepts props the SFC declares and the target component
   also accepts, options from the prop's own union, and a default of the
   right type. `pnpm typecheck` checks it with vue-tsc
   (`apps/docs/tsconfig.demo.json`).

3. Repeat the SFC defaults in each control's `default`.
   `tests/integration/docs-demo-playgrounds.test.ts` mounts every adapter's
   example and fails if the defaults differ or a control has no visible
   effect.

Rules the host keeps:

- Only string-union props (a select) and booleans (a checkbox) are offered.
  Objects, functions and numbers are left out because the copied binding
  could not express them as plain attributes.
- Values reach the demo as declared props, never through attribute
  fallthrough, so a control cannot claim an effect the example ignores.
- The **Code** disclosure still shows the original SFC and is labelled
  "Original source". The "Overrides" line lists only values that differ
  from the SFC defaults.
- **Copy props** copies a template binding of every controlled prop, for
  example `<GhostButton size="lg" tone="danger" variant="outline" />`.
  Static string attributes typecheck against the prop union in the
  consumer's template; `false` booleans are left out.
- **Reset** clears the overrides. The demo re-renders on its declared
  defaults without remounting, and the source and width settings stay.

## Showcase authoring standards

These constraints apply to every example the docs frame renders:

- **Layout.** Give the example one root element that owns its layout (a
  grid of fields, a row with a token gap). The canvas is block layout: it
  does not center, stretch, or shrink-wrap the demo. Several roots fall
  back to a wrapping row. To adapt to the preview width, use
  `@container ghost-demo (...)`, not `@media`. The playground
  `/examples.html` canvas is the same named container.
- **Surfaces.** The canvas uses `--ghost-surface-subtle-bg` inside a frame
  on elevation 1. Do not paint a page or card background on the example
  root; let themed components bring their own surfaces. Use semantic tokens
  only, so light, dark and every flagship work.
- **Typography.** The frame and its controls reset `.vp-doc` paragraph,
  code and form styles on their own parts. Examples are not shielded the
  same way: native text (`<p>`, `<label>`) picks up docs prose styles, so
  keep it short and do not rely on margins from the docs page.
- **Focus.** The stage leaves room for the largest focus ring. Do not put
  `overflow: hidden` on an example root, and draw custom rings with
  `outline` so focus and hover never change layout.
- **Source.** The source shown and copied is the file on disk. Keep it
  readable as real usage: no docs-only wrappers, and only add playground
  props an app could plausibly pass.
- **Portals.** Overlays portal to `<body>` by default and are fine. For an
  inline overlay (`:portal="false"`), rely on `.ghost-example__preview` as
  the containing block. Do not add `position`, `transform`, `filter` or
  `contain` to example roots that hold inline overlays, or the stage's
  scroll box will clip them.
- **Headless overlay surfaces.** The headless layer positions overlay content
  but paints nothing: no background, border, stacking order or item states.
  A headless example whose content opens over the page (select, combobox,
  menus, popover, hover card, tooltip) must bring its own consumer CSS, or the
  panel renders transparent, under the example frame, on top of the docs
  prose. Put a prefixed class on the content part and style it in an
  unscoped `<style>` block, because portaled and inline content roots do not
  carry the example's scoped attribute. Give the panel an opaque background,
  a border, a `z-index`, and visible highlighted, selected and disabled item
  states. Read semantic tokens with system-color fallbacks
  (`var(--ghost-elevation-3-bg, Canvas)`) so the copied source also works
  without a theme, and repaint the highlight with `Highlight` under
  `forced-colors`. `tests/e2e/docs-headless-overlays.spec.ts` checks each one.
  The headless date picker examples follow the same rule for their calendar
  surface and month grid. They share one `date-picker-demo__*` block, kept
  identical by `tests/integration/date-picker-examples-styles.test.ts` and
  checked in the docs by `tests/e2e/docs-date-picker-examples.spec.ts`.
- **Headless calendars.** The inline headless calendar examples are not
  overlays, but an unstyled month grid reads as broken, so they follow the
  same rule. Headless `GhostCalendar` renders no element of its own: wrap it
  in a `calendar-demo` element and style the parts beneath it through their
  `data-part`, `data-state`, `data-today` and `data-outside-month` hooks, in
  an unscoped `<style>` block (the grid's rows and cells sit inside
  `GhostCalendarGrid`, out of reach of the example's scoped attribute). Reset
  the `<h2>` heading fully, because it picks up docs prose styles. Every
  headless calendar example carries the same block, kept identical by
  `tests/integration/calendar-examples-styles.test.ts`.

### Review a showcase

Review the built docs, a clean playground preview of the same SFC, and the
copied source together. The preview and source should teach the same
composition. Themed examples use the shipped recipes and semantic tokens.
Headless examples own their consumer CSS and remain usable without a theme.

| Criterion      | What to check                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hierarchy      | The heading, main control, and next action are easy to find.                                                                                              |
| Spacing        | Related controls are grouped. Hover and focus keep their geometry, and focus outlines have room to paint.                                                 |
| Typography     | Labels and values are legible and intentional in both hosts. Any VitePress reset correction is scoped to the affected example part.                       |
| Surfaces       | Text, controls, and overlays stay readable in light, dark, and applicable forced colors. Portals inherit the intended theme.                              |
| Responsiveness | Narrow layouts, zoom, and a resized preview preserve labels and controls. Any necessary scrolling stays inside an accessible region.                      |
| Feedback       | Keyboard and pointer use reveal focus, selection, progress, errors, and results where applicable. Escape and focus return follow the documented contract. |
| Realism        | Sample data, defaults, controls, and source show a plausible use of the component.                                                                        |

For the core catalogue review, every applicable criterion needs a score of
**2**. Record the evidence for each score and explain any criterion marked
inapplicable. A high-severity defect requires resolution and fresh evidence
before sign-off. Record each remaining defect with its owner and agreed
disposition. Follow the [visual review evidence checklist](../standards/testing.md#visual-review-evidence)
when submitting a change for review.

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

## Generated component references

`pnpm docs:build` and `pnpm docs:dev` run
`scripts/write-component-references.mjs` first. It renders every Vue and theme
manifest into `docs/reference/`, including compound parts. That directory is
gitignored and replaced on each run so removed components cannot leave stale
pages. Edit source/manifests and keep behavioral prose on the hand-written
component page; link to the [generated references](/reference/) for API tables.
The generated pages render the registered examples and link to their SFC source.
Only hooks recorded by the manifest schema (`data-part`, `data-state`, public
CSS properties) are listed; native fallthrough attributes are not inferred.
