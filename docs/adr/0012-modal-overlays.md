# ADR 0012: Modal overlays

- Status: accepted
- Date: 2026-11-13
- Decision owners: repository maintainers
- Relates to: [ADR 0003](./0003-public-component-api-conventions.md) (naming),
  [ADR 0011](./0011-overlay-primitives.md) (overlay primitives),
  [focus.md](../architecture/focus.md) (`useFocusScope`)

## Context

Upcoming modal overlay components (`GhostDialog`, `GhostAlertDialog`,
`GhostDrawer`, `GhostCommandPalette`) build on top of the overlay primitives
from [ADR 0011](./0011-overlay-primitives.md) (`GhostPortal`,
`useDismissableLayer`) and `useFocusScope`, and introduce three additional
modal-specific requirements:

1. **Scroll locking:** preventing the underlying document from scrolling while a
   modal is open, without causing horizontal layout shift when classic
   scrollbars disappear, and nesting safely when one modal opens over another.
2. **Background isolation:** ensuring everything outside the active modal cannot
   be reached by pointer, keyboard navigation, find-in-page, or assistive
   technology while still keeping live notification regions interactive and
   announced.
3. **Nested layer focus coordination:** allowing a non-modal dismissable layer
   (such as a `GhostPopover`, `GhostSelect`, or `GhostDropdownMenu` portaled to
   `document.body`) opened _inside_ a modal to accept `Tab` navigation without
   the outer modal's trapped `useFocusScope` yanking focus back.

Per [ADR 0011](./0011-overlay-primitives.md), headless modal primitives stay in
`@ghostvue/vue` without importing `@ghostvue/themes` or adding external runtime
dependencies. In this first slice (PR 1), the primitives remain internal to
`@ghostvue/vue` until `GhostDialog` (PR 2) validates the public modal contract.

## Decision

### 1. Background isolation: `inert` on siblings (`useInertOthers`) plus `aria-modal="true"`

Modal overlays mark their content surface with `aria-modal="true"` **and** apply
the HTML `inert` attribute to background siblings through `useInertOthers`:

- `useInertOthers(elements, enabled)` walks from each kept element up to
  `document.body` and sets `inert` on every sibling that does not contain a
  kept element.
- **Ref-counted per element:** a module-level `WeakMap<Element, number>` tracks
  only `inert` attributes added by `useInertOthers`. Elements that were already
  `inert` before activation are never adopted or cleared. Nested modals keep
  shared background subtrees `inert` until the final modal closes.
- **No `MutationObserver` on late nodes:** nodes appended to `document.body`
  after activation (such as a portaled `GhostPopover` opened from inside the
  modal) are left untouched so child overlays remain interactive.
- **`[data-ghost-live]` exclusion:** `useInertOthers` skips any sibling carrying
  `[data-ghost-live]` so live regions, screen-reader announcers, and toast
  containers remain perceivable and interactive while a modal is open.
- **SSR-safe cleanup:** all DOM traversal runs after `onMounted` and restores
  every `inert` attribute it added on disable or unmount.

#### Why `inert` on siblings plus `aria-modal="true"` instead of `aria-modal` alone

`aria-modal="true"` alone communicates modality to supporting screen readers,
but browser and assistive-technology compliance remains uneven across AT/browser
pairings, and `aria-modal` does not stop pointer clicks, touch exploration,
scroll-into-view focus, or browser-chrome Tab entry into background DOM nodes.
Pairing `aria-modal="true"` (semantic role contract) with `inert` on siblings
(platform enforcement of hit-testing, focusability, selection, and accessibility
tree removal) gives consistent isolation without `aria-hidden="true"` hazards on
focusable elements.

### 2. Scroll lock (`useScrollLock`)

- `useScrollLock(enabled)` sets `overflow: hidden` on `document.body` while
  enabled and restores the original inline `overflow` and `padding-right`
  styles (including `!important` priority and omitting an empty `style`
  attribute if none existed) only when a module-level reference count drops back
  to `0`.
- **Scrollbar compensation:** when `window.innerWidth - documentElement.clientWidth > 0`,
  `useScrollLock` adds that scrollbar width to `body`'s computed `padding-right`
  so fixed/centered content does not shift horizontally.
