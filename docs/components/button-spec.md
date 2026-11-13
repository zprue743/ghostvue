# GhostButton specification

**Status:** Approved for issue #1 implementation scope on 2026-08-15.
Rebased onto ADRs 0002–0005 as `GhostButton` / `useGhostButton`, with a themed
wrapper in `@ghostvue/themes`.

## Purpose and user problems

`GhostButton` provides the foundational action primitive for toolbar, retry,
pagination, and row actions. It keeps native browser behavior while standardizing
safe defaults, pending-action behavior, and the public Vue ref contract.

## Non-goals

- Toggle, menu, link, and composite-widget behavior are separate primitives.
  There is no `pressed` model, so `useControllableState` is not used.
- `GhostButton` does not start, cancel, or announce the result of asynchronous work.
- The unstyled component does not generate ids (`useGhostId` is unused; pass `id`
  as a native attribute) and ships no visual styles. Variants, tones, sizes,
  and target-size enforcement belong to the consuming design system or the
  themed wrapper.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostButton` / `useGhostButton`:

| Prop       | Type                              | Default    | Contract                                                                                                          |
| ---------- | --------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `type`     | `'button' \| 'submit' \| 'reset'` | `'button'` | Native button behavior. Submission and reset require explicit opt-in.                                             |
| `disabled` | `boolean`                         | `false`    | Applies native disabled semantics and prevents activation.                                                        |
| `loading`  | `boolean`                         | `false`    | Prevents activation, adds busy/unavailable semantics and `data-state="loading"`, and preserves content and focus. |

Native button attributes, including form, value, accessible-name, and event
attributes, are included in the public type and fall through to the root
`<button>`. Named ESM exports: `GhostButton`, `useGhostButton`, and the types above.

Themed `@ghostvue/themes` `GhostButton` wraps the unstyled component and adds visual
props. Same behavioral props; these exist only on the themed wrapper:

| Prop          | Type                                        | Default    | Contract                                                                                           |
| ------------- | ------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `variant`     | `'solid' \| 'soft' \| 'outline' \| 'ghost'` | `'solid'`  | Visual treatment.                                                                                  |
| `tone`        | `'accent' \| 'neutral' \| 'danger'`         | `'accent'` | Semantic color intent, independent of `variant`.                                                   |
| `size`        | `'sm' \| 'md' \| 'lg'`                      | `'md'`     | Control size.                                                                                      |
| `block`       | `boolean`                                   | `false`    | Stretch to the available inline size.                                                              |
| `iconOnly`    | `boolean`                                   | `false`    | Square icon-button treatment; still needs a name.                                                  |
| `interactive` | `'spotlight'`                               | omitted    | Opt-in pointer spotlight (`data-interactive`). Off by default. Tracks on `data-interactive-state`. |

The themed wrapper sets matching `data-variant`, `data-tone`, `data-size`,
`data-block`, `data-icon-only`, and optional `data-interactive` attributes on
the inner button. Defaults omit the attribute so CSS can treat a missing hook
as the default. It also wraps the
button in `.ghost-themed-scope` (`display: contents`) so default CSS can style
that instance without forcing every `.ghost-button` on the page.

### v-model contracts

There is no model. Pending and disabled state remain consumer-owned props.

### Events, callbacks, slots, and exposed methods

The default slot supplies button content. No component-specific events are
declared; native listeners such as `@click` attach to the button and receive the
native event. Icon and loading-indicator structure is marked with `data-part`,
not extra Vue slots.

A component template ref exposes:

- `element: HTMLButtonElement | null`
- `focus(options?: FocusOptions): void`
- `blur(): void`

The methods are no-ops before mount or after unmount. Consumers should not depend
on any markup beyond the root button (the themed wrapper's extra span is not a
public layout surface).

## State model

The component has enabled, disabled, and loading states. `disabled` and `loading`
may change independently. Loading takes no ownership of async work and ends only
when the consumer sets `loading` to `false`.

### Loading, empty, disabled, read-only, and error states

Disabled sets the native `disabled` attribute and cannot activate or receive
focus. Loading instead sets `aria-disabled="true"`; capture-phase click
cancellation prevents consumer listeners and native form submission while the
button remains focusable. This preserves the user's focus position when an
action becomes pending. When disabled and loading overlap, both contracts remain
visible. Loading does not replace slot content, avoiding an accessible-name
change while an action is pending.

An empty default slot is permitted only when another naming mechanism such as
`aria-label` or `aria-labelledby` gives the button an accessible name. There are
no read-only or error states.

### Async behavior

The component only represents consumer-owned pending state. The consumer owns
races, cancellation, stale results, error handling, and any result announcement.

## Consumer data

No consumer data is accepted or mutated.

## Accessibility contract

### Semantics and relationships

The root is always a native `<button>`. Text content normally provides its name.
Icon-only use requires `aria-label`, `aria-labelledby`, or hidden text (for
example `GhostVisuallyHidden`). Decorative icons must be hidden from assistive
technology. `disabled` uses native semantics. Loading exposes
`aria-disabled="true"` and `aria-busy="true"` while retaining the name and
focusability.

### Keyboard interaction

Enabled buttons use native platform behavior: `Space` and `Enter` activate the
button. Disabled and loading buttons cannot be activated. Loading cancellation
handles the native click generated by keyboard, pointer, and programmatic
activation without reimplementing key behavior.

### Focus behavior

Enabled and loading buttons participate in the document's native tab order and
use consumer-supplied (or themed) focus styling. A button that becomes loading
retains focus. Disabled buttons do not receive sequential focus. The exposed
methods delegate to the native element and do not restore or trap focus.

### Assistive technology expectations

Assistive technology encounters an ordinary named button. Loading is conveyed as
busy and unavailable. The component does not use a live region because the
outcome and suitable announcement text belong to the consuming workflow.

## Rendering and customization

The default slot and fallthrough attributes are the customization API for the
unstyled component. It ships no wrapper or visual styles.

Stable styling hooks follow ADR 0004:

- class `ghost-button`
- `data-part="root"` on the button
- `data-state="loading"` while loading; `data-state="disabled"` while disabled
  and not loading. Loading wins when both props are true because native
  `disabled` already covers unavailability.
- `data-part="icon"` and `data-part="loading-indicator"` on consumer slot markup
  that opts into theme sizing

Consumers may also set `data-variant`, `data-tone`, `data-size`, `data-block`,
and `data-icon-only` on the unstyled button when they style it themselves. The
themed wrapper sets those from visual props.

Recipe CSS applies under `.ghost-theme` or `.ghost-themed-scope`, so a
headless `GhostButton` on the same page stays unstyled when the stylesheet is
loaded. Token values inherit from the nearest `.ghost-theme` /
`[data-ghost-theme]`; `.ghost-themed-scope` is not a token host. There is no
`pt` passthrough object.

## Environment behavior

### SSR and hydration

Rendering is deterministic from props and slot content. The implementation does
not access browser globals during setup. The exposed element is `null` until
mount, so server output and hydration do not depend on it.

### Mobile and touch

Native pointer and touch activation are preserved. Consumers own visual size
unless they use the themed wrapper, which provides minimum control sizes.
Applications remain responsible for adequate targets in their full interface.

## Performance

Rendering and state derivation are constant-time. The component creates no
global listeners, timers, observers, registries, or cleanup obligations.

## Composition

`useGhostButton` owns type/disabled/loading behavior and `data-part` / `data-state`
bindings. Unstyled `GhostButton` spreads those onto a native `<button>`. Themed
`GhostButton` wraps that component. Behavior stays in `packages/vue` because its
component, slot, attribute-fallthrough, and template ref contracts are
Vue-specific. No framework-neutral core abstraction is needed.

The machine-readable contracts are
`packages/vue/manifests/ghost-button.manifest.json` and
`packages/themes/manifests/ghost-button.manifest.json`.

## Test plan

- Vue tests cover defaults, slots, typed fallthrough attributes/listeners,
  disabled and loading activation, loading focus and semantics, icon-only naming,
  exposed refs, SSR, and `data-part` / `data-state`.
- Compile-time tests cover native attribute types on `GhostButtonProps` and the
  exposed ref contract.
- Browser tests cover click and keyboard activation, loading focus and geometry,
  disabled behavior, icon hooks, theme contrast, and an axe smoke check.
- No framework-neutral unit tests: the component owns no core logic.

## Documentation plan

Publish an API reference with ordinary, loading, icon-only, ref, accessibility,
keyboard, and SSR guidance, plus the themed wrapper path. Keep equivalent
examples in the playground. Document default theme tokens separately.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The public
contract comprises the behavioral props, `useGhostButton`, single-root attribute
fallthrough, exposed refs, `ghost-button` / `data-part` / `data-state`, and the
themed visual props plus CSS custom properties.

Future changes to event timing, native semantics, loading behavior, exposed refs,
semantic attributes, or styling hooks require compatibility review.

Themed visual states (GHO-67) are CSS-only. Hover, press, selected, and
dragged overlays use semantic `state.layer.*` tokens. `aria-pressed` and
`aria-grabbed` are native fallthrough hooks, not headless props.

## Open architectural questions

None blocking. Token pipeline, ramps, elevation, motion, density, the
GhostButton reference theme, and flagship `defineTheme` generation have landed
(ADR 0007, ADR 0008, GHO-63–GHO-68).
