# GhostSeparator specification

**Status:** Proposed for GHO-94. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostSeparator` is a visual and semantic divider. It splits groups in menus,
toolbars, and layouts without becoming a control. Sighted users see a line.
Assistive technology encounters a `separator` in document order, or ignores
the line when it is purely decorative.

The immediate consumers are horizontal rules between stacked sections, vertical
rules between toolbar actions, and list-item separators inside menus. Those
are static grouping cues. They are not window splitters, resize handles, or
interactive panes.

## Non-goals

- It is not a focusable window splitter. The APG
  [Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
  widget (`tabindex`, arrow keys, `aria-valuenow`) is a later primitive if one
  is needed. This component never takes sequential focus and never handles
  keys.
- It is not a labeled heading, a collapsible disclosure, a spacer, or a
  border-on-a-container utility. Adjacent layout still belongs to the parent.
- It does not own menu, toolbar, or tablist grouping. Parent widgets compose
  it; they do not inherit behavior from it.
- It ships no content slot. `role="separator"` makes descendants
  presentational, and native `<hr>` cannot have children.
- The unstyled component ships no visual styles. Thickness, color, and
  spacing belong to the consumer or the themed wrapper.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostSeparator` / `useGhostSeparator`:

| Prop          | Type                         | Default                                                      | Contract                                                                                                                   |
| ------------- | ---------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'`                                               | Axis of the line. Horizontal is a block-axis rule; vertical is an inline-axis rule.                                        |
| `decorative`  | `boolean`                    | `false`                                                      | When `true`, the element is removed from the accessibility tree (`role="none"`). When `false`, it is a semantic separator. |
| `as`          | `GhostSeparatorElement`      | `'hr'` when `orientation` is `horizontal`; `'div'` otherwise | Selects the rendered root so the result is valid HTML in its parent.                                                       |

```ts
type GhostSeparatorElement = 'hr' | 'div' | 'li'
type GhostSeparatorOrientation = 'horizontal' | 'vertical'
```

The `as` union is closed rather than `keyof HTMLElementTagNameMap`. `hr` is
the native thematic break; `div` is the generic host for vertical rules and
non-list layouts; `li` is valid inside a list-shaped menu (`role="menu"`).
Do not place `role="separator"` on an `li` inside a raw `<ul>`: that fails
list structure checks.
Widening later is additive; narrowing is not. Interactive, void-other-than-`hr`,
and metadata tags are excluded because they cannot be a separator.

Default `as` follows native-first: a horizontal semantic separator is an
`<hr>`, which already has implicit `role="separator"` and implicit horizontal
orientation. A vertical rule has no native element, so it renders `<div>`.
Passing `as` always wins over that default.

`decorative` defaults to `false` so the native `<hr>` keeps its semantics and
so menu/toolbar grouping is correct without an extra prop. Purely visual
layout lines opt in with `decorative`. That is the safer default for the
stated consumers: a decorative default would silently drop grouping
separators from the accessibility tree.

Named ESM exports: `GhostSeparator`, `useGhostSeparator`, and the types above.
Headless behavior lives in the composable; the SFC is a thin unstyled root
that spreads `rootProps` onto `as`.

Native attributes and event listeners fall through to the single root element.
That fallthrough, not dedicated props, is how consumers attach `id`, `class`,
`data-*`, and `aria-label` when a semantic separator needs an accessible name.
The component owns `role` and `aria-orientation`; do not redeclare them as
props. `useGhostId` is unused: the component does not generate ids.
`useControllableState` is unused: there is no model.

Themed `@ghostvue/themes` `GhostSeparator` wraps the unstyled component. Same
behavioral props; no extra visual props. Importing it loads the default
stylesheet and wraps the instance in `.ghost-themed-scope` so recipe CSS
applies without forcing every `.ghost-separator` on the page.

### v-model contracts

There is no model. Orientation and decorative are consumer-owned props.

### Events, callbacks, slots, and exposed methods

No slots. The root is empty: native `<hr>` is void, and `separator` descendants
would be presentational anyway. No component-specific events; native listeners
attach to the root. No methods are exposed. The root is never interactive, so
there is no `focus()` / `blur()` contract. Consumers that need the element can
attach a template ref through normal Vue fallthrough.

## State model

The component is stateless. `orientation` and `decorative` are configuration.
They may change independently; each render is a pure function of those props
and `as`.

### Loading, empty, disabled, read-only, and error states

None apply. Adding them would invent control semantics a divider does not have.

### Async behavior

The component performs no asynchronous work.

## Consumer data

The component accepts no data props and mutates nothing.

## Accessibility contract

### Semantics and relationships

Follow WAI-ARIA `separator` for a non-focusable divider, the menu/toolbar
grouping notes in the
[Menu and Menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) and
[Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) patterns, and
native HTML when it already expresses that role.

| `decorative` | `orientation` | `as` (resolved) | Role                                                                                | `aria-orientation`                                                      |
| ------------ | ------------- | --------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `false`      | `horizontal`  | `hr`            | Omitted. Native `<hr>` is already `separator` with implicit horizontal orientation. | Omitted.                                                                |
| `false`      | `horizontal`  | `div` or `li`   | `separator`                                                                         | Omitted. ARIA default for `separator` is `horizontal`.                  |
| `false`      | `vertical`    | any             | `separator` (including on `hr`, which would otherwise imply horizontal).            | `vertical`                                                              |
| `true`       | any           | any             | `none`, so the line is not in the accessibility tree.                               | Omitted. A presentational element must not expose separator properties. |

