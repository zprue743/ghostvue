---
schemaVersion: 1.0.0
component: GhostPresence
components:
  - GhostPresence
packages:
  - '@ghostvue/vue'
specStatus: approved
approval:
  evidence: 'Zac authorized design sign-off on P1-P6 as proposed at 225f9fe09b1bbab8c03d88138c80ebdb171b6e01 (recorded in PR #488 on 2026-11-28); infinite-animation and finite-repeat revisions pending merge review before #417 unblocks.'
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

# Component specification: `GhostPresence` and overlay exit lifecycle

> [!IMPORTANT]
> **Status:** Design sign-off recorded for [#412](https://github.com/zprue743/ghostvue/issues/412)
> (P1–P6 approved as proposed by Zac at `225f9fe09b1bbab8c03d88138c80ebdb171b6e01`,
> recorded in PR #488 on 2026-11-28). This is a docs-only specification for
> `0.2.0` ("Motion and nested menus"); [#417](https://github.com/zprue743/ghostvue/issues/417)
> remains blocked until the revised PR #488 merges to `master`.

**Predecessors:** [ADR 0003: Public component API conventions](../adr/0003-public-component-api-conventions.md),
[ADR 0004: Headless and styled layering](../adr/0004-headless-styled-layering.md),
[ADR 0011: Overlay primitives](../adr/0011-overlay-primitives.md),
[ADR 0012: Modal overlays](../adr/0012-modal-overlays.md),
[Focus scope and roving focus](../architecture/focus.md), and
[Motion](../themes/motion.md).

## Purpose and user problems

Closing an overlay in `@ghostvue/vue` today (`GhostDialogContent`,
`GhostDialogOverlay`, `GhostPopoverContent`, `GhostDrawerContent`, and peer
surfaces) unmounts its DOM subtree synchronously via
`v-if="context.isOpen.value"` (or `v-if="visible"`). As a result, `@ghostvue/themes`
can animate overlay entry with `@starting-style` and CSS transitions, but every
close snaps out of existence in a single frame.

Adding exit animations naively by delaying logical close or keeping modal/focus
primitives alive until `transitionend` degrades keyboard and assistive-technology
behavior:

- A keyboard user pressing `Escape` on a modal `GhostDialog` expects focus to
  return to the trigger **immediately** so the very next `Tab` or `Enter` acts on
  the underlying page rather than being swallowed or yanked back 120–250ms later
  when a fade finishes.
- Nested overlays (for example a `GhostPopover` inside a `GhostDialog`, or two
  stacked dialogs) need a second rapid `Escape` press to dismiss the parent layer
  without hitting a lingering entry on `layerStack`.
- Page scrolling (`useScrollLock`) and background sibling interactivity
  (`useInertOthers`) must unlock as soon as the final modal logically closes, and
  clicks through a fading scrim or popover must activate underlying controls
  rather than landing on a departing surface.
- Headless consumers with zero CSS must still get immediate DOM removal without
  hanging on a `transitionend` event that never fires, and rapid close-then-reopen
  interactions must never let a stale animation completion unmount newly reopened
  content.

`GhostPresence` and `useGhostPresence` decouple **logical open state** (`isOpen`)
from **physical DOM presence** (`isPresent`): accessibility, dismissal, focus
restoration, focus trapping, background `inert`, and scroll lock follow logical
close immediately, while DOM removal waits only when active CSS transitions or
animations run on the exiting surface.

### Vue `<Transition>` versus `GhostPresence` and `useGhostPresence`

| Dimension                             | Vue `<Transition>`                                                                                                                                                                   | `GhostPresence` / `useGhostPresence`                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Styling contract                      | Injects transient framework classes (`v-enter-from`, `v-leave-active`, `v-leave-to`) or requires imperative JS `@leave(el, done)` hooks.                                             | Uses GhostVue's canonical `data-state="open" \| "closed"` hook ([public-api.md](../standards/public-api.md), [motion.md](../themes/motion.md)) alongside `@starting-style` for entry.                     |
| Headless default (absent CSS motion)  | JS `@leave` hooks hang unless manually probing computed styles; class-based leave requires consumer/theme transition classes.                                                        | Inspects animations/transitions targeting the surface element after `data-state="closed"` flushes; when effective duration is `0ms`, unmounts in the same post-flush tick with zero timer delay.          |
| `GhostPortal` (`<Teleport>`)          | Cannot wrap `<GhostPortal>` directly (`<Teleport>` has no single element root); wrapping inside each part still ties component unmount lifecycle to physical leave completion.       | Composes inside `<GhostPortal>` without moving nodes back inline during exit; `useGhostPresence` runs directly inside overlay content/overlay parts with zero extra wrapper components.                   |
| Focus, trap, layer, and scroll timing | Keeping a dialog component mounted during `<Transition>` leave keeps `onMounted`/`onUnmounted`-scoped traps, `layerStack`, `inert`, and scroll lock active unless split manually.    | Logical `isOpen` drives `useFocusScope`, `useDismissableLayer`, `useScrollLock`, and `useInertOthers` (immediate release on close); `isPresent` drives only `v-if` DOM retention and `useFloating`.       |
| Interrupted exit / rapid reopen       | `v-if` false-then-true either instantiates a new component subtree or requires leave cancellation coordination across VNode clones.                                                  | Keeps the same mounted DOM element and component instance alive while `exiting`, increments a generation counter on reopen, flips `data-state` back to `"open"`, and interpolates smoothly from mid-exit. |
| Descendant transition isolation       | Bubbled `transitionend` / `animationend` from child controls (for example button hover or an infinite `GhostSpinner`) can prematurely end or indefinitely block poorly scoped hooks. | Tracks only animations/transitions whose target is the registered surface element itself (`element.getAnimations()` without `subtree: true`, and `event.target === element` fallback).                    |

Consumers who animate arbitrary non-GhostVue elements inside an overlay's default
slot may still use Vue `<Transition>` normally; `GhostPresence` owns the overlay
surface and backdrop lifecycle.

## Non-goals

- **JavaScript physics, spring solvers, or Web Animations orchestration in
  `@ghostvue/vue`.** Headless code never computes keyframes, durations, or curves;
  all visual motion lives in `@ghostvue/themes` or consumer CSS.
- **View Transitions API orchestration for overlays.** `startThemeTransition` in
  `@ghostvue/themes` remains scoped to theme mode crossfades.
- **Drag-to-dismiss or swipe-velocity gestures** on `GhostDrawer` or `GhostDialog`.
- **Multi-item list exit choreography (`<TransitionGroup>`).** Keyed toast stack
  exits (`GhostToastViewport` / `GhostToast`) require list reflow coordination and
  remain outside this single-surface presence contract.
- **Nested menu (`GhostDropdownMenu`, `GhostContextMenu`, `GhostMenubar`) and
  persistent-DOM listbox (`GhostSelect`, `GhostCombobox`) exit wiring in the first
  slice (`#417`).** See [First-release overlay hosts](#first-release-overlay-hosts)
  for exact boundaries and follow-up sequencing.
- **Waiting on persistent infinite animations.** Unbounded animations applied to
  the registered surface itself (`animation-iteration-count: infinite`, or any
  animation with a non-finite end time or `playbackRate === 0`) are explicitly
  excluded from exit completion waiting so closed overlays and floating
  `autoUpdate` hosts never hang indefinitely.
- **New runtime dependencies.** Implemented entirely in `@ghostvue/vue` using
  standard DOM/Web Animations APIs (`getAnimations`, `getComputedStyle`,
  `transitionend` / `animationend`).

## Public API

All runtime exports live in `@ghostvue/vue`. `@ghostvue/themes` exports no new
JavaScript symbols; its contribution is CSS exit rules in existing component
stylesheets (see [Rendering and customization](#rendering-and-customization)).

### Exports from `@ghostvue/vue`

- `GhostPresence` — renderless presence component for custom consumer overlays and
  conditional subtrees.
- `useGhostPresence` — headless composable used by GhostVue overlay parts and
  advanced standalone compositions.
- Types: `GhostPresencePhase`, `GhostPresenceDataState`, `GhostPresenceProps`,
  `GhostPresenceSlotProps`, `UseGhostPresenceOptions`, `UseGhostPresenceReturn`.

### `useGhostPresence` composable

```ts
export type GhostPresencePhase = 'closed' | 'open' | 'exiting'
export type GhostPresenceDataState = 'open' | 'closed'

export interface UseGhostPresenceOptions {
  /** Logical open state (`true` while open, `false` when logically closed). */
  present: MaybeRefOrGetter<boolean>
  /**
   * Host element whose own CSS transitions/animations gate DOM removal during
   * the `exiting` phase. Optional when binding `setElement` as a template ref.
   */
  element?: MaybeRefOrGetter<HTMLElement | null | undefined>
  /**
   * Skips exit retention when `true` (for example `disableAnimation` or an
   * anchored overlay closed before initial positioning completed).
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Invoked once after an `exiting` surface finishes its exit motion and flips
   * `isPresent` to `false`. Never called when an exit is interrupted by reopen
   * or aborted by owner component unmount.
   */
  onExitComplete?: () => void
}

export interface UseGhostPresenceReturn {
  /** `true` while `present` is `true` or while `phase` is `'exiting'`. */
  isPresent: ComputedRef<boolean>
  /** Current lifecycle phase: `'closed'`, `'open'`, or `'exiting'`. */
  phase: Readonly<Ref<GhostPresencePhase>>
  /** `'open'` when logically open; `'closed'` during `'exiting'` and `'closed'`. */
  dataState: ComputedRef<GhostPresenceDataState>
  /** `true` only while `phase` is `'exiting'`. */
  isExiting: ComputedRef<boolean>
  /**
   * Template-ref setter accepting a raw `Element`, a component instance exposing
   * `{ element: HTMLElement | null }` or `$el`, or `null`. Used when `options.element`
   * is not passed directly.
   */
  setElement: (target: unknown) => void
}
```

### `GhostPresence` component

#### Props and configuration

| Prop       | Type      | Default  | Contract                                                                                                                      |
| ---------- | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `present`  | `boolean` | required | Logical open/mounted state. When `true`, mounts the default slot; when `false`, transitions through `exiting` before unmount. |
| `disabled` | `boolean` | `false`  | When `true`, bypasses exit waiting and unmounts immediately when `present` turns `false`.                                     |

#### v-model contracts

`GhostPresence` does not own open state and defines no `v-model`. `present` is a
one-way boolean input driven by the parent or an enclosing overlay's `open` state.
Built-in overlay roots (`GhostDialog`, `GhostPopover`, `GhostDrawer`,
`GhostCommandPalette`, `GhostDatePicker`, `GhostHoverCard`) keep their existing
`v-model:open` (`open` + `update:open`) contracts unchanged: `update:open(false)`
emits synchronously at logical close, never delayed until exit completion.

#### Events, callbacks, slots, and exposed methods

- **Emits:** `exitComplete: []` — emitted when an exit finishes and the slot
  unmounts (`onExitComplete` equivalent). Not emitted on reopen interruption or
  parent unmount.
- **Default slot (`GhostPresenceSlotProps`):**
  `{ present: boolean, phase: GhostPresencePhase, state: GhostPresenceDataState, exiting: boolean, setElement: (target: unknown) => void }`.
  - When `!isPresent`, `GhostPresence` returns `null` without invoking the
    default slot (matching `v-if="false"`).
  - When `isPresent` is `true` and the default slot renders a **single element or
    component VNode** without manually calling `setElement`, `GhostPresence`
    clones the VNode (`cloneVNode(..., /* mergeRef */ true)`) to compose its
    element ref without clobbering any consumer `ref`, injects
    `data-state="open" | "closed"` when the child omits `data-state`, and applies
    `inert` plus `pointer-events: none` while `exiting` (preserving any
    consumer-supplied `inert` or inline `pointer-events` once reopened).
  - When the default slot renders a fragment, multiple root nodes, or a
    `<Teleport>` / `GhostPortal` wrapper, the consumer binds `:ref="setElement"`
    (and `data-state` / `:inert="exiting || undefined"`) on the animated surface
    element. In development builds (`process.env.NODE_ENV !== 'production'`), if
    `present` flips `true -> false` with no resolved `HTMLElement` because a
    non-element root did not bind `setElement`, `GhostPresence` logs the next
    unassigned `GHOST0xx` warning in `packages/vue/src/dev-codes.ts` once and
    unmounts immediately rather than hanging.
- **Exposed:** none (`GhostPresence` is renderless; consumers keep their own
  template ref on the child element, preserved by `mergeRef`).

### Minimal consumer examples

#### 1. Built-in overlay host (zero extra markup)

Built-in hosts wire `useGhostPresence` internally. Consumers using
`@ghostvue/themes` get themed exit motion automatically; headless consumers write
plain CSS against `[data-state='open']` and `[data-state='closed']`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
} from '@ghostvue/vue'

const open = ref(false)
</script>

<template>
  <GhostDialog v-model:open="open">
    <GhostDialogTrigger>Delete project</GhostDialogTrigger>
    <GhostDialogOverlay class="dialog-scrim" />
    <GhostDialogContent class="dialog-panel">
      <GhostDialogTitle>Delete project?</GhostDialogTitle>
      <GhostDialogDescription>
        This action permanently removes all snapshots.
      </GhostDialogDescription>
      <GhostDialogClose>Cancel</GhostDialogClose>
    </GhostDialogContent>
  </GhostDialog>
</template>

<style scoped>
.dialog-scrim,
.dialog-panel {
  transition: opacity 120ms cubic-bezier(0.3, 0, 1, 1);
  @starting-style {
    opacity: 0;
  }
}

.dialog-scrim[data-state='closed'],
.dialog-panel[data-state='closed'] {
  opacity: 0;
}
</style>
```

#### 2. Standalone `GhostPresence` with `GhostPortal`

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { GhostPortal, GhostPresence } from '@ghostvue/vue'

const open = ref(false)
</script>

<template>
  <button type="button" :aria-expanded="open" @click="open = !open">
    Toggle inspector
  </button>

  <GhostPortal>
    <GhostPresence :present="open">
      <aside class="inspector-panel" aria-label="Inspector">
        <p>Panel details</p>
      </aside>
    </GhostPresence>
  </GhostPortal>
</template>

<style scoped>
.inspector-panel {
  transition:
    opacity 120ms ease,
    translate 120ms ease;
  @starting-style {
    opacity: 0;
    translate: 0 0.5rem;
  }
}

.inspector-panel[data-state='closed'] {
  opacity: 0;
  translate: 0 0.5rem;
}
</style>
```

### First-release overlay hosts

The first implementation release (`0.2.0`, tracked by
[#417](https://github.com/zprue743/ghostvue/issues/417)) adopts `useGhostPresence`
and `@ghostvue/themes` exit recipes in the following hosts (approved per
[P2](#resolved-decisions)):

| Host family                      | Headless parts adopting `useGhostPresence`                       | Why in (or out of) the first `0.2.0` release (`#417`)                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Standalone primitive             | `GhostPresence`, `useGhostPresence`                              | Public building block for custom overlays and internal host parts.                                                                                                                         |
| Dialog (`GhostDialog`)           | `GhostDialogContent`, `GhostDialogOverlay`                       | Primary modal and `modal=false` regression fixture required by `#412` and `#417`.                                                                                                          |
| Popover (`GhostPopover`)         | `GhostPopoverContent`                                            | Primary anchored non-modal regression fixture required by `#412` and `#417`.                                                                                                               |
| Drawer (`GhostDrawer`)           | `GhostDrawerContent`, `GhostDrawerOverlay`                       | Shares `useDialogContentPart` / `useDialogOverlayPart` in `dialog-shared.ts` with `GhostDialog`; already has `@starting-style` edge slides in `ghost-drawer.css`.                          |
| CommandPalette                   | `GhostCommandPaletteContent`, `GhostCommandPaletteOverlay`       | Shares `useDialogContentPart` / `useDialogOverlayPart` in `dialog-shared.ts` and entry scale/fade in `ghost-command-palette.css`.                                                          |
| DatePicker (`GhostDatePicker`)   | `GhostDatePickerContent` (via inner `GhostDialogContent`)        | Wraps `GhostDialogContent`; included so `useFloating` retains anchor coordinates while the inner `GhostDialogContent` exits.                                                               |
| HoverCard (`GhostHoverCard`)     | `GhostHoverCardContent`                                          | Non-modal `v-if` floating dialog surface with an existing entry recipe in `ghost-hover-card.css`.                                                                                          |
| Menus (deferred past `#417`)     | `GhostDropdownMenuContent`, `GhostContextMenuContent`, `Menubar` | **Deferred** until nested submenus (`#413`, `#418`, `#419`) land so `#417` avoids file conflicts and Menubar horizontal menu-switch handoff is designed against settled submenu semantics. |
| Listboxes (deferred past `#417`) | `GhostSelectContent`, `GhostComboboxContent`                     | **Deferred**: both keep DOM mounted with `hidden` while closed so options stay registered, and `GhostSelect` has parallel `0.2.0` work (`#415` / `#421`).                                  |
| Tooltip (deferred past `#417`)   | `GhostTooltipContent`                                            | **Deferred**: `ghost-tooltip.css` currently defines no entry transition; tooltip fade policy can opt in later without blocking modal/dialog overlays.                                      |
| Toast (out of scope)             | `GhostToastViewport` / `GhostToast`                              | **Out of scope**: keyed `v-for` stack requires list-item exit and layout reflow choreography rather than single-surface presence.                                                          |

Overlay host parts add **no required props** in `#417` (zero breaking or
ceremonial changes to consumer templates; see [P3](#resolved-decisions)
regarding omitted `forceMount`).

## State model

### Lifecycle stages and timing guarantees

`useGhostPresence` models three deterministic phases: `'closed'`, `'open'`, and
`'exiting'`. Every overlay subsystem binds strictly to either **logical open**
(`isOpen`) or **physical presence** (`isPresent`):

| Stage                             | `isOpen` | `phase`     | `isPresent` | Trigger `aria-expanded` / `data-state` | Surface `data-state` | Focus & `useFocusScope` (`trappedStack`)                      | `useDismissableLayer` (`layerStack`) | `useScrollLock` & `useInertOthers` (modal)   | Surface interactivity & AT exposure                                     | `useFloating` (`x`, `y`, `data-placement`)                   |
| --------------------------------- | -------- | ----------- | ----------- | -------------------------------------- | -------------------- | ------------------------------------------------------------- | ------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| **1. Closed**                     | `false`  | `'closed'`  | `false`     | `"false"` / `"closed"`                 | unmounted            | Inactive (0 listeners)                                        | Inactive (0 listeners)               | Inactive (`lockCount` = 0, no `inert`)       | Unmounted (not in DOM or portal)                                        | Inactive                                                     |
| **2. Opening (pre-positioned)**   | `true`   | `'open'`    | `true`      | `"true"` / `"open"`                    | `"open"`             | Waiting for portal tick / `isPositioned` / `focusReady`       | Active on `layerStack`               | Active immediately on modal open             | Mounted; floating hosts keep `visibility: hidden`                       | Computing initial coordinates                                |
| **3. Open (active)**              | `true`   | `'open'`    | `true`      | `"true"` / `"open"`                    | `"open"`             | Active; autofocused; trapped if `modal=true`                  | Active on `layerStack`               | Active (`overflow: hidden`, sibling `inert`) | Interactive; exposed in accessibility tree (`role="dialog"`)            | Active (`autoUpdate` running; `visibility: hidden` removed)  |
| **4. Logical close (`exiting`)**  | `false`  | `'exiting'` | `true`      | `"false"` / `"closed"` **immediately** | `"closed"`           | **Deactivated immediately**; trap released; focus restored    | **Removed immediately**              | **Released immediately**                     | **Non-interactive & hidden from AT** (`inert` + `pointer-events: none`) | **Retained** until unmount so surface never jumps to `(0,0)` |
| **5. DOM removal (exit settled)** | `false`  | `'closed'`  | `false`     | `"false"` / `"closed"`                 | unmounted            | Inactive (focus untouched — never re-restored on DOM removal) | Inactive                             | Inactive                                     | Unmounted from DOM and `GhostPortal`                                    | Cleaned up (`stopAutoUpdate`)                                |

Key invariants of Stage 4 (Logical close):

1. **Controlled state gate:** When `open` is controlled and the parent ignores
   `update:open(false)`, `context.isOpen.value` stays `true`. Logical close does
   not occur, `phase` remains `'open'`, `data-state` stays `'open'`, focus does
   not restore, and modal locks stay active.
2. **Synchronous phase transition before unmount:** On a mounted client, when
   `present` transitions `true -> false` (and `disabled` is `false`), a
   `flush: 'sync'` watcher flips `phase` from `'open'` to `'exiting'` before Vue
   re-evaluates the component render effect, keeping `isPresent.value === true`
   across the close render so the DOM node is retained without unmounting and
   remounting.
3. **Ordering of sibling `inert` release, focus restoration, and surface `inert`:**
   - First, `useInertOthers` clears `inert` from background siblings (including
     the trigger) and `useScrollLock` decrements `lockCount`.
   - Second, `useFocusScope` removes any modal entry from `trappedStack` and
     restores focus synchronously (to `returnFocus?.()` or the saved opener, unless
     suppressed by a non-modal outside click on a focusable control or `Tab`
     departure). Modal outside-pointer dismissal preserves the existing Chromium
     `mousedown` `preventDefault()` guard and WebKit next-task `<body>` focus
     reapply (`dialog-shared.ts`).
   - Third, the exiting surface (and any modal backdrop) receives `inert` and
     `pointer-events: none`. Because focus has already moved out of the overlay
     when `restoreFocus` applies (and blurs cleanly if `restoreFocus` was
     intentionally suppressed while focus sat inside), focus never remains trapped
     inside an exiting subtree, and a user who presses `Tab` mid-exit never has
     focus yanked back when Stage 5 removes the DOM node.

### Exit completion detection

After Vue flushes the close render (`data-state="closed"`, `flush: 'post'`):

1. **Immediate bailouts:** If `disabled` is `true`, no `HTMLElement` is resolved,
   `!element.isConnected`, or (for anchored floating hosts) the overlay closed
   before `isPositioned` ever resolved to `true` during that opening (meaning the
   surface was still `visibility: hidden`), `useGhostPresence` sets
   `phase = 'closed'` immediately in that post-flush callback.
2. **Web Animations inspection (primary browser path):** When
   `typeof element.getAnimations === 'function'` (Chromium, Firefox, WebKit):
   - Call `element.getAnimations()` **without** `{ subtree: true }`, collecting
     only animations and CSS transitions whose `effect.target` is `element` itself
     (descendant transitions such as button hovers or infinite `GhostSpinner`
     animations inside the slot are ignored).
   - Inspect `effect.getComputedTiming()` (falling back to `effect.getTiming()`
     in minimal synthetic mocks) and filter to animations that satisfy **all** of:
     - `playState` is `'pending'` or `'running'`;
     - `playbackRate !== 0` (paused or zero-rate animations cannot advance to a
       settled end state);
     - **finite end time:** `Number.isFinite(endTime)` and
       `iterations !== Infinity` (with finite `duration` when falling back to
       `getTiming()`). Persistent infinite animations on the registered surface
       itself (for example `animation: pulse 1s infinite`, where
       `iterations === Infinity` and `endTime === Infinity`) are explicitly
       excluded and never gate DOM removal;
     - **positive remaining time:** `remainingMs > 0` (and finite), where
       `remainingMs = endTime - (localTime ?? 0)` for `playbackRate > 0`,
       `remainingMs = localTime ?? 0` for `playbackRate < 0`, or
       `delay + duration * iterations > 0` when only `getTiming()` is exposed.
   - If the filtered list is empty (including when only an infinite animation is
     running on the surface), transition `phase = 'closed'` synchronously in the
     same post-flush callback (zero `requestAnimationFrame` or timer lag).
   - Otherwise, `await Promise.allSettled(animations.map((anim) => anim.finished))`
     so both normal finite completion (including finite multi-iteration
     animations such as `animation-iteration-count: 3`) and browser animation
     cancellation (`AbortError`, for example `display: none` on an ancestor or
     DevTools disabling animations) settle without stranding the node or floating
     `autoUpdate` resources. If an excluded infinite animation runs alongside a
     finite exit transition on the same element, only the finite transition
     enters `Promise.allSettled`. When all awaited animations settle, if the exit
     attempt ID is still current, set `phase = 'closed'` and invoke
     `onExitComplete?.()`.
3. **Computed-style + event fallback (environments without `getAnimations`, such
   as jsdom):**
   - Read `getComputedStyle(element)` for `transitionProperty`,
     `transitionDuration`, `transitionDelay`, `animationName`,
     `animationDuration`, `animationDelay`, and `animationIterationCount`.
   - Parse comma-separated CSS time lists (`ms` and `s`) and cycle shorter lists
     modulo their length per CSS Transitions and CSS Animations list-matching
     rules:
     - **Transitions:** Skip entries whose matched `transitionProperty` is
       `'none'`. For each remaining entry with `durationMs > 0`, compute
       `Math.max(0, delayMs + durationMs)`.
     - **Animations:** Skip entries whose matched `animationName` is `'none'` or
       `''`. Apply an explicit exclusion policy for infinite counts: any
       animation whose matched `animationIterationCount` is `'infinite'`
       (case-insensitive) is **excluded** from exit completion waiting (`0ms`
       contribution, consistent with the primary Web Animations path). For finite
       numeric iteration counts (`Number.isFinite(count) && count > 0`) and
       `durationMs > 0`, compute the active duration as `durationMs * count` and
       total completion time as `Math.max(0, delayMs + durationMs * count)` (for
       example `animation-duration: 100ms` with `animation-iteration-count: 3`
       contributes `300ms`). Non-positive or invalid iteration counts and
       `durationMs <= 0` contribute `0ms`.
     - Let `maxTotalMs` be the maximum across all included transitions and
       finite animations.
   - If `maxTotalMs <= 0` (including when only an `infinite` animation is
     present), set `phase = 'closed'` immediately.
   - Otherwise, listen for `transitionend`, `transitioncancel`, `animationend`,
     and `animationcancel` filtered strictly to `event.target === element`
     (ignoring `animationend` / `animationcancel` whose `event.animationName`
     matches only an excluded `infinite` animation), plus a safety timer of
     `Math.ceil(maxTotalMs) + 34` ms (for example `334ms` for a `100ms` × `3`
     exit animation) so synthetic DOM hosts that do not dispatch events
     automatically still converge without cutting off finite multi-iteration
     animations or leaking nodes.

### Reduced and absent motion

- **Absent motion (headless `@ghostvue/vue`, unstyled CSS, `transition: none`, or
  `--ghost-motion-intensity: 0`):** Computed transition and animation durations
  resolve to `0s` (`calc(<ms> * 0)` = `0ms`). Both `getAnimations()` and the
  `getComputedStyle` fallback observe zero active motion and set
  `phase = 'closed'` in the post-flush tick, unmounting the DOM node immediately.
- **Reduced motion (`@media (prefers-reduced-motion: reduce)`):** Per
  [Motion](../themes/motion.md), `@ghostvue/themes` collapses spatial travel
  (`translate: none` / `0px`, `scale: 1`) and runs a short opacity-only fade over
  `var(--ghost-motion-fade-duration)` (`80ms` at default intensity) with
  `var(--ghost-motion-easing-standard)` so the dismissal remains visually
  perceivable without vestibular motion. `useGhostPresence` does **not** hardcode
  a `matchMedia('(prefers-reduced-motion: reduce)')` bypass in JS: it follows the
  active CSS duration, so `@ghostvue/themes`'s `80ms` opacity fade runs to
  completion while a consumer stylesheet that sets `transition: none` under
  `prefers-reduced-motion: reduce` unmounts in `0ms`.

### Interrupted exits, rapid reopen, and stale completion events

`useGhostPresence` maintains a monotonically increasing integer `attemptId`:

- **Reopen during `'exiting'` (`present: false -> true`):**
  1. `attemptId` increments immediately, invalidating any in-flight `Promise`
     continuation, event listener, or fallback timer from the interrupted exit.
  2. Registered exit event listeners and fallback timers for the prior attempt
     are detached/cleared synchronously.
  3. `phase` flips immediately from `'exiting'` to `'open'` on the **same mounted
     DOM element** (`isPresent` stays `true` throughout — no DOM unmount/remount).
  4. `data-state` returns to `'open'`, library-applied `inert` and
     `pointer-events: none` are removed immediately, and browser CSS transitions
     smoothly reverse from the current mid-exit interpolated style back to the
     open resting values.
  5. Host composables (`useFocusScope`, `useDismissableLayer`, `useScrollLock`,
     `useInertOthers`) see `isOpen` flip `false -> true` and re-activate cleanly
     for the new opening (capturing the current active element as `openerAtOpen`,
     re-locking scroll and background `inert` for modals, and focusing inside the
     reopened overlay).
- **Stale completion events:** Any late `transitionend`, `animationend`,
  `transitioncancel`, `animationcancel`, fallback timer callback, or microtask
  resolution from an older `attemptId` checks
  `attemptId === activeAttemptId && phase.value === 'exiting'` before mutating
  state. When stale, it is a **no-op**: it never sets `phase = 'closed'`, never
  unmounts the reopened (or newly re-exiting) element, and never fires
  `onExitComplete`.

### Loading, empty, disabled, read-only, and error states

`GhostPresence` supports `disabled` (`UseGhostPresenceOptions.disabled`), which
forces immediate unmount on close without entering `'exiting'`. Trigger and close
button `disabled` states on overlay hosts remain owned by each host component.

### Async behavior

Exit waiting is asynchronous on the client when CSS motion has positive duration.
All async continuations (`Promise.allSettled` on `Animation.finished`, DOM event
listeners, and fallback timers) are guarded by `attemptId` and an `isUnmounted`
flag so out-of-order completions, rapid `open -> close -> open -> close` cycles,
and component teardown cannot corrupt state or touch disposed Vue scopes.

### Component and ancestor unmount

When the owning component (`GhostDialogContent`, `GhostPopoverContent`, or
`GhostPresence`) unmounts while `'open'` or `'exiting'` (for example because an
ancestor `v-if` or route view unmounted):

- `onUnmounted` increments `attemptId`, sets `isUnmounted = true`, removes any
  pending transition/animation listeners, and clears any fallback timer.
- `onExitComplete` / `exitComplete` is **not** called on owner unmount.
- `<GhostPortal>` (`<Teleport>`) removes the portaled DOM subtree immediately as
  part of Vue's normal unmount pass.
- `useScrollLock`, `useInertOthers`, `useDismissableLayer`, `useFocusScope`, and
  `useFloating` clean up via their existing `onUnmounted` hooks, leaving zero
  orphan DOM nodes, scroll locks, `inert` attributes, or `document` listeners.

## Consumer data

`GhostPresence` and `useGhostPresence` accept no domain collections, item arrays,
or value models, and never mutate consumer data objects. On the managed host
`HTMLElement`, DOM attribute writes during `'exiting'` are strictly scoped: if the
element already carried a consumer-authored `inert` attribute while `'open'`, that
attribute is preserved across reopen rather than stripped (matching the ownership
rule in `useInertOthers`). Consumer `class` and `style` bindings merge cleanly and
are never overwritten.

## Accessibility contract

### Semantics and relationships

- `GhostPresence` renders no wrapper element and adds no ARIA roles of its own.
- Overlay triggers (`GhostDialogTrigger`, `GhostPopoverTrigger`,
  `GhostDrawerTrigger`, `GhostHoverCardTrigger`) bind `aria-expanded` and
  `data-state` to **logical** `isOpen`, so `aria-expanded` switches to `"false"`
  the instant dismissal occurs rather than lagging behind a visual fade.
- Overlay content parts keep their semantic `id`, `role`, `aria-labelledby`, and
  `aria-describedby` attributes while mounted, but remove the exiting surface from
  the accessibility tree immediately at logical close via native HTML `inert`
  (below). Because reopening during `'exiting'` reuses the same mounted element,
  no duplicate `id` attributes ever coexist in the document.
- Development diagnostics (`GHOST002` missing accessible name, `GHOST003` missing
  alertdialog description) run only while logically `open`, never re-firing during
  `'exiting'`.

### Keyboard interaction

`GhostPresence` registers no keyboard handlers. In overlay hosts:

| Key                 | Stage               | Behavior                                                                                                                                      |
| ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Escape`            | `'open'`            | Dismisses the topmost open layer on `layerStack`, starts `'exiting'`, and restores focus immediately.                                         |
| `Escape`            | `'exiting'`         | Closing layer is already off `layerStack`; `Escape` immediately reaches the next open parent overlay beneath (or passes through to the page). |
| `Tab` / `Shift+Tab` | `'open'` (modal)    | Trapped within the modal surface by `useFocusScope`.                                                                                          |
| `Tab` / `Shift+Tab` | `'exiting'` (modal) | Trap is already released; `Tab` moves naturally from the restored trigger through normal page tab order without entering the exiting surface. |
| `Enter` / `Space`   | Restored trigger    | Immediately reopens the overlay (`'exiting' -> 'open'`) if pressed while the previous exit animation is still running.                        |

### Focus behavior

- **Immediate focus restoration on logical close:** `useFocusScope` deactivates
  when `isOpen` turns `false` (not when `isPresent` turns `false`). Focus returns
  synchronously to `returnFocus?.()` or the saved opener/trigger before the exit
  animation plays.
- **No double restoration at physical unmount:** When the exit animation later
  finishes and `isPresent` turns `false`, `useFocusScope` is already inactive, so
  removing the DOM node never moves `document.activeElement` a second time (even
  if the user has already tabbed or clicked elsewhere during the exit).
- **Non-modal outside focusable click:** Clicking an outside button or input while
  a `GhostPopover` or non-modal `GhostDialog` is open suppresses `restoreFocus`
  as today, keeps focus on the clicked control, and animates the popover closed
  without stealing focus.
- **Programmatic close with suppressed restoration:** If focus was inside an
  overlay when it closed programmatically with restoration suppressed, applying
  `inert` to the exiting surface blurs focus cleanly rather than leaving
  `activeElement` inside a disappearing subtree.

### Exiting interactivity and assistive-technology exposure

| Stage                        | Pointer / touch hit-testing                            | Keyboard / `.focus()` reachability | Assistive-technology tree exposure                                             |
| ---------------------------- | ------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------ |
| `'open'`                     | Interactive (`pointer-events` normal / `auto`)         | Focusable and tabbable per role    | Exposed (`role="dialog" \| "alertdialog"`, `aria-modal="true"` when modal)     |
| `'exiting'` (content)        | **Non-interactive** (`inert` + `pointer-events: none`) | **Unfocusable** (`inert`)          | **Pruned from accessibility tree** (`inert`; passes `axe` `aria-hidden-focus`) |
| `'exiting'` (modal backdrop) | **Pass-through** (`pointer-events: none`)              | Unfocusable (`aria-hidden="true"`) | Hidden (`aria-hidden="true"`, unchanged from `'open'`)                         |
| `'closed'`                   | Unmounted                                              | Unmounted                          | Unmounted                                                                      |

Why HTML `inert` + `pointer-events: none` instead of `aria-hidden="true"` alone:
placing `aria-hidden="true"` on an exiting dialog that still contains enabled
`<button>` or `<input>` descendants violates WCAG / `axe-core`'s
`aria-hidden-focus` rule because descendants remain programmatically/sequentially
focusable unless disabled or `inert`. Native `inert` simultaneously removes the
subtree from the accessibility tree, prevents all focus entry (also honored by
`getTabbableElements` in `packages/vue/src/get-tabbable-elements.ts`), and blocks
hit-testing, while explicit `pointer-events: none` guarantees clicks pass through
even when a component stylesheet sets `pointer-events: auto` (such as
`GhostHoverCardContent`) or in synthetic test environments.

## Rendering and customization

### Headless versus theme motion boundary

- **`@ghostvue/vue` (headless):**
  - Renders `data-state="open"` while logically open and `data-state="closed"`
    while `'exiting'`.
  - Applies `inert` and inline `pointer-events: none` while `'exiting'` so
    departing overlays never block pointer clicks on uncovered controls.
  - Retains floating inline styles (`position`, `left`, `top`) and
    `data-placement` on anchored surfaces (`GhostPopoverContent`,
    `GhostHoverCardContent`, `GhostDatePickerContent`) throughout `'exiting'`.
  - Ships **no** CSS transitions, keyframes, durations, or `@ghostvue/themes`
    imports.
- **`@ghostvue/themes` (optional styled layer):**
  - Owns all visual enter and exit transitions under `@layer ghostvue-theme`,
    parameterized exclusively by semantic `--ghost-motion-*` tokens from
    `packages/themes/tokens/semantic.json` (respecting `--ghost-motion-intensity`
    and `data-ghost-mode`).
  - **Base geometry selector rule:** Surface and backdrop layout, positioning,
    elevation, and `@media (forced-colors: active)` rules in `ghost-dialog.css`
    and `ghost-drawer.css` must match `.ghost-dialog-content`,
    `.ghost-dialog-overlay`, `.ghost-drawer-content`, and `.ghost-drawer-overlay`
    **without** requiring `[data-state='open']` (matching `ghost-popover.css` and
    `ghost-command-palette.css`), so flipping to `[data-state='closed']` never
    drops `position: fixed`, centering `transform`, edge offsets, or system-color
    paint mid-exit.

### `@ghostvue/themes` exit recipes

Under `@media (prefers-reduced-motion: no-preference)`, exits run faster than or
equal to enters using `--ghost-motion-exit-duration` (`120ms` scaled by
`--ghost-motion-intensity`) and `--ghost-motion-exit-easing`
(`cubic-bezier(0.3, 0, 1, 1)`):

| Surface / part                                                               | Entry (`[data-state='open']` + `@starting-style`)                                          | Exit (`[data-state='closed']`, `no-preference`)                                                                      | Reduced motion (`prefers-reduced-motion: reduce`, `[data-state='closed']`)                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GhostDialogOverlay`, `GhostDrawerOverlay`, `GhostCommandPaletteOverlay`     | `opacity: 0 -> 1` (`--ghost-motion-duration-fast` / `--ghost-motion-enter-duration`)       | `opacity: 0` over `var(--ghost-motion-exit-duration) var(--ghost-motion-exit-easing)`                                | `opacity: 0` over `var(--ghost-motion-fade-duration) var(--ghost-motion-easing-standard)`            |
| `GhostDialogContent` (and `GhostDatePickerContent` via `GhostDialogContent`) | `opacity: 0 -> 1`, `translate: 0 calc(var(--ghost-motion-translate) / 2) -> 0` (full-size) | `opacity: 0; translate: 0 calc(var(--ghost-motion-translate) / 2)` over `--ghost-motion-exit-duration` + exit easing | `opacity: 0; translate: none` over `--ghost-motion-fade-duration` + `--ghost-motion-easing-standard` |
| `GhostDrawerContent` (`start`, `end`, `top`, `bottom` × `ltr` / `rtl`)       | `opacity: 0 -> 1`, edge `translate` (`±100% 0` or `0 ±100%`) over `--ghost-motion-enter-*` | `opacity: 0` + matching physical edge `translate` (`±100% 0` or `0 ±100%`) over `--ghost-motion-exit-*` (see P6)     | `opacity: 0; translate: none` over `--ghost-motion-fade-duration` + `--ghost-motion-easing-standard` |
| `GhostPopoverContent`, `GhostHoverCardContent`, `GhostCommandPaletteContent` | `opacity: 0 -> 1`, `scale: 0.98 -> 1` over `--ghost-motion-duration-fast` + enter easing   | `opacity: 0; scale: 0.98` over `var(--ghost-motion-exit-duration) var(--ghost-motion-exit-easing)`                   | `opacity: 0; scale: 1` over `--ghost-motion-fade-duration` + `--ghost-motion-easing-standard`        |

All recipes keep zero hardcoded color, pixel, rem, or millisecond/second literals
so `tests/integration/ghost-*-theme-css.test.ts` token checks continue to pass.

## Environment behavior

### Portals

- Overlay parts keep `<GhostPortal :to="portalTo" :disabled="!portal">` unchanged
  across `'open'` and `'exiting'`; `v-if="presence.isPresent.value"` sits on the
  inner surface element.
- Exiting content therefore **stays inside `portalTo`** (`document.body` by
  default) until `isPresent` turns `false`. It never teleports back inline on
  logical close, which would clip fixed/floating geometry inside `overflow`
  ancestors and cancel active CSS transitions due to DOM reparenting.
- If `portal` or `portalTo` is dynamically changed by the consumer during
  `'exiting'`, DOM reparenting cancels running CSS transitions
  (`transitioncancel` / rejected `Animation.finished`), which `useGhostPresence`
  treats as settled and unmounts cleanly.

### SSR and hydration

- `useGhostPresence` touches zero browser globals (`window`, `document`,
  `HTMLElement`, `getComputedStyle`) during `setup`.
- Closed overlays (`defaultOpen: false`) have `isPresent.value === false` on the
  server and first client render, emitting the exact trigger-only SSR HTML tested
  in `packages/vue/src/overlay-ssr.test.ts`.
- Initially open overlays (`defaultOpen: true`) have `isPresent.value === true`,
  `data-state="open"`, and no `inert` on both server and initial client hydration
  pass (rendered inline until `GhostPortal`'s `onMounted` moves them to
  `portalTo`), producing zero hydration mismatches (`expectSsrHydration`).
- Any `present: true -> false` mutation before `onMounted` transitions directly to
  `'closed'` without entering `'exiting'`.

### Mobile and touch

- Outside `pointerdown` dismissal on touch/pen releases the modal scrim's pointer
  interception (`pointer-events: none`) synchronously on logical close, so touch
  scrolling (`useScrollLock` unlocked) and follow-up taps on underlying controls
  work immediately without waiting for the scrim fade.
- Dynamic viewport units (`dvh` / `dvw`) on `GhostDialogContent` and
  `GhostDrawerContent` remain intact during `'exiting'`.

## Performance

- **Closed cost is zero:** When `phase === 'closed'`, overlays remain unmounted
  via `v-if` with zero DOM nodes, zero `ResizeObserver` / `autoUpdate` instances,
  and zero `document` listeners.
- **Constant-time state machine:** One `shallowRef` phase, one integer generation
  counter, and zero `MutationObserver` or `requestAnimationFrame` polling loops.
- **Subtree-isolated animation lookup:** `element.getAnimations()` without
  `{ subtree: true }` inspects only the single overlay surface element (O(animations
  on surface), typically 1–2 properties), avoiding O(subtree) walks over large
  dialog forms or tables.
- **Bundle budget:** `useGhostPresence` + `GhostPresence` is ~1–1.5 kB minified
  (~0.6 kB gzip) with zero external dependencies; checked by `pnpm size`.

## Composition

- **`useGhostPresence` / `GhostPresence`:** New low-level presence primitive in
  `@ghostvue/vue`.
- **`dialog-shared.ts` (`useDialogContentPart` and `useDialogOverlayPart`):**
  Integrates `useGhostPresence` once for `GhostDialog`, `GhostDrawer`, and
  `GhostCommandPalette` (and `GhostDatePickerContent` via `GhostDialogContent`).
  Separates `presentElement` (live while `isPresent` is `true`, used for DOM ref
  resolution) from active open gating (`context.isOpen.value`, used by
  `useScrollLock`, `useInertOthers`, `useDismissableLayer`, `useFocusScope`, and
  `GHOST002`/`GHOST003` diagnostics).
- **Floating hosts (`GhostPopoverContent`, `GhostHoverCardContent`,
  `GhostDatePickerContent`):** Pass `presentElement` to `useFloating` so resolved
  coordinates and `data-placement` persist throughout `'exiting'`, while passing
  the open-gated element (`isOpen ? presentElement : null`) to
  `useDismissableLayer` and `useFocusScope`. Skip exit retention (`disabled: () => !wasPositioned`)
  if closed before initial `isPositioned` resolved.
- No duplicate focus-trap, layer-stack, scroll-lock, or portal code is introduced.

## Test plan

### Browser test matrix (modal `GhostDialog` and non-modal `GhostPopover`)

Playwright specs (`tests/e2e/presence.spec.ts`, plus updates to
`tests/e2e/dialog.spec.ts` and `tests/e2e/popover.spec.ts`) use real keyboard/pointer
events, `toBeFocused()`, computed style / `getAnimations()` checks, and explicit
controllable CSS transition durations (for example `250ms` in deterministic race
fixtures alongside real `@ghostvue/themes` recipes):

| #   | Scenario                                          | Modal host (`GhostDialog`, `modal=true`) observable assertions                                                                                                                                                                                               | Non-modal host (`GhostPopover`) observable assertions                                                                                                                                                                             | Engine coverage  |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | Logical close via `Escape` (mid-exit)             | Within 1 frame of `Escape`: trigger `aria-expanded="false"`, content & overlay still in DOM inside `body` with `data-state="closed"`, content has `inert`, trigger `toBeFocused()`, `body` scroll unlocked, page siblings not `inert`.                       | Within 1 frame of `Escape`: trigger `aria-expanded="false"`, content still in `body` with `data-state="closed"`, `data-placement` intact, non-`(0,0)` `left`/`top` retained, content has `inert`, trigger `toBeFocused()`.        | `@cross-browser` |
| 2   | Pass-through interaction mid-exit                 | While content & scrim are mid-fade (`opacity > 0`), clicking an uncovered page `<button>` increments its click counter on the first click; pressing `Tab` moves from trigger to that button without focus trap recovery.                                     | While popover is mid-fade over an underlying `<button>`, clicking at the popover's bounding box coordinates activates the underlying `<button>` (`pointer-events: none`) and does not focus the exiting popover.                  | `chromium-e2e`   |
| 3   | Physical DOM removal after exit settles           | After transition finishes: `.ghost-dialog-content` and `.ghost-dialog-overlay` have count `0` in DOM; focus remains on the control focused during/after close (never yanked back to trigger on unmount).                                                     | After transition finishes: `.ghost-popover-content` has count `0` in DOM; `autoUpdate` listeners detached; focus unchanged from where the user moved it during exit.                                                              | `@cross-browser` |
| 4   | Outside pointer dismissal                         | Clicking `.ghost-dialog-overlay` starts exit (`data-state="closed"`), restores trigger focus (including WebKit press completion without dropping to `<body>`), and unmounts both overlay and content after fade.                                             | Clicking an outside `<button>` starts popover exit (`data-state="closed"`), leaves focus on the clicked `<button>` (`toBeFocused()`), and unmounts content after fade without pulling focus to trigger.                           | `@cross-browser` |
| 5   | Nested layers (`Popover` inside `Dialog`)         | Open Dialog -> open portaled Popover inside -> first `Escape` immediately starts Popover exit & restores focus to Popover trigger inside Dialog; second immediate `Escape` (while Popover still exiting) starts Dialog exit & restores Dialog trigger focus. | Popover exits independently without blocking the enclosing Dialog's `Escape` dismissal or wedging `trappedStack` / `layerStack`.                                                                                                  | `@cross-browser` |
| 6   | Reduced motion (`prefers-reduced-motion`)         | Under `emulateMedia({ reducedMotion: 'reduce' })`: computed `translate` is `none` throughout exit, `opacity` fades over `--ghost-motion-fade-duration` (`80ms`), then unmounts cleanly.                                                                      | Under `reducedMotion: 'reduce'`: computed `scale` is `1` (no scale travel), `opacity` fades over `80ms`, then unmounts cleanly.                                                                                                   | `chromium-e2e`   |
| 7   | Absent motion (`0ms` / headless / `intensity: 0`) | Headless Dialog without theme CSS (and themed Dialog under `--ghost-motion-intensity: 0`) unmounts content & overlay in the close frame with zero lingering `[data-state="closed"]` node.                                                                    | Headless Popover without theme CSS (and themed Popover under `--ghost-motion-intensity: 0`) unmounts immediately on close.                                                                                                        | `chromium-e2e`   |
| 8   | Interrupted exit & rapid reopen                   | Close (`Escape`) -> mid-exit reopen (`Enter` on trigger): same DOM node (`data-instance-id` / WeakRef preserved) flips back to `data-state="open"`, removes `inert`, re-locks scroll, re-traps `Tab`, and focuses inside Dialog.                             | Close (`Escape`) -> mid-exit click trigger: same DOM node flips to `data-state="open"`, removes `inert`, restores `pointer-events`, keeps `data-placement`, and moves focus back inside Popover.                                  | `@cross-browser` |
| 9   | Stale completion event after reopen               | See exact observable contract below — reopened modal stays mounted, visible, focused, trapped, and scroll-locked after the interrupted exit's duration elapses and after a synthetic `transitionend`.                                                        | See exact observable contract below — reopened popover stays mounted, visible, positioned, and interactive after the interrupted exit's duration elapses and after a synthetic `transitionend`.                                   | `chromium-e2e`   |
| 10  | Inline mode (`portal=false`) & owner unmount      | With `:portal="false"`, exiting Dialog animates in-place and unmounts; unmounting parent wrapper mid-exit immediately removes portaled DOM, releases scroll lock, and clears background `inert`.                                                             | With `:portal="false"`, exiting Popover animates in-place; unmounting parent wrapper mid-exit removes portaled DOM immediately with zero console errors.                                                                          | `chromium-e2e`   |
| 11  | Automated accessibility (`axe`)                   | `@axe-core/playwright` reports zero violations when open, **while mid-exit (`data-state="closed"`, `inert`)**, and after unmount.                                                                                                                            | `@axe-core/playwright` reports zero violations when open, **while mid-exit (`data-state="closed"`, `inert`)**, and after unmount.                                                                                                 | `chromium-e2e`   |
| 12  | Surface infinite & repeat animations              | Dialog surface with `animation: pulse 1s infinite` unmounts immediately on close (or after its finite exit transition when paired) without hanging; finite `animation: exit-fade 100ms 3` stays mounted for ~300ms then unmounts cleanly.                    | Popover surface with `animation: pulse 1s infinite` unmounts cleanly and detaches `autoUpdate` resources without hanging indefinitely; finite `100ms` × `3` exit animation stays mounted through all 3 iterations before removal. | `chromium-e2e`   |

### Observable result when a stale completion event arrives after reopen

Test setup (executed for both modal `GhostDialog` and non-modal `GhostPopover` on
a `300ms` CSS exit transition):

1. Open the overlay (`t = 0ms`) and confirm focus is inside content.
2. Dismiss with `Escape` (`t = 10ms`) and confirm `data-state="closed"`,
   `inert` is present on content, and trigger is focused (`toBeFocused()`).
3. Reopen before exit finishes (`t = 70ms`) via trigger activation, then both
   dispatch a synthetic `new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true })`
   on the content element **and** wait `350ms` (past the original `310ms` exit
   deadline and past the reverse-open transition completion).

Required observable result at `t = 420ms`:

- **DOM & portal:** Content (and `GhostDialogOverlay` for modal Dialog) remains
  connected inside `document.body` (`toBeVisible()`), with the **exact same DOM
  element identity** as before close, `data-state="open"`, no `inert` attribute,
  and normal `pointer-events`.
- **Trigger & ARIA:** Trigger reports `aria-expanded="true"` and
  `data-state="open"`.
- **Focus & dismissal:** Focus remains inside the overlay (`toBeFocused()` on the
  initial focus target); `Tab` stays trapped inside `GhostDialog`; pressing
  `Escape` once cleanly dismisses the overlay on the first press.
- **Modal isolation (`GhostDialog`):** Viewport scroll remains locked and
  background siblings remain `inert`.
- **Events:** No extra `update:open(false)` or `exitComplete` event was emitted
  during or after the stale completion window.

### Unit, SSR, theme CSS, and type tests

- **Composable unit tests (`packages/vue/src/use-ghost-presence.test.ts`):**
  `closed -> open -> exiting -> closed` transitions; `getAnimations()` path
  (multiple animations on element, finite multi-iteration animations such as
  `iterations: 3`, cancelled `AbortError`, ignoring descendant `GhostSpinner`
  animations, excluding `iterations: Infinity` / non-finite `endTime` /
  `playbackRate: 0` animations on the surface itself both alone and alongside a
  finite exit transition); `getComputedStyle` + `transitionend` /
  `animationend` / `transitioncancel` fallback path (including finite
  `animationIterationCount` scaling such as `100ms` × `3` -> `300ms` max and
  `334ms` safety deadline, list cycling across comma-separated CSS properties,
  and excluding `animation-iteration-count: infinite` from deadline calculation
  and completion events); `0ms` immediate unmount; `disabled: true`;
  `attemptId` guard across `open -> close -> reopen` and
  `open -> close -> reopen -> close`; owner unmount mid-exit suppressing
  `onExitComplete`.
- **Component & host tests (`packages/vue/src/GhostPresence.test.ts`,
  `GhostDialog.test.ts`, `GhostPopover.test.ts`, `GhostDrawer.test.ts`,
  `GhostCommandPalette.test.ts`, `GhostDatePicker.test.ts`,
  `GhostHoverCard.test.ts`):** single-child `cloneVNode` ref merging, consumer
  `inert` preservation, controlled `open` ignoring `update:open(false)` (never
  entering `'exiting'`), unpositioned floating close fast-path, and dev warning
  when `GhostPresence` wraps a multi-root fragment without `setElement`.
- **SSR & hydration (`packages/vue/src/overlay-ssr.test.ts`,
  `tests/integration/ssr-hydration.test.ts`):** Node SSR without `window` or
  `document` for `GhostPresence` and updated hosts (`defaultOpen: false` and
  `defaultOpen: true`), plus `expectSsrHydration` parity.
- **Theme CSS integration (`tests/integration/ghost-dialog-theme-css.test.ts` and
  peer overlay CSS tests):** update `ghost-dialog-theme-css.test.ts` (which
  previously asserted `not.toMatch(/\[data-state='closed'\]/)`) to verify
  token-only `[data-state='closed']` exit rules, base geometry selectors decoupled
  from `[data-state='open']`, `prefers-reduced-motion: reduce` collapsing spatial
  transforms to `none` / `1`, and zero hardcoded color/length/duration literals.
- **Compile-time type tests (`packages/vue/type-tests/`):** positive and
  `// @ts-expect-error` fixtures for `GhostPresence` props/emits/slot props and
  `useGhostPresence` options/return types.

## Documentation plan

When [#417](https://github.com/zprue743/ghostvue/issues/417) implements the
approved contract:

- Add `docs/components/presence.md` with generated API tables
  (`pnpm manifests:write` + `pnpm docs:api:write` for `ghost-presence.manifest.json`),
  headless CSS exit examples, `GhostPortal` composition, and accessibility timing
  notes.
- Add executable examples under `examples/presence/` (`basic.vue`, `portal.vue`)
  and update `docs/themes/motion.md` ("Overlay entry" -> "Overlay entry and exit")
  to document the symmetric `[data-state='closed']` exit recipes.
- Update `Non-goals` and `State model` prose in `/specs/dialog`, `/specs/popover`,
  `/specs/drawer`, `/specs/hover-card`, and `/specs/command-palette` to reflect
  `useGhostPresence` retention during exit.
- Register `presence.registry.json` (`pnpm registries:write`) and playground
  motion/overlay exit exercises.

## Compatibility and release impact

- **Target release:** `0.2.0` (`minor` Changeset for `@ghostvue/vue` and
  `@ghostvue/themes` in `#417`; this specification PR is docs-only and adds no
  Changeset).
- **Backwards compatibility:**
  - **Headless (`@ghostvue/vue`):** Consumers with no `[data-state='closed']` CSS
    transitions/animations observe `0ms` computed duration and unmount in the
    post-close flush, preserving existing behavior and tests that `await nextTick()`
    on unstyled components. Consumers who already wrote `[data-state='closed']`
    transitions now see them play before unmount while focus, Escape, `inert`, and
    scroll lock still release immediately on logical close.
  - **Themed (`@ghostvue/themes`):** Adopted overlay hosts gain `120ms` (`80ms`
    under reduced motion) exit transitions on close. Existing Playwright tests on
    themed overlays that assert DOM count `0` immediately after close will wait
    for unmount (`toBeHidden()` / `toHaveCount(0)` auto-retry) or run with
    Playwright `animations: 'disabled'` (already used by `@visual` suites).
  - **Existing `data-state` hook:** `GhostDialogContent`, `GhostDialogOverlay`,
    `GhostDrawerContent`, and `GhostDrawerOverlay` previously hardcoded
    `data-state="open"` while mounted because unmount was synchronous; emitting
    `data-state="closed"` during `'exiting'` completes the documented
    `open | closed` state contract.

## Resolved decisions

Zac authorized design sign-off on **P1–P6 as proposed** at commit
`225f9fe09b1bbab8c03d88138c80ebdb171b6e01` (recorded in PR #488 on 2026-11-28).
[#417](https://github.com/zprue743/ghostvue/issues/417) remains blocked until the
revised PR #488 merges to `master`:

1. **P1 — Public primitive surface and naming:** Export both `GhostPresence` and
   `useGhostPresence` from `@ghostvue/vue` (matching
   [ADR 0003](../adr/0003-public-component-api-conventions.md)'s
   `Ghost*` / `useGhost*` pair), with the minimal `{ present, disabled }`
   props/options surface and no imperative JS leave hook props. _Approved by Zac
   as proposed at `225f9fe0` (PR #488, 2026-11-28)._
2. **P2 — First-release host scope for `#417`:** Ship `GhostPresence` +
   `useGhostPresence`, the shared `dialog-shared.ts` family (`GhostDialog`,
   `GhostDrawer`, `GhostCommandPalette`, plus `GhostDatePickerContent`
   coordinate retention), `GhostPopover`, and `GhostHoverCard` together in
   `#417`; defer menus (`DropdownMenu`, `ContextMenu`, `Menubar`) until
   `#418`/`#419` settle and defer persistent-DOM listboxes (`Select`, `Combobox`)
   until `#421` settles. _Approved by Zac as proposed at `225f9fe0` (PR #488,
   2026-11-28)._
3. **P3 — `forceMount` prop on overlay content parts:** Omit `forceMount` from
   `GhostDialogContent` / `GhostPopoverContent` in `0.2.0` because built-in
   `useGhostPresence` handles CSS transitions and animations automatically
   without extra props, keeping the public surface smaller. _Approved by Zac as
   proposed at `225f9fe0` (PR #488, 2026-11-28)._
4. **P4 — Exiting surface isolation mechanism:** Apply native HTML `inert`
   (preserving consumer-owned `inert` if already set) plus inline
   `pointer-events: none` on exiting content and `pointer-events: none` on
   exiting modal backdrops, after `useFocusScope` restores focus synchronously
   at logical close. _Approved by Zac as proposed at `225f9fe0` (PR #488,
   2026-11-28)._
5. **P5 — Floating positioning during exit:** Keep `useFloating` bound to the
   mounted element until physical unmount (`isPresent === false`) so anchored
   overlays keep their coordinates, `data-placement`, and scroll tracking
   during the `120ms` fade, while fast-pathing to immediate unmount if closed
   before initial `isPositioned` resolved. _Approved by Zac as proposed at
   `225f9fe0` (PR #488, 2026-11-28)._
6. **P6 — `GhostDrawerContent` exit duration token:** Use
   `var(--ghost-motion-exit-duration)` (`120ms` with accelerate easing) across
   all overlays per [Motion](../themes/motion.md)'s "exits run faster than
   enters" rule (`250ms` enter -> `120ms` exit). _Approved by Zac as proposed at
   `225f9fe0` (PR #488, 2026-11-28)._
