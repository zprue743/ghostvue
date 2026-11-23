---
schemaVersion: 1.0.0
component: GhostToastProvider
components:
  - GhostToastProvider
  - GhostToastViewport
  - GhostToast
  - GhostToastTitle
  - GhostToastDescription
  - GhostToastAction
  - GhostToastClose
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: approved
approval:
  evidence: 'Zac approved resolved decisions in chat, Nov 22, 2026. See https://github.com/zprue743/ghostvue/pull/266 and https://github.com/zprue743/ghostvue/pull/267.'
manifests: []
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: true
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions: []
---

# GhostToast specification

**Status:** Approved for [GHO-33](https://linear.app/ghost-vue/issue/GHO-33).
Implementation PRs must match this spec.

**Approved direction (Zac, 2026-11-17, option A):** provider-scoped state through
`useGhostToast` (canonical `useGhost*` naming); no module-global SSR queue; at
most three toasts visible with FIFO overflow; ordinary announcements polite;
assertive live output only for an explicitly urgent message; never steal focus;
informational toasts auto-dismiss after eight seconds by default; errors and
toasts with actions persist until dismissed; pause auto-dismiss timers on
pointer hover, focus within the toast, and hidden page visibility; announce
queued items only when they enter the visible set (not while waiting in the
overflow queue).

**Related:** [ADR 0012](../adr/0012-modal-overlays.md) (`[data-ghost-live]` must
remain interactive during modal background inert),
[`GhostInlineAlert` specification](/specs/inline-alert) (inline vs global
feedback boundary), [accessibility standard](../standards/accessibility.md).

## Purpose and user problems

`GhostToast` gives applications transient, non-blocking global feedback:
operation results, background job completion, and recoverable errors that should
not demand a modal. Sighted users read a small stack of notifications, usually
near a viewport edge. Assistive technology hears concise announcements when each
notification becomes visible, without focus moving to the toast stack.

The headless API centers on a **provider-scoped** imperative surface
(`useGhostToast`) so any descendant can publish feedback, while
`GhostToastViewport` owns the notification **region**, the visible stack, timers,
and twin screen-reader announcers (polite and assertive). State never lives in a
module-global queue, so
SSR and multi-provider trees stay isolated.

## Non-goals

- Inline contextual feedback next to related content (`GhostInlineAlert`).
- Modal or alert-dialog interruption (`GhostDialog`, `GhostAlertDialog`).
- Rich two-way chat, inbox, or notification center UX (history, grouping, read
  state, pagination).
- Swipe-to-dismiss gestures in v1 (pointer dismiss uses an explicit close
  control).
- Replacing page-level `aria-live` regions owned by other widgets (for example
  `GhostFileUpload` batch announcers).
- A parallel styling-hooks vocabulary beyond ADR 0004 (`data-part`, class,
  omitted-default `data-*` visual hooks).

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

| Export                         | Role                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `GhostToastProvider`           | Renderless `provide` / `inject` root; owns toast store, timers, and queue policy for one subtree.                    |
| `GhostToastViewport`           | Renders the notification region, visible toast stack, and twin screen-reader announcers. Typically one per provider. |
| `GhostToast`                   | Presentational root for one visible toast item (stable `data-ghost-toast` + part hooks).                             |
| `GhostToastTitle`              | Short heading / primary line for a toast.                                                                            |
| `GhostToastDescription`        | Supporting copy (optional).                                                                                          |
| `GhostToastAction`             | Optional action control (native `<button type="button">`).                                                           |
| `GhostToastClose`              | Optional dismiss control (native `<button type="button">`).                                                          |
| `useGhostToast`                | Imperative API: `toast`, `update`, `dismiss`, `dismissAll`, plus reactive read models.                               |
| `ghostToastProviderContextKey` | Advanced composition / testing.                                                                                      |

Types (representative; exact names follow manifest generation):

- `GhostToastProviderProps`
- `GhostToastViewportProps`
- `GhostToastData`, `GhostToastOptions`, `GhostToastUpdateOptions`
- `GhostToastId`, `GhostToastUrgency`, `GhostToastType`
- `UseGhostToastReturn`, `GhostToastProviderContext`

Named ESM exports only; no default export.

### `GhostToastProvider`

| Prop       | Type     | Default           | Contract                                                                                                                                                                                                                                                                                                                                 |
| ---------- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration` | `number` | `8000`            | Default auto-dismiss interval for **informational** toasts (no `action`, not `type: 'error'`). Must be a finite number `>= 0` after validation; non-finite or negative values log a development warning and fall back to **8000**. `0` means persist for those toasts. Error and action toasts always persist (see duration resolution). |
| `limit`    | `number` | `3`               | Maximum concurrently **visible** toasts. Additional items wait in the FIFO overflow queue. Must be a finite integer `>= 1`.                                                                                                                                                                                                              |
| `label`    | `string` | `'Notifications'` | Accessible name for the viewport region (`aria-label` on the viewport root).                                                                                                                                                                                                                                                             |

No emits, slots, or exposed methods on the provider itself. The default slot
renders children only (`provide` scope).

### `GhostToastViewport`

| Prop     | Type                 | Default | Contract                                                                                                                                                                                                                        |
| -------- | -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as`     | `'div' \| 'section'` | `'div'` | Host element for the stack. Use `section` when the region should be a landmark.                                                                                                                                                 |
| `portal` | `boolean`            | `true`  | When `true`, teleports the viewport (and both announcers) to `document.body` via `GhostPortal` so stacking context and `position: fixed` recipes stay predictable. When `false`, renders in place (SSR tests, embedded panels). |

Exposed template ref: `element: HTMLElement | null` (viewport host after mount).

The viewport renders:

1. A **visible stack** of up to `limit` toast roots (consumer template or
   default structure).
2. Two **screen-reader announcers** (`polite` and `assertive`; see
   Accessibility).

Stable attributes on the viewport host:

- `role="region"`
- Accessible name: provider `label` supplies default `aria-label` on the
  viewport host. Consumer fallthrough `aria-labelledby` on `GhostToastViewport`
  passes through to the region and **suppresses** that default `aria-label` (no
  separate viewport prop).
- `data-ghost-live=""` per ADR 0012
- `data-part="viewport"`
- class `ghost-toast-viewport`

### `useGhostToast(options?)`

`useGhostToast()` must run inside an active `GhostToastProvider`. When no
provider is present, development builds throw a descriptive error; production
behavior matches other Ghost providers (fail fast on call, not on import).

Optional `options` apply as defaults for `toast()` calls from that composable
instance (merged per call).

**Return value:**

| Member   | Type                                           | Contract                                                                                                         |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `toasts` | `Readonly<Ref<readonly GhostToastRecord[]>>`   | Reactive list of **visible** toasts only, oldest-first order (index `0` is the front of the FIFO visible stack). |
| `toast`  | `(options: GhostToastOptions) => GhostToastId` | Create or replace by `id` (see Stable identity). Returns the toast id.                                           |
| `update` | `(id, patch: GhostToastUpdateOptions) => void` | Merge updates into an existing toast in the store (visible or queued). No-op when id unknown.                    |

`GhostToastUpdateOptions` extends the mutable fields of `GhostToastOptions` and
adds:

| Field            | Type                         | Default                                                                | Contract                                                                                                                                          |
| ---------------- | ---------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `announceUpdate` | `boolean`                    | `false`                                                                | When `true` and the toast is **visible**, re-announce merged `title` / `description` through the same polite or assertive announcer used on show. |
| `dismiss`        | `(id: GhostToastId) => void` | Remove toast from store; if visible, may promote the next queued item. |
| `dismissAll`     | `() => void`                 | Clear visible and queued toasts; cancel all timers.                    |

`GhostToastRecord` (read model for controlled rendering) includes at minimum:
`id`, resolved `type`, `urgency`, `title`, `description`, `duration`,
`remainingMs` (when auto-dismiss applies and not paused), `pauseReasons` (debug
/ advanced), and open/close lifecycle flags the viewport needs.

### Imperative options (`GhostToastOptions`)

| Field         | Type                                     | Default     | Contract                                                                                                                                                                                                                                                                                       |
| ------------- | ---------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `string`                                 | generated   | Stable identity for `update` / `dismiss`. When omitted, the store assigns an auto id (see Stable identity). Callable from `toast()` outside `setup`; auto ids do not use `useGhostId` at call time.                                                                                            |
| `type`        | `'default' \| 'error'`                   | `'default'` | Themed `tone` hooks only; not a separate ARIA role on the visible root. `type: 'error'` **always persists** until dismiss and ignores `duration`.                                                                                                                                              |
| `urgency`     | `'default' \| 'urgent'`                  | `'default'` | `urgent` routes this toast's show announcement to the **assertive** live region. Visible stack layout is unchanged.                                                                                                                                                                            |
| `duration`    | `number \| null \| undefined`            | `undefined` | Auto-dismiss override for **informational** toasts only (`type: 'default'` without `action`). Ignored on error/action toasts (development warning). `null` or `0` → persist. Positive finite number → milliseconds. Non-finite or negative → development warning, then treated as `undefined`. |
| `title`       | `string`                                 | —           | Primary message (required non-empty after trim for `toast()` to enqueue).                                                                                                                                                                                                                      |
| `description` | `string`                                 | `undefined` | Optional supporting text included in the active live region and visible UI.                                                                                                                                                                                                                    |
| `action`      | `{ label: string; onClick: () => void }` | `undefined` | When present, the toast **persists** until dismissed and ignores `duration` (development warning if `duration` is set). `onClick` runs in user activation; the store does not auto-dismiss after action unless the handler calls `dismiss`.                                                    |
| `onDismiss`   | `() => void`                             | `undefined` | Called once when the toast leaves the store (timer expiry, close button, programmatic `dismiss`, or provider disposal). Not called when `update` replaces content in place.                                                                                                                    |

**Duration resolution:**

1. **Persisting toasts:** `type: 'error'` or `action` present → **persist until
   dismiss**. The `duration` field is **ignored**. In development, log a warning
   when `duration` is not `undefined` on these toasts.
2. **Informational toasts only** (`type: 'default'`, no `action`), when step 1
   does not apply (`0` and `null` always mean persist):
   - **Explicit `duration`** when not `undefined`: non-finite or negative
     (including `NaN`) → development warning, then treated as `undefined`;
     `null` or `0` → persist; finite `> 0` → that many milliseconds.
   - **Provider default:** non-finite or negative provider `duration` →
     development warning, then **8000**; provider `duration` `0` → persist;
     provider `duration` `> 0` → that interval.
   - No applicable rule → **8000** ms.

Examples: informational, no `duration` → 8000 ms. `type: 'error'` → persist even
with `duration: 5000` (warning in dev). Toast with `action` → persist. Informational
with `duration: 5000` → 5000 ms. Informational with `duration: -1` → warning,
then provider default (8000). Provider `duration: 0` and informational → persist.

### Stable identity

During provider setup (in `setup()` only), the store captures a `storeKey` from
`useGhostId('ghost-toast-store')`. **Generated** ids use the reserved form
`${storeKey}:auto:${n}` where `n` is a monotonically increasing per-provider
counter starting at `1`. Consumer **explicit** ids are accepted as-is but must
not use the `${storeKey}:auto:` prefix; in development, a collision or
prefix-masquerade attempt logs a warning and treats the call as an update to the
existing record.

- `toast({ id: 'save' })` when no record exists creates a new toast with that id.
- `toast({ id: 'save', ... })` when a record with the same id exists **updates**
  it in place (same queue position and visibility slot if already visible or
  queued).
- `update('save', patch)` merges fields without resetting visibility slot unless
  `patch` changes duration policy such that a running timer must be recomputed
  (see State model).
- Generated ids are unique within a provider; consumers should pass explicit ids
  when they need idempotent "latest save status" behavior.

### v-model contracts

There is no `v-model`. Visibility and copy are store-owned. Consumers may bind
UI to `toasts` from `useGhostToast()` for fully custom rendering (controlled
**presentation**, not controlled store ownership).

### Events, callbacks, slots, and exposed methods

`GhostToast*` part components follow the dialog/inline-alert pattern: named slots
where applicable, fallthrough attrs to the native host, `data-part` hooks, no
focus steal on insert.

`GhostToastClose` emits `click` after the store dismisses (default behavior:
dismiss parent toast id from context). `GhostToastAction` forwards click to the
`action.onClick` supplied at creation.

The viewport may expose a default slot scoped with `{ toasts }` or dedicated
`#toast="{ toast }"` iteration slot; exact slot names are fixed at
implementation time to match manifest records (minimum: render props for each
`GhostToastRecord`).

## State model

### Store layout

Each provider maintains one logical store:

```
all records (creation order) ──► fifo queue ──► visible window (max limit)
```

- **Creation order** is FIFO for overflow: when the visible window is full, new
  records append to the tail of the waiting queue.
- When a visible toast is dismissed or auto-expires, the next waiting record
  promotes to visible and triggers a **show** transition (including
  announcement and timer start).
- Dismissing a queued (not yet visible) toast removes it without promotion side
  effects beyond freeing a future slot.

No global module state. Two sibling providers in the same app are independent.

### Toast lifecycle (per record)

Valid states: `queued` → `visible` → `dismissed` (terminal). Updates may occur
in `queued` or `visible`.

Transitions:

| Event               | From                  | To                    | Notes                                                                 |
| ------------------- | --------------------- | --------------------- | --------------------------------------------------------------------- |
| `toast()` create    | —                     | `queued` or `visible` | Visible immediately when window has capacity; otherwise `queued`.     |
| Promotion           | `queued`              | `visible`             | On dismiss/expire of a visible peer.                                  |
| Auto-dismiss timer  | `visible`             | `dismissed`           | Only when duration policy applies and timer elapses without pause.    |
| `dismiss()` / close | `queued` or `visible` | `dismissed`           | Clears timers for that id.                                            |
| Provider dispose    | any                   | `dismissed`           | All records cleared; timers canceled; `onDismiss` invoked per record. |

### Auto-dismiss and pause (remaining-time accounting)

Each auto-dismiss toast keeps:

- `durationMs` — resolved policy duration.
- `remainingMs` — milliseconds left when the timer last started or resumed.
- `pauseReasons` — a set containing any of `'hover' | 'focus' | 'hidden'`.

Timer rules:

1. Start (or restart) the countdown only when the toast is `visible` and
   `remainingMs > 0`.
2. **Pause** when `pauseReasons` is non-empty: cancel the active timer; freeze
   `remainingMs` at the value when the pause began (computed from deadline minus
   `performance.now()` or `Date.now()` consistently within the implementation).
3. **Resume** when `pauseReasons` becomes empty: schedule `remainingMs` from
   now.
4. Overlapping reasons are ref-counted or set-based: hovering while focused
   keeps pause until **both** pointer leave and focus leave; hidden page adds a
   third reason that composes with the others (document `visibilityState ===
'hidden'`).
5. `update()` that changes duration policy recomputes `remainingMs` from the new
   policy (full duration for a lengthened timer; clamp to zero for shortened).
6. Promotion from `queued` to `visible` starts with full `durationMs` (queued
   time does not consume auto-dismiss budget).

Pointer hover pause attaches to the visible `GhostToast` root (`mouseenter` /
`mouseleave`). Focus pause uses `focusin` / `focusout` on the toast root with
`relatedTarget` checks so moving focus between action and close does not flap the
timer. Page visibility uses `document.visibilitychange`.

### Loading, empty, disabled, read-only, and error states

Not component-level enums beyond `type: 'error'` on records. The viewport renders
nothing when `toasts` is empty (region remains in the DOM for landmark stability).

### Async behavior

`toast()` and `update()` are synchronous store writes. `action.onClick` may be
async; the store does not await it. Race tests cover out-of-order `update` and
`dismiss` calls for the same id (last write wins; dismiss after update must not
resurrect).

## Consumer data

Toast **content** is consumer-owned strings and callbacks (`title`,
`description`, `action`, `onDismiss`). The store does not mutate consumer objects
after enqueue; `update` accepts fresh fields. No collections or keyed item
accessors.

## Accessibility contract

### Semantics and relationships

**Visible stack:** Each `GhostToast` root is a plain container (`div` by default)
with `data-ghost-toast=""` and `data-part="root"`. Meaning comes from text nodes
and controls (`GhostToastTitle`, `GhostToastDescription`, `GhostToastAction`,
`GhostToastClose`). The visible toast root does **not** use `role="alert"` or
`role="status"` (avoid duplicate announcements with the live regions).

**Notification region:** `GhostToastViewport` is `role="region"` with
`aria-label` from provider `label`. It groups the visible stack for sighted users
and landmark navigation. Individual toasts are not nested landmarks.

**Screen-reader announcers:** Two visually hidden siblings via
`useGhostVisuallyHidden` styles (same technique as `GhostFileUpload`). The
implementation does **not** flip one region between polite and assertive.

| Region    | `role`   | `aria-live` | `data-part`           |
| --------- | -------- | ----------- | --------------------- |
| Polite    | `status` | `polite`    | `announcer-polite`    |
| Assertive | `alert`  | (implicit)  | `announcer-assertive` |

The polite region uses `aria-atomic="true"`. The assertive region uses
`role="alert"` (implicit assertive live output) and must not also use
`role="status"`.

**Single-announcement behavior:** When a toast transitions to `visible`, exactly
one live region receives one atomic string built from `title` and `description`
(filtered, joined with space): the **assertive** region when `urgency: 'urgent'`,
otherwise the **polite** region. The implementation uses a monotonic `key` on the
active region's child (file-upload pattern) so identical consecutive text still
produces a new node and AT announces it. The inactive region is not updated for
that show. Queued toasts do not write to either region until promotion. Updating copy on a
**visible** toast re-announces only when `update(..., { announceUpdate: true })`
(default `false`).

**Urgency:** Only `urgency: 'urgent'` writes the show flush to
`announcer-assertive`. All other shows use `announcer-polite`. Ordinary
informational toasts must not use assertive output.

**Modal interaction:** Viewport host carries `data-ghost-live` so `useInertOthers`
leaves the stack interactive and readable during open modals (ADR 0012).

### Keyboard interaction

| Key                 | Context                                            | Behavior                                                                                                                                                                                                                             |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Tab` / `Shift+Tab` | Toast with action/close                            | Normal tab order through focusable controls only.                                                                                                                                                                                    |
| `Enter` / `Space`   | Focused action or close                            | Activates the focused button.                                                                                                                                                                                                        |
| `Escape`            | Focus within a toast (close and/or action present) | Dismisses **only that toast**; `stopPropagation()` so an open dialog behind is not closed. Focus returns to the element that was active before focus entered the toast region (same when `GhostToastClose` removes a focused toast). |

No roving tabindex across toasts: each toast's controls participate in document
tab order in stack order (oldest first) when focused from the tab key.

### Focus behavior

**Never steal focus:** Creating, updating, promoting, or auto-dismissing a toast
must not call `focus()` or move the active element. The only focus changes come
from the user activating `GhostToastAction` or `GhostToastClose`.

Pointer hover and focus pause timers only; they do not transfer focus.

### Assistive technology expectations

When a toast becomes visible, AT users hear the live-region text once (polite or
assertive per urgency). Visible toast copy is available in the accessibility tree
in document order inside the notification region. Dismissal does not announce by
default. Error and action toasts persist until the user dismisses them;
informational toasts may auto-dismiss without focus change.

## Rendering and customization

Headless customization uses:

- Imperative `toast()` / `toasts` for fully custom markup inside the viewport
  slot.
- Part components with `data-part` hooks: `viewport`, `announcer-polite`,
  `announcer-assertive`, `root`,
  `title`, `description`, `action`, `close`.
- class `ghost-toast`, `ghost-toast-viewport`, etc.
- `data-ghost-toast=""` on each toast root for queries and theme recipes.

Headless ships **no** enter/exit motion in v1. Themed `@ghostvue/themes`
`GhostToast` (same release train as headless — see [Resolved decisions](#resolved-decisions))
passes behavioral props through and adds `data-themed`, `data-variant`, and
`data-tone` consistent with `GhostInlineAlert` / `GhostEmptyState`. Themed stack
chrome adds **enter-only** animation via motion tokens, disabled under
`prefers-reduced-motion`. In-place `update()` / duplicate `id` merges keep the
toast root **key** stable so enter animation does not replay.

Default stack positioning (corner, gap, z-index) is theme-owned, not headless.

## Environment behavior

### SSR and hydration

- `GhostToastProvider` is renderless; no timers in `setup()` on server.
- `GhostToastViewport` renders deterministic shell markup: empty stack + empty
  polite and assertive announcers on server when no client-only records exist.
- **No module-global queue:** server render never reads client-created toasts;
  each request with SSR must mount its own provider (Nuxt layout pattern).
- Auto-dismiss, `visibilitychange`, and pointer listeners register in
  `onMounted` (or equivalent) and clean up on unmount / provider disposal.
- On the **client**, `toast()` before `GhostToastViewport` mounts queues records
  silently in the provider store and **flushes** when the viewport mounts (promote
  visible, start timers).
- During **SSR**, `toast()` is a **no-op** with a development warning (no shared
  queue or timers on the server).
- Timers start only after mount when the record becomes `visible`.

Hydration tests (`expectSsrHydration`) cover viewport + both announcer regions
with an empty stack.

### Mobile and touch

Close and action buttons use native `<button type="button">`; touch targets are
the consumer/theme responsibility (`GhostButton` in themed recipes). No swipe
dismiss in v1.

## Performance

Expected scale: at most three visible; the **waiting** overflow queue is
**unbounded** in v1 (reusing an `id` merges in place). Development builds log a
warning when more than **20** records are waiting. Store operations are `O(n)` in
queue length. One timer per visible auto-dismiss toast. Pause tracking is constant
time per toast.

Identity: toast ids are strings; no `WeakMap` required for content deduplication.

## Composition

Machine-readable contracts (`packages/vue/manifests/ghost-toast-*.manifest.json` and
`packages/themes/manifests/ghost-toast.manifest.json`) are created when
implementation starts; this proposed spec does not reference them until those
files exist.

| Primitive                                        | Use                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `GhostPortal`                                    | Optional body teleport for viewport (`portal=true`).                        |
| `useGhostId`                                     | Provider-scoped `storeKey` during provider `setup()` only (auto id prefix). |
| `useGhostVisuallyHidden` / `visuallyHiddenStyle` | Announcer hiding.                                                           |
| `GhostButton`                                    | Themed actions only (headless uses native buttons).                         |
| `onScopeDispose` / provider `onUnmounted`        | Timer and listener cleanup.                                                 |

Does not compose `useFocusScope`, `useDismissableLayer`, or overlay stacks.

## Test plan

### Unit tests (`useGhostToast` / provider store)

- **FIFO visibility:** With `limit: 3`, creating four toasts leaves three
  visible (oldest three) and one queued; dismissing one promotes the fourth.
- **Duration defaults:** Informational toast uses 8000 ms; `type: 'error'` and
  `action` always persist (`duration` ignored; dev warning when set);
  informational `duration: null` / `0` persist; informational `duration: 5000` →
  5000 ms; informational negative/`NaN` `duration` → warning then provider default;
  provider `duration: 0` makes informational toasts persist.
- **Id generation:** `${storeKey}:auto:${n}` from imperative `toast()`; explicit
  id must not use the auto prefix; collision warning.
- **Timer pause overlap:** Fake timers with simultaneous hover + focus + hidden
  flags; `remainingMs` decreases only while all clears; no time lost to
  double-counting pause intervals.
- **Update/dismiss races:** `update` then `dismiss` on same id; `dismiss` during
  promotion; duplicate `toast({ id })` merges without duplicate visible slots.
- **Provider disposal:** Unmount provider clears store, cancels timers, calls
  `onDismiss` once each, removes document listeners.
- **SSR isolation:** Two providers in one test app do not share state; no import
  side effects on module globals.

### Vue component tests

- Viewport region attributes: `role="region"`, `aria-label`, `data-ghost-live`.
- Polite region keeps `role="status"` / `aria-live="polite"`; assertive region
  keeps `role="alert"`; urgent shows update `announcer-assertive` only, default
  shows update `announcer-polite` only.
- Keyed child on the active live region increments on each show.
- `GhostToastClose` dismisses without focusing itself on insert.
- Portal on/off rendering targets.

### Browser tests (Playwright)

- Create toast from nested route; no `document.activeElement` change on show.
- Tab reaches action/close inside stack; auto-dismiss does not run while hovered
  (pointer move fixture).
- `document.visibilityState` hidden pauses then resumes (Playwright page
  emulation).
- axe on viewport with zero and multiple toasts; with dialog open, toast remains
  operable (`data-ghost-live`).

### Accessibility and keyboard tests

- Documented keys on close/action (activation only).
- Integration test: urgent show touches assertive `role="alert"` region only;
  default show touches polite `status` region only; assertive region never uses
  `role="status"`.
- Optional manual NVDA/VoiceOver scripts in manifest evidence when promoting to
  stable.

### Compile-time / type tests

- `packages/vue/type-tests/GhostToastConsumer.vue` exercises `useGhostToast`
  inference and `toast` option shapes.

### Regression fixtures

- Examples: `examples/toast/basic.vue`, `examples/toast/persist-error.vue`,
  `examples/toast/queue-overflow.vue` (registered when implemented).

## Documentation plan

- `docs/components/toast.md` with provider setup, imperative API, duration
  rules, urgency guidance, custom viewport slot, and modal + live region note.
- Cross-link from `inline-alert.md` and `roadmap.md`.
- Accessibility section: polite vs urgent, no focus steal, pause behavior,
  region labeling.
- Executable examples listed in manifest when implementation lands.

## Compatibility and release impact

Additive minor release for `@ghostvue/vue` and `@ghostvue/themes`. Headless and
themed stack ship in the **same release** as two stacked PRs (headless first).
New exports only; no breaking changes. Changeset required when packages publish.

## Resolved decisions

1. **T1 — Pre-mount `toast()`:** Client queues silently and flushes on viewport
   mount; SSR calls are no-ops with a dev warning (no shared queue/timers on the
   server). **Reason:** Keeps SSR safe without module-global state. _Approved by
   Zac, Nov 22, 2026._
2. **T2 — `announceUpdate`:** Re-announce visible toast text only when
   `GhostToastUpdateOptions.announceUpdate` is `true` (default `false`). **Reason:**
   Avoids noisy live regions on routine progress updates. _Approved by Zac, Nov
   22, 2026._
3. **T3 — Viewport naming:** Consumer `aria-labelledby` on the viewport passes
   through and suppresses the default `aria-label` from provider `label`; no new
   prop. **Reason:** Reuses fallthrough instead of competing label props. _Approved
   by Zac, Nov 22, 2026._
4. **T4 — Queue cap:** No waiting-queue cap in v1; dev warning when more than 20
   toasts are waiting; reusing an `id` merges/updates. **Reason:** Simplicity
   with a loud dev signal for runaway enqueue. _Approved by Zac, Nov 22, 2026._
5. **T5 — Escape:** `Escape` on a focused toast dismisses only that toast,
   stops propagation so dialogs behind stay open, and restores focus to the
   element focused before the user entered the toast region (same for Close
   removing a focused toast). **Reason:** Matches non-modal dismiss without
   breaking modal stacks. _Approved by Zac, Nov 22, 2026._
6. **T6 — Themed v1:** Themed toast ships in the same release as headless, as two
   PRs (headless first). **Reason:** Consumers get one release boundary while
   keeping review slices small. _Approved by Zac, Nov 22, 2026._
7. **T7 — Motion:** No animation in headless; themed adds enter-only animation
   via motion tokens with `prefers-reduced-motion` off; in-place updates keep the
   key so animation does not replay. **Reason:** Motion stays in the styled layer.
   _Approved by Zac, Nov 22, 2026._
