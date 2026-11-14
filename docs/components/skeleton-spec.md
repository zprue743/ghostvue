# GhostSkeleton specification

**Status:** Proposed for [GHO-73](https://linear.app/ghost-vue/issue/GHO-73)
implementation in the same pull request. Zac reviews the spec and the
implementation together.

## Purpose and user problems

`GhostSkeleton` is a non-interactive loading placeholder. It occupies the
approximate space of content that has not arrived yet so layout does not
collapse, while remaining silent to assistive technology.

The immediate consumer is tabular UI: loading rows, cells, and toolbar slots
on the way to DataTable. The same primitive covers cards, avatars, and text
lines wherever the resulting shape is known and a decorative placeholder is
enough.

It is not a status message. Loading that assistive technology must hear is a
separate live region or visible status text owned by the consumer.

## Non-goals

- It is not a progress indicator, spinner, or busy button. Control-level
  pending state stays on `GhostButton` `loading`. Indeterminate waits whose
  layout is unknown belong to `GhostSpinner` ([GHO-72](https://linear.app/ghost-vue/issue/GHO-72)).
- It does not orchestrate loading, retries, empty, or error states. The
  consumer decides when the placeholder is mounted.
- It does not announce, count bones, or own a live region. Repeating "loading"
  for every cell is the noisy output this primitive exists to avoid.
- It is not a layout generator. There is no `count`, `lines`, or group
  component; compose several instances in the consumer's markup.
- It is not interactive. There is no click-to-retry, focus, or keyboard
  contract.
- It does not invent a new styling-hooks vocabulary. GHO-38 remains
  undecided; this component uses the existing `data-part` / `data-*` visual
  attribute pattern from ADR 0004 and GhostButton (`data-variant`,
  `data-size`).
- It ships no visual styles on the unstyled primitive. Shimmer, radius, and
  default sizes belong to the themed wrapper.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostSkeleton` / `useGhostSkeleton`:

| Prop | Type                      | Default  | Contract                                                                                          |
| ---- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `as` | `GhostSkeletonElement`    | `'span'` | Selects the rendered root so the result is valid HTML in its parent. Never an interactive element. |

```ts
type GhostSkeletonElement = 'span' | 'div' | 'p' | 'li' | 'td' | 'th'
```

The union is closed rather than `keyof HTMLElementTagNameMap`. It admits the
elements whose parent contexts actually occur — phrasing content, flow content,
list items, and table cells — and excludes interactive, void, and metadata
elements, which would either become tab stops inside an `aria-hidden` tree or
cannot hold a box. Widening the union later is additive; narrowing it is not.

Named ESM exports: `GhostSkeleton`, `useGhostSkeleton`, and the types above.
Headless behavior lives in the composable; the SFC is a thin unstyled root that
spreads `rootProps` onto `as`.

Native attributes and event listeners fall through to the single root. That
fallthrough, not dedicated props, is how consumers set `id`, `class`, `style`,
`data-shape`, and any other hook. `useGhostId` is unused: the component does
not generate ids. There is no model, so `useControllableState` is unused.

The composable accepts no options. Every instance is decorative; there is
nothing for the consumer to configure in behavior.

Themed `@ghostvue/themes` `GhostSkeleton` wraps the unstyled component and
adds visual props. Same `as` contract; these exist only on the themed wrapper:

| Prop    | Type                             | Default  | Contract                                                                                          |
| ------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `shape` | `'text' \| 'rect' \| 'circle'`   | `'text'` | Visual treatment via `data-shape`. The default omits the attribute so CSS can treat missing as text. |

Dimensions are not props. Consumers set `inline-size` / `block-size` (or
`width` / `height`) through native `style` and `class` fallthrough. That is
the flexible-dimension contract: any CSS length, percentage, or token, without
a parallel size API.

The themed wrapper wraps the unstyled root in `.ghost-themed-scope`
(`display: contents`) so default CSS can style that instance without forcing
every `.ghost-skeleton` on the page. Token values inherit from the nearest
`.ghost-theme` / `[data-ghost-theme]`.

### v-model contracts

There is no model. Presence of the placeholder is consumer-owned (`v-if` /
`v-show` around the instance or around the loaded content).

### Events, callbacks, slots, and exposed methods

The default slot is optional and should stay empty. Slot content is still
hidden from assistive technology because the root is `aria-hidden` and
`inert`. Putting interactive descendants in the slot is a consumer error: they
cannot be reached by keyboard or AT, and they are not a substitute for the
loaded control.

No component-specific events are declared. Native listeners that fall through
never fire in practice because `inert` suppresses interaction.

No methods are exposed. The root is never interactive, so there is no
imperative `focus()` contract. Consumers that need the element can attach a
plain template ref through Vue's component-ref `el` on a native host, or wrap
the instance.

## State model

The component has one state: placeholder. It does not transition. Mounting
and unmounting are the only way it appears or disappears.

There is no `data-state`. A state hook that never changes would not help
consumers distinguish anything, and would collide with the loading/`disabled`
vocabulary already used by `GhostButton`. Shape is a visual value
(`data-shape`), not a state.

### Loading, empty, disabled, read-only, and error states

The skeleton *is* the loading representation of something else. It does not
have its own loading, disabled, read-only, or error semantics, and adding them
would duplicate state the surrounding UI already owns.

An empty default slot is the ordinary case. It is not an error.

### Async behavior

The component performs no asynchronous work and owns no races, cancellation,
or announcements. The consumer owns when it is shown and what status text, if
any, is announced.

## Consumer data

The component accepts no data props and mutates nothing. Slot content, when
present, is rendered by the consumer's template and is never inspected.

## Accessibility contract

There is no WAI-ARIA APG widget pattern named Skeleton. The closest practice is
[Hiding Semantics with the `presentation` Role](https://www.w3.org/WAI/ARIA/apg/practices/hiding-semantics/).
That page is cited because it is the APG's hiding guidance, but this component
does **not** set `role="presentation"` / `role="none"`: those roles still
expose descendant text, which is the noisy output we are avoiding. The same
page notes that `aria-hidden="true"` actually removes text from assistive
technology; that is the attribute this primitive sets.

Loading announcements are not this component's job. HTML `role="status"` /
`<output>`, or a `GhostVisuallyHidden` live region, belong on the consumer's
region so a table of twenty bones does not speak twenty times. There is no
APG live-region practice page to cite; WCAG 4.1.3 is the requirement.

### Semantics and relationships

The root is one of the elements in `GhostSkeletonElement` and defaults to
`<span>`. The component adds no `role`. It always sets:

- `aria-hidden="true"` so the placeholder is absent from the accessibility
  tree and does not produce per-cell "empty" or "graphic" noise.
- `inert` so the subtree cannot receive focus or pointer activation. Native
  `inert` is preferred over a `tabindex` or key-handler maze; `aria-hidden`
  alone would still allow a focusable descendant to become a tab stop
  (axe `aria-hidden-focus`).

The two attributes are complementary, not redundant: `aria-hidden` is the AT
hiding contract, `inert` is the native interactivity contract. `role="presentation"`
is rejected because it would still expose slot text. Consumers cannot usefully
override `aria-hidden` or `inert`; `rootProps` win on those names.

The component never sets `aria-busy`, `aria-live`, `role="status"`, or
`role="progressbar"`. Those belong on the region whose content is being
replaced, or on a single status text node, so a table of twenty skeleton cells
does not speak twenty times.

### Keyboard interaction

The component adds no key handling and is not a tab stop. `Tab` moves past it.
`inert` is what guarantees that; there is no `tabindex`.

### Focus behavior

The root is never focusable and never receives a `tabindex`. The component
does not move, trap, or restore focus. Replacing a focused control with a
skeleton is a consumer responsibility (usually keep the control mounted and
use `GhostButton` `loading` instead).

### Assistive technology expectations

Assistive technology does not encounter the skeleton. Loading meaning is
conveyed only if the consumer provides it:

1. Put `aria-busy="true"` on the region being replaced (a table, a toolbar, a
   card) for the duration of the load.
2. Keep one live region or visible status text ("Loading invoices") that
   updates when the load starts and when it finishes.
3. Remove the skeletons and `aria-busy` together when the real content
   arrives.

Automated checks can prove the skeleton is hidden and inert. They cannot prove
the surrounding status text is correct or sufficient. That requires human
review.

### When Spinner, Skeleton, or status text is appropriate

| Pattern        | Use when                                                                                          | Do not use when                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Skeleton       | The resulting layout is known and should stay stable. Decorative. Always pair with status/busy.   | The wait has no predictable shape, or the wait *is* the message.                |
| Spinner        | A single control or unknown-shape region is pending (`GhostButton` `loading`, later `GhostSpinner`). | Many spinners in a table; they are visually noisy and still need a status text. |
| Status text    | Assistive technology (and often sighted users) must hear or read that loading is happening.       | As the only treatment when layout collapse would be disorienting.               |

Color and motion on the skeleton are not a text alternative. WCAG 4.1.3
(Status Messages) is satisfied by the consumer's status text, not by this
component.

## Rendering and customization

The default slot and attribute fallthrough are the customization API for the
unstyled component. It renders exactly one element and no wrappers.

Stable styling hooks follow ADR 0004 and GhostButton's visual attributes:

- class `ghost-skeleton`
- `data-part="root"`
- `data-shape="rect"` or `data-shape="circle"` when the themed `shape` prop
  (or a consumer attribute on the unstyled root) is not the default text
  treatment. Missing `data-shape` is text.

There is no `data-state`, no `pt` object, and no public `data-ghost-*`
attribute on the component. Theme hosts already use `data-ghost-theme` /
`data-ghost-mode` / `data-ghost-density` on ancestors.

Themed CSS applies under `.ghost-theme` or `.ghost-themed-scope`. Visual
values come only from semantic `--ghost-*` tokens:

- fill `--ghost-surface-muted-bg`
- shimmer highlight `--ghost-surface-subtle-bg`
- text radius `--ghost-radius-sm`; rect `--ghost-radius-md`; circle `50%`
  (geometry, not a token — a circle must stay a circle at every roundness)
- default text block size `--ghost-type-size-md`; default circle size
  `--ghost-control-size-md-min`; default inline size `100%` for text/rect
- shimmer period `--ghost-motion-duration-expressive`

No new tokens. Private `--_ghost-*` wiring is unpublished.

Recipe CSS must not force `display: block` on `td` / `th`, which would break
table layout when `as="td"`.

## Environment behavior

### SSR and hydration

Rendering is a pure function of props and (usually empty) slot content. Setup
reads no browser globals, registers no lifecycle hooks, and produces identical
markup on server and client, including `aria-hidden` and `inert`. Shimmer is
CSS; it does not run during SSR and does not affect hydration.

### Mobile and touch

The placeholder is not a touch target. `inert` and `pointer-events: none` in
the theme keep it from intercepting taps. Applications remain responsible for
not replacing a focused control with a skeleton on small screens.

### Reduced motion and forced colors

`prefers-reduced-motion: reduce` disables the shimmer animation and leaves the
static muted fill. WCAG 2.2.2 (Pause, Stop, Hide) and 2.3.3 (Animation from
Interactions) are why the animation is CSS and why it must stop; a JS timer
would be the wrong mechanism.

`forced-colors: active` maps the fill to `Canvas`, strokes `CanvasText`, and
drops the shimmer overlay so system colors remain the only paint.

Playwright visual baselines emulate reduced motion and disable CSS animations
so the shimmer cannot flake snapshots.

## Performance

Rendering is constant-time and allocates one element. The composable
registers no listeners, timers, observers, or registries. Shimmer is a CSS
animation on `::after`, so there is no frame loop and no cleanup obligation.

Composing many cells (a DataTable loading state) is N instances, not one
component with a `count` prop. That keeps the public API small and lets the
consumer virtualize later without a skeleton-specific contract.

## Composition

`useGhostSkeleton` owns `aria-hidden`, `inert`, and `data-part` bindings.
Unstyled `GhostSkeleton` spreads those onto `as`. Themed `GhostSkeleton`
wraps that component and sets `data-shape`. Behavior stays in `packages/vue`
because its slot, attribute-fallthrough, and dynamic-root contracts are
Vue-specific. Per `docs/agents/ARCHITECTURE_RULES.md`, nothing is promoted to
`core`: no non-Vue consumer exists.

`GhostVisuallyHidden` is the complementary primitive for the status text that
the skeleton itself must not speak.

The machine-readable contracts are
`packages/vue/manifests/ghost-skeleton.manifest.json` and
`packages/themes/manifests/ghost-skeleton.manifest.json`.

## Test plan

jsdom applies no CSS layout and computes no accessible names, so unit tests
assert attributes and SSR markup; perception, motion, and table geometry live
in a real browser.

### Required Vue component tests

Vitest with Vue Test Utils, mapped to WCAG 2.1 success criteria:

| Criterion                          | Assertion                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1.3.1 Info and Relationships (A)   | `aria-hidden="true"`; no `role`; slot content is not exposed as a name                            |
| 2.1.1 Keyboard (A)                 | `inert` is set; the root has no `tabindex`                                                        |
| 2.2.2 Pause, Stop, Hide (A)        | themed CSS contains `prefers-reduced-motion` that disables the shimmer animation                  |
| 4.1.2 Name, Role, Value (A)        | adds no `role`; `as` members render that tag as the sole root                                     |
| 4.1.3 Status Messages (AA)         | does not set `aria-live`, `aria-busy`, or `role="status"` / `progressbar`                         |

Behavior tests beyond the criteria: each `as` member renders that tag;
`renderToString` emits deterministic hidden markup; `class`, `style`, and
`data-shape` fall through; `aria-hidden` / `inert` from `rootProps` win over
consumer attrs; empty slot is permitted; unmounting removes the node.

### Required browser tests

Playwright against the built playground and registered examples:

| Criterion                     | Assertion                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| 1.3.1 / 4.1.2                 | an axe scan of pages using the component reports zero violations                                   |
| 4.1.3 Status Messages (AA)    | skeletons are not returned by role queries; a sibling status node can still announce               |
| 2.2.2 Pause, Stop, Hide (A)   | under `prefers-reduced-motion: reduce`, computed `animation-name` on `::after` is `none`           |
| 1.3.1 table geometry          | `as="td"` remains a table cell in a loading-row fixture                                            |

Visual baselines of registered examples run with reduced motion and Playwright
`animations: 'disabled'`.

### Required framework-neutral unit tests

None. The component owns no framework-neutral logic.

### Required compile-time tests

None. The public API declares no generic or inference contract; `as` and
`shape` are closed unions checked by `vue-tsc` at ordinary call sites.

### Required regression fixtures

None at introduction. Fixes add their own.

### Not automatable

Whether the surrounding status text is correct; whether a skeleton is the
right loading representation versus a spinner or nothing; announcement order
across NVDA, JAWS, and VoiceOver. Per `docs/standards/accessibility.md`, axe
is a baseline and not evidence of an accessible loading experience.

## Documentation plan

Publish `docs/components/skeleton.md` with an API reference, a minimal
example, the composable path, themed shapes, a table loading-row pattern, an
explicit "when to use Skeleton, Spinner, or status text" section, styling
hooks, reduced-motion / forced-colors / SSR guidance, and a link to this spec.
Mirror the examples in `examples/skeleton/` and the playground so browser
tests exercise them.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The
public contract comprises `as` and its default, `useGhostSkeleton`, single-root
attribute fallthrough, always-on `aria-hidden` / `inert`, class
`ghost-skeleton`, `data-part="root"`, themed `shape` / `data-shape`, and the
themed CSS custom properties listed above.

Future changes require compatibility review even when prop names are
unchanged: dropping `aria-hidden` or `inert`, adding a live region, changing
the default root element, narrowing the `as` union, adding a wrapper element,
or renaming `data-shape`.

## Open architectural questions

None blocking.

- **GHO-38 styling hooks.** Undecided at the library level. This spec reuses
  `data-part` and visual `data-shape` rather than proposing a new contract.
- **`GhostSpinner` ([GHO-72](https://linear.app/ghost-vue/issue/GHO-72)).**
  A sibling primitive. Documentation refers to it by name; this component
  does not import it.