- **`scrollbar-gutter: stable` skip:** when `document.documentElement` resolves
  `scrollbar-gutter` containing `stable`, space is already reserved by the
  browser, so `padding-right` compensation is skipped to avoid double padding.
- **SSR-safe:** defers all `window` and `document` reads/writes until
  `onMounted` and releases on disable or unmount.

### 3. Nested trap and dismissable layer rules

- **Trapped focus ownership:** per [focus.md](../architecture/focus.md), only the
  innermost currently trapped `useFocusScope` owns `Tab`. Untrapped scopes do
  not steal trap ownership from an ancestor modal.
- **Dismissable layer ownership:** per [ADR 0011](./0011-overlay-primitives.md),
  only the topmost `useDismissableLayer` handles `Escape` and outside
  `pointerdown`.
- **Upper dismissable layer `Tab` rule:** `useDismissableLayer` and
  `useFocusScope` share an internal layer stack (`dismissable-layer-stack.ts`).
  When a trapped `useFocusScope` observes `Tab`, it checks whether
  `document.activeElement` sits inside a dismissable layer stacked _above_ the
  scope's own layer. If so, the trapped scope ignores `Tab` so focus moves
  naturally inside a portaled popover or menu opened from within the modal,
  while still pulling focus back from any layer stacked _below_ the scope.

### 4. Why not native `<dialog>` / `showModal()`

GhostVue builds modals from `GhostPortal`, `useDismissableLayer`,
`useFocusScope`, `useScrollLock`, and `useInertOthers` rather than wrapping
`<dialog>.showModal()`:

1. **Unified overlay stacking:** `showModal()` promotes `<dialog>` into the
   browser top layer, which paints and stacks separately from `GhostPortal`
   overlays portaled into `document.body`. A non-modal `GhostPopover`,
   `GhostSelect`, or `GhostDropdownMenu` portaled to `body` would render
   _behind_ a top-layer `<dialog>` unless every overlay switched to Popover API
   top-layer promotion and manual z-order re-promotion.
2. **Unified dismissal policy:** `showModal()` intercepts `Escape` through the
   native `cancel` event with browser-specific quirks (such as immediate close
   without full `useDismissableLayer` stack coordination across IME
   composition or nested non-dialog layers).
3. **Predictable SSR and transitions:** `<dialog open>` renders non-modally on
   the server and cannot smoothly hydrate into `showModal()` without visual and
   backdrop jumps, and exit animations on top-layer `<dialog>` require
   `@starting-style` / `allow-discrete` workarounds before `.close()`.
4. **Consistent focus policies:** `showModal()` enforces browser-specific
   initial focus and restore behavior that diverges from `useFocusScope`'s
   `data-autofocus`, `autoFocus`, `restoreFocus`, and nested-trap rules.

## Alternatives considered

**`aria-modal="true"` without `inert` on siblings.** Rejected. Leaves
background controls reachable via pointer, programmatic/browser-chrome focus,
and older or mobile screen readers that do not fully prune background subtrees
from `aria-modal` alone.

**Native `<dialog>` with `showModal()`.** Rejected for the stacking, dismissal,
SSR hydration, transition, and focus-policy reasons above. Revisit only if all
floating GhostVue overlays move to top-layer `popover` promotion and browser
top-layer exit transition support becomes uniform across targets.

**Exporting `useScrollLock` and `useInertOthers` immediately.** Rejected for PR 1.
Keeping both primitives internal until `GhostDialog` lands avoids locking in
low-level signatures before the first consumer component exercises them.

## Consequences

- `@ghostvue/vue` gains internal `use-scroll-lock.ts`, `use-inert-others.ts`,
  and shared `dismissable-layer-stack.ts`.
- `useFocusScope` and `useDismissableLayer` coordinate `Tab` across portaled
  child layers without changing any public API.
- `GhostDialog` (PR 2) will compose these primitives with `GhostPortal` and
  `aria-modal="true"`.

## Compatibility implications

None for public APIs: no new exports, manifests, or runtime dependencies are
added in PR 1. SSR renders remain pure with zero `window`/`document` access
during setup. Like `layerStack` and `trappedStack`, scroll-lock and inert
ref-counting assume a single runtime copy of `@ghostvue/vue` per document.
