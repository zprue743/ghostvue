# GhostSpinner specification

**Status:** Submitted for GHO-72. Spec and implementation ship together for
review; Zac approves both in the same PR.

## Purpose and user problems

`GhostSpinner` is a compact indeterminate loading indicator. It tells the user
that work is in progress when duration and percent-complete are unknown.

The immediate consumer is tabular UI: a table-wide refresh and localized cell or
toolbar feedback while rows reload. The same primitive covers inline pending
state next to a label, overlay placeholders, and any other region that needs a
named status without owning the async work.

## Non-goals

- It does not start, cancel, time, or retry asynchronous work. Mounting and
  unmounting the spinner is the consumer's loading-state orchestration.
- It is not a determinate progress bar. Percent-complete, `aria-valuenow`, and
  remaining-time copy belong to a later `GhostProgress` (GHO-90).
- It does not replace `GhostButton`'s pending contract. Button loading stays
  focusable, named, and `aria-busy` on the button; this primitive does not
  change that API.
- It is not a skeleton, toast, or live-region manager. Those are separate
  primitives (`GhostSkeleton`, `GhostToast`).
- It does not generate ids (`useGhostId` is unused) and has no
  controlled/uncontrolled model (`useControllableState` is unused).
- The unstyled component ships no visual styles. Size and color on the headless
  path are ordinary CSS (`color`, `font-size`, width/height, or consumer
  custom properties). Visual `size` and `tone` props live only on the themed
  wrapper.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostSpinner` / `useGhostSpinner`:

| Prop    | Type     | Default     | Contract                                                                                                                                                                                                  |
| ------- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label` | `string` | `'Loading'` | Status **message** rendered as visually hidden live-region content so page translation tools can see it. `role="status"` is `nameFrom: author`; contents, not `aria-label`, are what polite AT announces. |

The root is always a `<span>`. Native attributes and listeners fall through.
Named ESM exports: `GhostSpinner`, `useGhostSpinner`, and the types above.
Headless behavior lives in the composable; the SFC is a thin unstyled root that
spreads `rootProps` onto the span and composes `GhostVisuallyHidden` for the
label.

`aria-label` / `aria-labelledby` fallthrough may supply an author name (for
example when a table caption already names the pending region). That name is
independent of the live-region message: status announcements come from
contents, so the hidden `label` still renders. Decorative use sets
`aria-hidden="true"` via fallthrough; the status is then removed from the
accessibility tree and the consumer's parent (a named `aria-busy` region) owns
the announcement.

Themed `@ghostvue/themes` `GhostSpinner` wraps the unstyled component and adds
visual props. Same `label`; these exist only on the themed wrapper:

| Prop   | Type                                | Default    | Contract                                                                                        |
| ------ | ----------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `'accent'` | Semantic color intent. The default omits `data-tone` so CSS can treat a missing hook as accent. |
| `size` | `'sm' \| 'md' \| 'lg'`              | `'md'`     | Visual size. The default omits `data-size` so CSS can treat a missing hook as md.               |

The themed wrapper sets matching `data-tone` and `data-size` on the inner
spinner and wraps it in `.ghost-themed-scope` (`display: contents`) so default
CSS can style that instance without forcing every `.ghost-spinner` on the page.

### v-model contracts

There is no model. Presence of the spinner is consumer-owned (`v-if` / `v-show`).

### Events, callbacks, slots, and exposed methods

No component-specific events are declared; native listeners attach to the root
span. There is no default slot: the themed treatment is CSS on the root, and a
custom graphic is the composable escape hatch (spread `rootProps` onto a host
and render decorative content beside the label). Named slots are not used;
styling parts use `data-part`, not Vue slots invented to target CSS.

No methods are exposed. The root is never interactive, so there is no
imperative `focus()` contract. Consumers that need the element can attach a
plain template ref through normal Vue attribute fallthrough.

## State model

The component has one behavioral state: it is a status while mounted. It does
not track busy/idle of its own. Showing or hiding it is entirely the
consumer's `v-if` (or equivalent). There is no `data-state` because a native
presence already covers "this status is current," and inventing `loading` here
would collide with `GhostButton`'s pending hook without adding information.

### Loading, empty, disabled, read-only, and error states

