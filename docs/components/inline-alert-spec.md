# GhostInlineAlert specification

**Status:** Proposed for [GHO-76](https://linear.app/ghost-vue/issue/GHO-76)
implementation scope. Approval is PR review of this spec together with the
implementation.

## Purpose and user problems

`GhostInlineAlert` is inline contextual feedback for errors, warnings, and
recoverable failures near the content they describe. Immediate DataTable uses
include row-load failures, mutation failures, and retryable table errors shown
above or inside a table region. Sighted users see a compact title, message, and
optional action controls. Assistive technology reads the same copy in document
order, with `role="status"` or `role="alert"` only when the consumer opts in for
content that appears or updates after mount.

## Non-goals

- Global notification management, toasts, snackbars, or stacked notification
  lists. Use a future `GhostToast` / provider for transient global feedback.
- Dismissible chrome, auto-timeout, or swipe-to-dismiss. Consumers own removal
  with `v-if` and their own close buttons if needed.
- Fixed severity or status enums (`variant="error"`, `type="warning"`). Headless
  styling hooks and themed `tone` express color intent; meaning lives in slot
  copy.
- Replacing `GhostFieldError` inside `GhostField`. Field validation errors stay
  on the field primitive.
- `useControllableState` — there is no model.
- A parallel styling-hooks vocabulary beyond ADR 0004 (`data-part`, class,
  omitted-default `data-*` visual hooks).

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostInlineAlert` / `useGhostInlineAlert`:

| Prop           | Type                           | Default | Contract                                                                                                                                                                                                                                                     |
| -------------- | ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `announce`     | `'off' \| 'status' \| 'alert'` | `'off'` | Live-region semantics. `off` is static feedback with no `role`. `status` sets `role="status"` (polite). `alert` sets `role="alert"` (assertive). Use `status`/`alert` only for copy that appears or changes after mount, not for always-present page chrome. |
| `headingLevel` | `1 \| 2 \| 3 \| 4 \| 5 \| 6`   | `3`     | Level of the native heading wrapping the `#title` slot. Omitted `#title` skips the heading.                                                                                                                                                                  |
| `as`           | `GhostInlineAlertElement`      | `'div'` | Root element. Prefer `div` inside table cells; use `section` when the alert is a named landmark.                                                                                                                                                             |

```ts
type GhostInlineAlertElement = 'div' | 'section'
type GhostInlineAlertHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
type GhostInlineAlertAnnounce = 'off' | 'status' | 'alert'
```

Named ESM exports: `GhostInlineAlert`, `useGhostInlineAlert`, and the types
above. Headless behavior lives in the composable; the SFC renders the root,
named slots, and part wrappers.

Native attributes and event listeners fall through to the root.
`useGhostId('ghost-inline-alert-title')` supplies the title heading `id` when the
`#title` slot is rendered. When `#title` is present, `as` is `section`, and
`announce` is `off`, the root receives `aria-labelledby` pointing at that id.
Default `div` roots never get `aria-labelledby` (generic `div` has no nameable
role). When `announce` is `status` or `alert`, the root receives the matching
`role` and does not also use `aria-labelledby` on the same node.

### v-model contracts

There is no model. Visibility, copy, and live semantics are consumer-owned.

### Events, callbacks, slots, and exposed methods

| Slot      | Part element | Contract                                                                                   |
| --------- | ------------ | ------------------------------------------------------------------------------------------ |
| `title`   | `title`      | Optional short heading. Rendered as `h{headingLevel}` with generated `id`.                 |
| `message` | `message`    | Primary supporting copy. Rendered in a `<div>` so paragraphs and lists are valid.          |
| `actions` | `actions`    | Optional action controls (e.g. `GhostButton`). Children remain focusable; the root is not. |

No default slot. No component-specific events. Template ref exposes:

- `element: HTMLElement | null` — the root host after mount.

### Themed `@ghostvue/themes` `GhostInlineAlert`

Wraps the unstyled component. Behavioral props pass through. Visual props:

| Prop      | Type                                        | Default     | Contract                                                            |
| --------- | ------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `variant` | `'solid' \| 'soft' \| 'outline' \| 'ghost'` | `'soft'`    | Visual treatment (same set as `GhostBadge`).                        |
| `tone`    | `'accent' \| 'neutral' \| 'danger'`         | `'neutral'` | Semantic color intent, independent of `variant`. Not a status enum. |

Sets `data-themed` on the inner root (same pattern as `GhostEmptyState`). Sets
`data-variant` / `data-tone` when not the default so CSS can treat omitted hooks
as `soft` / `neutral`.

## State model

Stateless presentational markup. No `data-state`. Live behavior is entirely from
the `announce` prop and consumer mount timing.

### Loading, empty, disabled, read-only, and error states

None apply as component states. Consumers mount the alert when they have copy to
show. Loading indicators belong to `GhostSpinner` / `GhostSkeleton` siblings.

### Async behavior

The component performs no async work. For failures after fetch, consumers
typically mount the alert with `announce="alert"` or toggle `announce` when copy
appears. The primitive does not detect “after mount” automatically; misuse of
`announce` on static initial content is a consumer documentation issue.

## Consumer data

No data props and no mutation. Slot content is consumer-owned.

## Accessibility contract

### Semantics and relationships

DOM reading order: `#title`, `#message`, `#actions`.

The title uses a native heading when the slot is present. Message copy is
ordinary text in a `div` with `data-part="message"`.

When `announce` is `off`, the root has no live-region `role`. With `#title` and
`as="section"`, `aria-labelledby` names the section.

When `announce` is `status`, the root is `role="status"` (implicit `aria-live="polite"`).
When `announce` is `alert`, the root is `role="alert"` (implicit `aria-live="assertive"`).

Choose `status` for recoverable or informational updates; choose `alert` for
urgent errors that need immediate attention. Do not set `announce` to `status` or
`alert` for copy that is present in the initial HTML with no later change unless
the surrounding workflow intentionally wants a mount announcement.

Interactive controls live only in `#actions`. They are not part of the root
accessible name unless named normally as buttons or links.

### Keyboard interaction

No root key handling. `#actions` children keep normal tab order.

### Focus behavior

The root is not focusable. Actions remain focusable when present.

### Assistive technology expectations

Static alerts (`announce="off"`) are read in document order like surrounding
content. Live alerts announce their subtree when inserted or when the root
`role` changes from a non-live configuration to `status`/`alert` as supported by
the platform. The component does not move focus when an alert appears.

## Rendering and customization

Slots and fallthrough attributes are the headless customization API. Stable
hooks:

- class `ghost-inline-alert`
- `data-part="root"` on the host
- `data-part="title" | "message" | "actions"` on slot wrappers
- `data-ghost-inline-alert=""` on the root for instance queries
- no `data-state` at introduction

Themed recipe CSS applies under `.ghost-theme`, `.ghost-themed-scope`, or
`[data-themed]` on the root. Layout is inline-start block flow (not centered
like `GhostEmptyState`).

## Environment behavior

### SSR and hydration

Markup is deterministic from props and slot presence. Generated title ids come
from `useGhostId` and must match between server and client (covered by
`expectSsrHydration`). The exposed `element` is `null` until mount.

### Mobile and touch

No gestures. Action buttons inside `#actions` own touch target size when using
`GhostButton`.

## Performance

Constant-time render. No listeners or observers.

## Composition

`useGhostInlineAlert` owns root bindings. Unstyled `GhostInlineAlert` composes
`useGhostId`. Optional actions compose with `GhostButton`. No overlay or portal
primitives.

Machine-readable contracts:
`packages/vue/manifests/ghost-inline-alert.manifest.json` and
`packages/themes/manifests/ghost-inline-alert.manifest.json`.

## Test plan

- Vue unit tests: default markup, `announce` roles, section `aria-labelledby`
  only when `announce` is `off`, slots and part order, fallthrough, exposed
  `element`, composable contract, and SSR `renderToString`.
- SSR hydration: `expectSsrHydration` for title id stability.
- Compile-time tests for props and exposed ref.
- Integration tests for themed wrapper and theme CSS token wiring.
- Browser: axe on registered examples; live example with `announce="alert"` after
  interaction; action focus in `actions` slot.
- Visual baselines for registered examples via `pnpm test:visual:docker`.

## Documentation plan

`docs/components/inline-alert.md` with API reference, static vs live `announce`
guidance, DataTable failure patterns, themed props, accessibility notes, and
registered examples. Playground section mirroring headless and themed cases.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None blocking. GHO-38 remains undecided; this reuses existing `data-part` and
class hooks.