`role="none"` is the ARIA 1.1+ synonym of `presentation` and matches the
issue's decorative contract. The component never sets `aria-hidden`; `role`
already removes the semantics.

A semantic separator may receive an accessible name through fallthrough
(`aria-label` / `aria-labelledby`) when the grouping needs one. Unnamed
separators are valid; assistive technology then announces the role without a
name.

The component never sets `tabindex` and never becomes a window splitter.

### Keyboard interaction

None. The component adds no key handling and is not in sequential tab order.

### Focus behavior

The root is never focusable. The component does not move, trap, or restore
focus.

### Assistive technology expectations

A semantic separator is encountered in document order as a grouping break
between the content on either side. A decorative instance is omitted from the
accessibility tree, so surrounding content reads as contiguous. Automated
checks cannot tell whether a given line _should_ be semantic; that judgment
stays with the consumer and is documented as "when not to use decorative."

## Rendering and customization

Attribute fallthrough and `as` are the customization API. The component renders
exactly one element and no wrappers, so there is no internal structure to
depend on.

Stable styling hooks follow ADR 0004 and the existing `data-*` configuration
used by `GhostButton` (`data-size`, `data-variant`). They are not a new
styling-hooks contract (GHO-38 remains undecided):

- class `ghost-separator`
- `data-part="root"`
- `data-orientation="horizontal"` or `data-orientation="vertical"`

There is no `data-state`. Orientation is configuration, not state. Decorative
is expressed as `role`, which CSS must not rely on for the visible line
because decorative and semantic instances look the same.

Recipe CSS applies under `.ghost-theme` or `.ghost-themed-scope`, so a
headless `GhostSeparator` on the same page stays unstyled when the stylesheet
is loaded. Token values inherit from the nearest `.ghost-theme` /
`[data-ghost-theme]`. There is no `pt` passthrough object.

Themed visual values use existing semantic tokens only:

- `--ghost-border-default` for the line color
- `--ghost-border-hairline-width` for thickness

Horizontal rules span the available inline size; vertical rules stretch on the
block axis (`align-self: stretch` plus `block-size: 100%`) so a toolbar row
gives them height. Native `<hr>` UA margin and border are reset in the recipe
so the token thickness is the only stroke. Forced colors map the line to
`CanvasText`. There are no per-component tokens.

## Environment behavior

### SSR and hydration

Rendering is a pure function of props. Setup reads no browser globals,
registers no lifecycle hooks, and produces identical markup on server and
client.

### Mobile and touch

The separator is not a touch target and needs no target size. Adjacent
controls own their own spacing and size.

## Performance

Rendering is constant-time and allocates one element. The component registers
no listeners, timers, observers, or registries.

## Composition

`useGhostSeparator` owns orientation, decorative semantics, resolved `as`,
and `data-part` / `data-orientation` bindings. `GhostSeparator` spreads those
onto the resolved element. Themed `GhostSeparator` wraps that component.
Behavior stays in `packages/vue` because its component, attribute-fallthrough,
and dynamic-root contracts are Vue-specific. No framework-neutral core
abstraction is needed.

The machine-readable contracts are
`packages/vue/manifests/ghost-separator.manifest.json` and
`packages/themes/manifests/ghost-separator.manifest.json`.

## Test plan

- Vue tests cover defaults (`hr`, horizontal, semantic), vertical `div` with
  `role="separator"` and `aria-orientation="vertical"`, decorative `role="none"`
  with no `aria-orientation`, each `as` member, attribute fallthrough, class /
  `data-part` / `data-orientation` hooks, and deterministic SSR markup.
- Composable tests cover the same role/orientation matrix and the
  orientation-dependent `as` default.
- Browser tests cover a semantic separator resolving by role, a decorative
  instance not exposing that role, a vertical instance exposing
  `aria-orientation="vertical"`, themed horizontal/vertical geometry, and an
  axe scan of pages that use the component.
- No compile-time tests: the public API declares no generic or inference
  contract; `as` is a closed union checked by `vue-tsc` at ordinary call sites.
- No framework-neutral unit tests: the component owns no core logic.
- Visual baselines: registered examples, via the existing examples visual
  suite.

## Documentation plan

Publish `docs/components/separator.md` with an API reference, a minimal
horizontal example, the composable path, vertical toolbar grouping, decorative
layout lines, `as="li"` in a list, themed use, styling hooks, and
accessibility / SSR guidance including when not to mark a line decorative.
Mirror the same examples in the playground gallery.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The
public contract comprises the behavioral props, `useGhostSeparator`,
single-root attribute fallthrough, the `as` union and orientation-dependent
default, `ghost-separator` / `data-part` / `data-orientation`, the role /
`aria-orientation` matrix, and the themed wrapper plus CSS custom properties.

Future changes require compatibility review even when prop names are unchanged:
changing the default `as` or `decorative`, adding a wrapper element, setting
`tabindex`, introducing a slot, or changing the styling hooks.

## Open architectural questions

None blocking.

- **GHO-38 styling hooks.** This component uses the existing `data-part` /
  `data-*` configuration attributes. It does not introduce a parallel hooks
  contract.
- **Window splitter.** Deferred; see Non-goals.
- **Labeled / content separators.** Deferred. A slot would fight native `hr`
  and the presentational-children rule. Consumers who need visible text should
  render a heading or a separate labeled element, not this component.