None apply as component states. Loading of the surrounding workflow is the
reason the spinner is mounted; disabled, read-only, and error belong to that
workflow or to other primitives.

An empty `label` produces empty live-region content, so assistive technology
has nothing to announce. Prefer the default or a workflow-specific message.
Leaving a surrounding `aria-busy` region unnamed is a consumer error, not a
distinct empty state of this component.

### Async behavior

The component performs no asynchronous work and owns no races, cancellation,
stale results, or result announcements. Assistive technology hears the status
when the element is inserted or when its live-region contents change. The
consumer owns when that happens (typically mount on request start, unmount on
settle). Keep the spinner mounted across a refresh if the announcement should
not repeat; remount if a new "loading" message is intended.

## Consumer data

The component accepts no data props and mutates nothing. `label` is a string
copy owned by the consumer.

## Accessibility contract

### Semantics and relationships

The root is a native `<span>` with `role="status"`. That is the WAI-ARIA
status live region ([APG live regions](https://www.w3.org/WAI/ARIA/apg/practices/live-regions/)):
implicit `aria-live="polite"` and `aria-atomic="true"`. The component does not
set those ARIA properties explicitly; the role is sufficient and leaving them
to fallthrough means a consumer can tighten or silence the region if the
surrounding workflow already announces.

A native `<progress>` without `value` is an indeterminate progress bar, and
`role="progressbar"` without `aria-valuenow` is the ARIA equivalent. Both are
rejected for this primitive:

- The issue asks for **status** semantics, not a progress bar. Determinate
  values, `aria-valuemin` / `aria-valuemax`, and remaining-time copy are
  `GhostProgress`.
- `<progress>` is a replaced element whose circular-spinner styling is not
  interoperable, which would force either an unstyled native bar or a
  theme-dependent visual that headless consumers cannot restyle with ordinary
  CSS.

`role="status"` takes its accessible name from the author. This primitive does
not set `aria-label`; the visually hidden `label` (`GhostVisuallyHidden`) is
live-region **content**, which is what polite assistive technology announces
and what page-level translation tools that skip attributes can still see.
Decorative icons are not used; the themed indicator is a CSS `::before` on the
root and is not in the accessibility tree.

### Keyboard interaction

The component adds no key handling and is not focusable. It does not intercept
keys. Tab order is unchanged.

### Focus behavior

The root is never itself focusable and never receives a `tabindex`. The
component does not move, trap, or restore focus. A loading workflow that must
preserve focus (a pending button, a refreshing grid) keeps focus on that
control; this spinner does not steal it.

### Assistive technology expectations

Assistive technology encounters a status live region. Polite announcement of
the label occurs when the element is added or when its contents change, without
interrupting the current utterance. The component does not speak completion,
errors, or row counts; those messages belong to the consumer's own live region
or to the control that became busy (`GhostButton` `aria-busy`, a table
`aria-busy`, `GhostVisuallyHidden` as a live region).

Automated checks cannot establish that the label is correct for the workflow
("Loading" vs "Refreshing table") or that the spinner was mounted at the right
time. That judgment requires human review.

## Rendering and customization

The `label` prop, attribute fallthrough, and the composable are the
customization API for the unstyled component. It renders one span and, when it
owns the name, one `GhostVisuallyHidden` child. There is no wrapper to target
on the headless path. The themed wrapper's extra `span.ghost-themed-scope` is
not a public layout surface (`display: contents`).

Stable styling hooks follow ADR 0004. This component does not invent a parallel
styling-hooks contract (GHO-38 remains undecided):

- class `ghost-spinner`
- `data-part="root"` on the status span
- no `data-state` (presence is the state)
- themed visual hooks `data-tone` and `data-size`, omitted at the defaults
- visual values from existing `--ghost-*` tokens (`--ghost-action-spinner-*`,
  `--ghost-action-*-bg`, `--ghost-control-size-*-font`, motion easing)

The themed indicator is a `::before` ring on the root so the hidden label is
not transformed. Under `prefers-reduced-motion: reduce`, rotation is replaced
by an opacity pulse using `--ghost-action-spinner-duration` and
`--ghost-action-spinner-opacity`, matching the `GhostButton` loading indicator
so the two do not flicker at different rates.

Headless size and color without a theme: set `color` (the ring uses
`currentColor` once themed CSS is loaded) and `font-size` or explicit
inline-size. Consumers who never import `@ghostvue/themes` style `.ghost-spinner`
themselves; the unstyled span has no dimensions of its own.

Recipe CSS applies under `.ghost-theme` or `.ghost-themed-scope`, so a
headless `GhostSpinner` on the same page stays unstyled when the stylesheet is
loaded. Token values inherit from the nearest `.ghost-theme` /
`[data-ghost-theme]`. There is no `pt` passthrough object.

## Environment behavior

### SSR and hydration

Rendering is a pure function of props and attributes. Setup reads no browser
globals, registers no lifecycle hooks, and produces identical markup on server
and client. Reduced-motion handling is CSS `@media`; it does not require a
client-only motion query in JavaScript, so hydration cannot disagree with the
server about semantics.

### Mobile and touch

The spinner is not a touch target and adds no gesture handling. Consumers own
layout and whether the indicator sits inside an adequate target (a button, a
toolbar). The themed sizes are compact status marks, not 44px controls.

## Performance

Rendering is constant-time and allocates one or two elements. The component
registers no global listeners, timers, observers, or registries. CSS animation
is the only motion; there is no cleanup obligation.

## Composition

`useGhostSpinner` owns `role="status"`, the label/name decision, and
`data-part` bindings. `GhostSpinner` spreads those onto a span and composes
`GhostVisuallyHidden` for the default name. Themed `GhostSpinner` wraps that
component. Behavior stays in `packages/vue` because its component, attribute
fallthrough, and Vue SFC contracts are Vue-specific. No framework-neutral core
abstraction is needed: being CSS-animatable is not sufficient justification to
promote this to `core`.

The machine-readable contracts are
`packages/vue/manifests/ghost-spinner.manifest.json` and
`packages/themes/manifests/ghost-spinner.manifest.json`.

## Test plan

- Vue tests cover defaults, the hidden "Loading" message, custom `label`,
  `aria-label` / `aria-labelledby` fallthrough that still keeps contents,
  `aria-hidden` fallthrough, class/`data-*` fallthrough, `role="status"`, SSR
  markup, and `data-part="root"`.
- Composable tests cover the default and custom message and status bindings.
- Compile-time tests cover native attribute types on `GhostSpinnerProps`.
- Browser tests cover live-region content from hidden text, a custom label
  (table-refresh copy), themed size/tone hooks, reduced-motion pulse vs
  rotation, and an axe smoke check on registered examples.
- Theme CSS tests forbid hardcoded colors and duration/size literals so the
  recipe stays on `--ghost-*` tokens.
- No framework-neutral unit tests: the component owns no core logic.

## Documentation plan

Publish `docs/components/spinner.md` with an API reference, a minimal headless
example, the composable escape hatch, themed size/tone, a table-refresh
pattern, decorative `aria-hidden` guidance, reduced-motion and SSR notes, and a
link to this spec. Register the same examples in `examples/registry.ts`. Do not
add a playground state matrix; examples plus focused Playwright coverage are
enough for a single-state primitive.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The
public contract comprises `label`, `useGhostSpinner`, single-root attribute
fallthrough, `role="status"`, composition with `GhostVisuallyHidden` for the
default name, class `ghost-spinner` / `data-part="root"`, and the themed
`tone` / `size` props plus CSS custom properties.

Future changes require compatibility review even when prop names are unchanged:
changing the default label, switching from status to progressbar, adding a
wrapper element on the headless path, announcing from a timer, or setting ARIA
the component currently leaves to fallthrough.

`GhostButton` loading visuals stay on the button recipe. Wiring Button to
compose `GhostSpinner` would be a later, explicit change to Button's DOM and is
out of scope here.

## Open architectural questions

None blocking.

- **GHO-38 styling hooks.** This spec uses the existing `data-part` /
  `class` / `--ghost-*` contract from ADR 0004. It does not introduce a new
  hook vocabulary.
- **Button composition.** Deferred. Replacing `GhostButton`'s `::before`
  spinner with this primitive would change Button markup and is not required
  for GHO-72.
