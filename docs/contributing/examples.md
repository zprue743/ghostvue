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
The frame renders the title, layer badge, description, toolbar, optional
controls, a block-layout canvas, and the source disclosure. The canvas does
not center or resize the demo, so give an example a single root element that
owns its layout (a grid, a row with a gap). Examples with several root elements
fall back to a wrapping row. While a demo chunk loads, or if it fails, the
canvas shows an explained status instead of an empty box.

The toolbar's **Copy** action copies the original SFC (not the highlighted
markup) and reports success or failure in a polite live region. Without a
usable clipboard it opens the source and selects it for a manual copy. The
**Width** disclosure reveals a "Preview width" band with Auto, 320, 480 and
768 presets and a range. It narrows the canvas only, capped at the width the
frame has, and reports the applied size; it is not viewport emulation, so
`@media` queries still see the real window. The demo sits in an inline-size
query container named `ghost-demo`, so an example that should adapt to the
preview width uses `@container ghost-demo (min-width: …)`. The container adds
no layout containment, so inline popovers (`:portal="false"`) still position
against the canvas.

Keep API tables, CSS snippets, and non-runnable illustrations as fenced
blocks.

## Choose a guide's examples

A component guide has an ordinary reading path: the first preview and the
workflow sections most readers follow before they reach the API. These rules
decide which examples sit on that path. They govern editorial order and
selection. The [showcase standards](#showcase-authoring-standards) still govern
how each preview looks.

### Pick the page's track

Check whether `@ghostvue/themes` ships a recipe for the component: a
`packages/themes/src/ghost-<name>.ts` wrapper exported from
`@ghostvue/themes`, with a manifest under `packages/themes/manifests/`. An
example's layer is the `layer` recorded for its id in
`packages/vue/registry/<name>.registry.json`, which `pnpm registries:write`
copies into `examples/registry.ts`.

- **Recipe pages** follow the themed-first standard below. Most components with
  a published surface are recipe pages, including `GhostDataTable` and
  `GhostDatePicker`.
- **Headless-only pages** cover utilities that `@ghostvue/themes` deliberately
  does not export, such as `GhostVisuallyHidden` and `GhostPortal`. There is
  nothing to theme, so they follow the
  [headless-only rules](#headless-only-utilities).

### Themed-first standard for recipe pages

- **First preview.** The first example on the page is `themed` and shows a
  task a reader would recognize, such as reviewing invoices or booking trip
  dates. Do not open with a headless example or a bare "Basic" control with no
  context, and do not hold the themed example back until after the headless
  ones.
- **Ordinary workflows.** Sections for things most apps need, such as
  selection, ranges, controlled state, validation and forms, pagination, server
  data, locale and placement inside a dialog, use `themed` examples. A reader
  following the page from the top should never need consumer CSS to get a
  usable result.
- **Advanced section.** Headless composition, custom styling, `data-part` CSS,
  and composables go in one clearly signposted section after the ordinary
  workflows and before the API, or behind a link to the generated reference.
  Start its heading with "Advanced:" (for example "Advanced: headless
  composition") and open it with one sentence that says who needs it, such as
  teams that bring their own design system. Move consumer stylesheet guidance,
  such as a shared `*-demo__*` class block, into this section with the headless
  examples it styles.
- **Prose.** Name the themed import (`@ghostvue/themes`) in the intro and in the
  first preview's prose. Introduce `@ghostvue/vue` in the advanced section, and
  link to that section from the intro.

When an ordinary workflow has only a headless example today, add a `themed`
counterpart or move the headless one into the advanced section. Do not leave it
on the reading path.

### Headless-only utilities

A headless-only page has no themed layer to put first, so its examples stay
`headless`. Apply the same editorial order anyway:

- The first preview shows a realistic task, not the bare component. For
  `GhostVisuallyHidden`, that is an icon-only action bar with a status message,
  not one hidden word.
- One section per distinct task or contract, such as naming icon-only
  controls, `as` for table headers, `focusable` for skip links, and keeping a
  live region mounted.
- Composable or bring-your-own-element use still goes in an "Advanced:"
  section or behind a reference link.
- Keep surrounding controls minimal and use semantic tokens with system-color
  fallbacks, so the copied source works without a theme. Do not add a themed
  wrapper just to satisfy the themed-first standard; a recipe needs its own
  approved spec.

### Promote, combine, or link

Every manifest-listed example stays in the registry and on the component's
generated [reference page](/reference/), which renders it and links to its
source. The guide decides only which ones appear on the page.

- **Promote** an example to its own section when it shows a distinct user task
  or a contract that ordinary consumers hit, and the behavior is easier to
  understand by using it than by reading about it. On a recipe page, the
  promoted example must be `themed`.
- **Combine** examples that differ only in layer, or in one or two prop values.
  Keep the themed one on a recipe page. Show the variation with a
  [props playground](#props-playgrounds) or a sentence of prose, not a second
  preview of the same task.
- **Link** to the reference page instead of rendering an example when it is a
  headless twin of a themed example, a regression or edge-case fixture, or a
  variant whose only difference is covered in prose (for example a keyboard
  direction difference described in the accessibility section).

Removing an example from a guide does not remove it from its manifest. Delete
the file only when no manifest, test, or reference still needs it.

### Example: DataTable outline

`GhostDataTable` ships a themed recipe, so its guide is a recipe page. The
outline below shows the target order. Ids marked "to add" do not exist yet.

```text
# GhostDataTable
  Intro: the table owns interaction state and markup; you own data and
  fetching. Import from @ghostvue/themes; link to the advanced section.

## Review invoices                     data-table/themed-invoices   themed
  First preview: themed root and preset with search, selection, bulk
  actions and a paginated footer. Prose covers size, variant and
  sticky-header.

## Paginate long lists                 data-table/themed-invoices   themed
  Combine: the first preview already pages through #footer, so this
  section explains it in prose instead of a second preview.
## Load rows from a server             themed server example        themed, to add
  Ordinary workflow. The headless paginated-invoices and
  server-invoices-router examples move to the advanced section or a
  reference link until a themed server example exists.

## Behavior                            prose
## Accessibility                       prose and keyboard table

## Advanced: headless composition      for teams writing their own CSS
### Renderer child                     data-table/basic-invoices    headless
### Preset                             data-table/preset-invoices   headless
  Combine with the themed first preview, or link to the reference page:
  it shows the same task without a theme.
### Full composition                   data-table/full-invoices     headless
### Styling hooks                      data-part and data-* attributes

## API                                 generated tables, link to /reference/
```

### Counterexample: a headless-only recipe page

This order looks complete but fails the standard, because a recipe ships but a
reader meets it late:

```text
# GhostDataTable
## Basic                       data-table/basic-invoices      headless  ✗ first preview is headless
### Preset                     data-table/preset-invoices     headless  ✗ ordinary task without the recipe
## Themed preset               data-table/themed-invoices     themed    ✗ recipe appears third
## Full composition            data-table/full-invoices       headless  ✗ composition on the reading path
## Pagination                  data-table/paginated-invoices  headless  ✗ ordinary workflow, headless
## Server data                 data-table/server-invoices-…   headless  ✗ ordinary workflow, headless
## Styling                     data-part hooks                          ✗ no "Advanced:" signpost
```

A reader who copies the first preview gets an unstyled table, and the themed
import is easy to miss. Reorder it as in the outline above.

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
