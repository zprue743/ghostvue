---
schemaVersion: 1.0.0
component: GhostScrollSpy
components:
  - GhostScrollSpy
  - GhostScrollSpyList
  - GhostScrollSpyItem
  - GhostScrollSpyLink
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: approved
approval:
  evidence: 'Approved by Zac (admin) on 2026-11-26 for issue #339 / PR #361 open questions (Tab-per-link, optional container, SSR first item, lazy tabindex, vertical RTL logical CSS).'
manifests:
  - packages/vue/manifests/ghost-scroll-spy.manifest.json
  - packages/vue/manifests/ghost-scroll-spy-list.manifest.json
  - packages/vue/manifests/ghost-scroll-spy-item.manifest.json
  - packages/vue/manifests/ghost-scroll-spy-link.manifest.json
  - packages/themes/manifests/ghost-scroll-spy.manifest.json
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
unresolvedQuestions:
  - question: 'Keyboard focus model: Tab-per-link vs roving focus (useRovingFocus) inside GhostScrollSpyList.'
    blocking: false
    reviewer: Zac
  - question: 'RTL support: vertical-only logical positioning vs horizontal scrollLeft normalization and arrow-key direction.'
    blocking: false
    reviewer: Zac
  - question: 'Scroll container scope: window-only in v1 vs optional HTMLElement container prop with container-scoped scrolling.'
    blocking: false
    reviewer: Zac
  - question: 'SSR active item before client measurement: first item active by default vs undefined unless defaultValue/modelValue is supplied.'
    blocking: false
    reviewer: Zac
  - question: 'Target focusability on activation: require consumer tabindex="-1" on sections or apply tabindex="-1" lazily when unfocusable.'
    blocking: false
    reviewer: Zac
---

# GhostScrollSpy specification

**Status:** Approved for [Issue #339](https://github.com/zprue743/ghostvue/issues/339)
(admin sign-off 2026-11-26). Implementation follows the recommended defaults for
the open architectural questions below unless noted in the PR.

**Related:** [GhostLink specification](/specs/link),
[GhostBreadcrumb specification](/specs/breadcrumb),
[GhostScrollArea specification](/specs/scroll-area),
[accessibility standard](../standards/accessibility.md), and
[styling architecture](../architecture/styling.md).

## Purpose and user problems

`GhostScrollSpy` is a headless section-navigation primitive (`@ghostvue/vue`)
with an optional styled wrapper (`@ghostvue/themes`) that keeps an in-page
table of contents or section rail synchronized with scroll position:

- Renders semantic landmark navigation (`<nav>` → `<ol>` → `<li>` → `<a href="#...">`)
  built on `GhostLink`, so every section remains reachable as an ordinary
  fragment link even without JavaScript.
- Observes scroll position passively (read-only) to determine which target
  section is currently active and expose `aria-current="location"` on the
  matching link.
- Exposes overall scroll progress and interpolated inter-item progress as CSS
  custom properties (plus travel direction as a `data-travel` hook) so rails,
  progress bars, and indicators can animate with zero per-frame Vue re-renders.
- Handles plain primary activation (click or `Enter`) by scrolling smoothly to
  the target (honoring `prefers-reduced-motion: reduce`), updating the URL hash
  without burying browser history, and moving focus to the target so subsequent
  `Tab` presses continue inside that section.

The immediate in-repo consumer is the docs home page section rail
(`apps/docs/.vitepress/theme/LandingSectionRail.vue` and `landing-motion.ts`),
which will migrate onto `GhostScrollSpy` once approved and implemented.

## Non-goals

- **Scroll-jacking or scroll-snapping:** `GhostScrollSpy` never intercepts wheel,
  touch, or keyboard scrolling (`preventDefault()` is never called on scroll
  events) and never forces scroll-snap alignment.
- **Section reveal animations:** Intro/outro animations on page sections
  (such as `landing-page.css` scroll-driven timelines and `IntersectionObserver`
  section phases) stay owned by the consumer page, not `GhostScrollSpy`.
- **Client-side routing / multi-page TOCs:** Only same-document fragment targets
  (`#<id>`) are tracked; route matching across pages belongs to the app router
  or `GhostBreadcrumb`.
- **Automatic heading discovery:** `GhostScrollSpy` does not scan the DOM for
  `h2`/`h3` headings or generate labels; consumers declare the tracked items.
- **Nested tree expansion or collapsible sub-TOCs:** Flat ordered section lists
  are in scope; hierarchical expandable outlines belong to `GhostTree` or
  consumer composition.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostScrollSpy` — Root navigation landmark (`as="nav"` default), scroll
  measurement coordinator, CSS progress variable host, and context provider.
- `GhostScrollSpyList` — Ordered list container (`as="ol"` default).
- `GhostScrollSpyItem` — List item wrapper (`as="li"` default).
- `GhostScrollSpyLink` — Section link (`as="a"` default, built on `GhostLink`)
  registering its target ID, exposing `aria-current="location"` and
  `data-state="active"` when current, and performing reduced-motion-aware
  scroll + focus transfer on plain activation.
- `useGhostScrollSpy` — Headless composable owning target registration, passive
  scroll/resize observation, pure position resolution, CSS progress updates, and
  `scrollTo(targetId)` navigation. Can be used standalone (for custom layouts
  or non-compound lists) or behind `GhostScrollSpy`.
- Pure framework-neutral helpers (generalized from `landing-motion.ts`):
  `resolveScrollSpyActiveIndex`, `resolveScrollSpyProgress`,
  `resolveScrollSpySegmentProgress`, `resolveScrollSpyTravelDirection`.
- Context key & types: `ghostScrollSpyContextKey`, `GhostScrollSpyProps`,
  `GhostScrollSpySlotProps`, `GhostScrollSpyExposed`, `GhostScrollSpyListProps`,
  `GhostScrollSpyItemProps`, `GhostScrollSpyLinkProps`,
  `GhostScrollSpyHistoryMode`, `GhostScrollSpyOrientation`,
  `GhostScrollSpyTravelDirection`, `UseGhostScrollSpyOptions`,
  `UseGhostScrollSpyReturn`.

Themed exports from `@ghostvue/themes`:

- `GhostScrollSpy`, `GhostScrollSpyList`, `GhostScrollSpyItem`,
  `GhostScrollSpyLink` wrapping the headless parts and shipping default
  navigation rail/TOC recipe styling (`ghost-scroll-spy.css`).

### Props and configuration

#### `GhostScrollSpy` / `useGhostScrollSpy`

| Prop / Option    | Type                                         | Default                | Contract                                                                                                                                                              |
| ---------------- | -------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as`             | `string \| Component`                        | `'nav'`                | Root landmark element (`GhostScrollSpy` only).                                                                                                                        |
| `label`          | `string`                                     | `'Page sections'`      | Default `aria-label` when neither `aria-label` nor `aria-labelledby` is passed via attrs.                                                                             |
| `modelValue`     | `string \| undefined`                        | `undefined`            | Controlled active target ID (without leading `#`).                                                                                                                    |
| `defaultValue`   | `string \| undefined`                        | `undefined`            | Initial active target ID in uncontrolled mode (see Open Question #4 for SSR behavior when omitted).                                                                   |
| `orientation`    | `'vertical' \| 'horizontal'`                 | `'vertical'`           | Layout axis exposed via `data-orientation` (and arrow/scroll axis if applicable; see Open Questions #1–#2).                                                           |
| `container`      | `HTMLElement \| Window \| null \| undefined` | `undefined` (`window`) | Scroll container to observe and scroll (see Open Question #3).                                                                                                        |
| `probeOffset`    | `number`                                     | `0.4`                  | Viewport/container activation threshold: values in `(0, 1]` are treated as a fraction of container height; values `> 1` or `0` are pixel offsets from the start edge. |
| `endThreshold`   | `number`                                     | `0.995`                | Normalized scroll progress (`0..1`) at or above which the final target becomes active even if shorter than `1 - probeOffset`.                                         |
| `scrollBehavior` | `'smooth' \| 'auto'`                         | `'smooth'`             | Scroll behavior for link activation and `scrollTo()`. Navigation is instant when `prefers-reduced-motion: reduce` matches, even with CSS smooth scrolling.            |
| `historyMode`    | `'replace' \| 'push' \| 'none'`              | `'replace'`            | How URL hash is updated on plain link activation (`history.replaceState` avoids stacking back-button entries).                                                        |
| `focusTarget`    | `boolean`                                    | `true`                 | Moves focus (`target.focus({ preventScroll: true })`) to the resolved section element after activation.                                                               |
| `travelSettleMs` | `number`                                     | `180`                  | Milliseconds after the last scroll frame before `data-travel` clears.                                                                                                 |

#### `GhostScrollSpyLink`

| Prop       | Type                  | Default            | Contract                                                                                                                            |
| ---------- | --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `target`   | `string`              | required           | Target section ID (normalized by stripping a leading `#` if passed).                                                                |
| `href`     | `string \| undefined` | `` `#${target}` `` | Native anchor `href`. Defaults to fragment `#<target>` so the link works without JS.                                                |
| `as`       | `GhostLinkElement`    | `'a'`              | Passed through to `GhostLink`.                                                                                                      |
| `disabled` | `boolean`             | `false`            | Passed through to `GhostLink`; disabled items cannot activate and are skipped during active tracking (if not rendered or disabled). |

### v-model contracts

- `modelValue` / `update:modelValue`: owns the active section ID (`string | undefined`)
  via `useControllableState`.
- In uncontrolled mode, scroll measurement updates the internal active ID and
  emits `update:modelValue` only when the active ID actually changes (`Object.is`
  guard — never emits on every scroll frame).
- In controlled mode, `update:modelValue` is emitted when scroll measurement or
  activation resolves a different ID; the rendered `aria-current` reflects the
  parent's `modelValue` prop.
- Calling `scrollTo(id)` scrolls to the target and updates/emits the active ID
  immediately (or lets scroll measurement confirm it; if controlled `modelValue`
  does not update, `aria-current` remains bound to `modelValue`).

### Events, callbacks, slots, and exposed methods

- **Events on `GhostScrollSpy`:**
  - `update:modelValue(id: string | undefined)` — emitted when active target ID changes.
  - `activate({ id: string, element: HTMLElement | null, event: MouseEvent | KeyboardEvent })` — emitted on plain activation of a link; cancelable (`event.defaultPrevented` before handling skips scroll/focus/history mutation, or emitted with `{ id, preventDefault }`).
- **Scoped slot on `GhostScrollSpy` (`default`):**
  Exposes `{ activeId, travelDirection, itemCount, scrollTo }` (progress CSS
  custom properties live on the root element so reading slot props never
  forces per-frame re-renders).
- **Scoped slot on `GhostScrollSpyLink` (`default`):**
  Exposes `{ active: boolean, target: string }`.
- **Exposed on `GhostScrollSpy` template ref (`GhostScrollSpyExposed`):**
  - `readonly element: HTMLElement | null`
  - `readonly activeId: string | undefined`
  - `scrollTo(targetId: string, options?: { behavior?: ScrollBehavior; focus?: boolean }): void`
  - `measure(): void` — forces an immediate geometry re-read after consumer DOM changes.

## State model

1. **Active target resolution (`resolveScrollSpyActiveIndex`):**
   - When the scroll container is not scrollable (`scrollHeight - viewportHeight <= 0`),
     progress is `0` and the active index is `0` (first item).
   - When overall scroll progress `>= endThreshold` (`0.995`), the last item
     (`items.length - 1`) is active so short trailing sections are always reachable.
   - Otherwise, the active item is the **last item in registered order** whose
     target element's start edge (`top` relative to the scroll container's viewport)
     is `<= probeY` (where `probeY = viewportHeight * probeOffset` for fractional
     offsets or `probeOffset` in pixels).
   - This guarantees deterministic, symmetric transitions in both scroll
     directions (downward and upward) and keeps exactly one item active (`aria-current="location"`) at a time.
2. **Overall and segment progress:**
   - **Overall progress (`--ghost-scroll-spy-progress`):** `clamp((scrollTop) / (scrollHeight - viewportHeight), 0, 1)`, `0` when non-scrollable.
   - **Inter-item segment progress (`--ghost-scroll-spy-section-progress`):**
     For `N >= 2` items, maps scroll position between adjacent items' activation
     offsets (`start_i = activationOffset(i)`, `start_{i+1} = activationOffset(i+1)`)
     onto `[i / (N - 1), (i + 1) / (N - 1)]`, reaching `i / (N - 1)` at the exact
     scroll offset where item `i` becomes active and `1` at the last item. Matches
     `resolveRailProgress` in `landing-motion.ts`.
3. **Travel direction (`data-travel`):**
   - Computed from `scrollTop - previousScrollTop` ignoring sub-pixel noise
     (`abs(delta) < 0.5`).
   - Restored initial scroll positions on mount do **not** trigger `data-travel`.
   - While scrolling, `data-travel="down"` or `data-travel="up"` is set on the
     root element and removed after `travelSettleMs` (default `180ms`) of idle.

### Loading, empty, disabled, read-only, and error states

- **Empty (`0` registered links):** Root landmark still renders cleanly; `measure()`
  sets `--ghost-scroll-spy-progress: 0`, `--ghost-scroll-spy-section-progress: 0`,
  and `activeId` stays `undefined` with no runtime errors.
- **Missing target element (`document.getElementById(target) === null`):**
  Silently skipped during scroll measurement (does not throw or crash SSR/hydration
  or partial renders). On click, if the target element is missing, the browser's
  native link behavior is preserved (does not call `preventDefault()`).
- **Disabled link (`GhostScrollSpyLink` with `disabled`):**
  Delegates `aria-disabled="true"` and `tabindex="-1"` to `GhostLink`; never
  activates on click and does not steal focus.
- **Non-scrollable page:** Progress stays `0`, first item stays active, `data-travel`
  is absent.

### Async behavior

Not directly async, though target sections may mount, resize, or load async
content (images, collapsible panels, tabs). Tracking follows the container when
a template ref resolves or the element is replaced. Container and activation
threshold changes, window resize, link registration changes, navigation subtree
changes such as keyed moves, and `ResizeObserver` notifications schedule a coalesced
`requestAnimationFrame` measurement.

## Consumer data

- Consumers own the target section elements (`id` attributes on `<section>` or
  heading anchors) and the list of `GhostScrollSpyLink` children.
- `GhostScrollSpy` never mutates consumer-owned arrays or data objects.
- Link registration preserves **DOM / render order** across dynamic inserts,
  conditional `v-if` toggles, and reordering (using DOM order comparison via
  `compareDocumentPosition` or ordered array reconciliation on mount/unmount).
- Duplicate `target` values in the same `GhostScrollSpy` warn in development
  (`GHOST013` dev warning). The first enabled link in DOM order owns the active
  state, and each enabled target contributes only one progress stop.

## Accessibility contract

### Semantics and relationships

- Root `GhostScrollSpy` renders `<nav>` (implicit `navigation` landmark) with
  `aria-label` (default `"Page sections"`, overridden by `label`, `aria-label`,
  or `aria-labelledby`).
- `GhostScrollSpyList` renders `<ol>` (ordered section sequence) with `<li>`
  items (`GhostScrollSpyItem`).
- `GhostScrollSpyLink` renders a native `<a href="#<target>">` via `GhostLink`:
  - Active item carries `aria-current="location"` (present only on the active
    link; omitted on inactive links).
  - Real `href` ensures screen-reader links lists, context menus ("Open in new
    tab"), and zero-JS navigation work natively.
- Any decorative progress track, rail fill, or traveller icon inside the themed
  wrapper or consumer slot MUST carry `aria-hidden="true"`.

### Keyboard interaction

- **Standard Tab-per-link (proposed default, see Open Question #1):**
  - `Tab` / `Shift+Tab` moves sequentially through each enabled `GhostScrollSpyLink`.
  - `Enter` (native anchor activation) triggers the same handler as a plain
    primary click: scrolls target into view (respecting `prefers-reduced-motion`)
    and moves focus to the target element.
- **Alternative (roving focus, under review in Open Question #1):**
  - Single `Tab` stop on the list with `ArrowUp`/`ArrowDown` (vertical) or
    `ArrowLeft`/`ArrowRight` (horizontal, RTL-aware) + `Home`/`End`.

### Focus behavior

- When a link is activated (click or `Enter`):
  1. Target scrolls to the start of the scrollport, respecting the section's
     vertical scroll margin and the container's vertical scroll padding.
  2. Target receives focus via `target.focus({ preventScroll: true })` (when
     `focusTarget` is `true`), so the next `Tab` moves to the first interactive
     control _inside_ that section rather than continuing through the rest of
     the nav rail or jumping back to the top of the page.
  3. See Open Question #5 on ensuring target focusability when a section lacks
     `tabindex="-1"`.
- Visible focus indicators (`:focus-visible`) are styled on `GhostScrollSpyLink`
  in `@ghostvue/themes` and must meet WCAG 2.2 Focus Appearance (2px+ ring,
  `--ghost-focus-ring-color`, `forced-colors: active` `Highlight`).

### Assistive technology expectations

- Screen readers announce `<nav aria-label="...">` as a navigation landmark,
  an ordered list of N links, and the active link as `"current location"`.
- Passive scroll tracking MUST NOT trigger live-region announcements as the user
  scrolls past sections (to avoid spamming screen readers during normal reading).
- Only explicit link activation moves focus; passive scrolling never steals focus.

## Rendering and customization

Headless `@ghostvue/vue` parts emit stable styling hooks (`data-part`,
`data-state`, `data-orientation`, `data-travel`) without visual CSS:

- `GhostScrollSpy`: `class="ghost-scroll-spy"`, `data-part="root"`,
  `data-orientation="vertical" | "horizontal"`, `data-travel="down" | "up"`
  (absent when idle), plus inline CSS custom properties
  `--ghost-scroll-spy-progress` and `--ghost-scroll-spy-section-progress`.
- `GhostScrollSpyList`: `class="ghost-scroll-spy-list"`, `data-part="list"`.
- `GhostScrollSpyItem`: `class="ghost-scroll-spy-item"`, `data-part="item"`,
  `data-state="active"` (absent when inactive).
- `GhostScrollSpyLink`: `class="ghost-scroll-spy-link"`, `data-part="link"`,
  `data-state="active"` (absent when inactive), `aria-current="location"` (when active).

Themed `@ghostvue/themes` wraps all four parts with semantic `--ghost-*` token
CSS (`ghost-scroll-spy.css`, layered in `@layer ghostvue-theme` with
`.ghost-theme` / `.ghost-themed-scope` / `[data-themed]`), supporting:

- A subtle track line and `--ghost-scroll-spy-section-progress` fill bar via
  CSS transforms (`scaleY` / `scaleX`) with zero layout thrashing.
- Clear active, hover, focus-visible, and `forced-colors: active` states.
- Full `@media (prefers-reduced-motion: reduce)` handling (no smooth scroll,
  no transitions).

Consumers needing custom visuals (like the landing page's travelling ghost SVG
and numbered floating pills) can either style the headless `GhostScrollSpy`
hooks directly or use the scoped slot props (`{ activeId, travelDirection }`) +
`--ghost-scroll-spy-section-progress` CSS variable.

## Environment behavior

### SSR and hydration

- No `window`, `document`, `ResizeObserver`, or `matchMedia` access during
  `setup()` or SSR render.
- All scroll listeners, `ResizeObserver`, and `matchMedia('(prefers-reduced-motion: reduce)')`
  attach in `onMounted` and clean up in `onBeforeUnmount` (canceling any
  pending `requestAnimationFrame` and `travelSettleMs` timer).
- On SSR, `--ghost-scroll-spy-progress` and `--ghost-scroll-spy-section-progress`
  render as `'0'` (or are omitted until mount, matching `landing-rail.css`
  `var(..., 0)` fallback) and `data-travel` is absent so initial hydration matches
  with zero Vue warnings.
- See Open Question #4 for initial SSR `aria-current` ownership.

### Mobile and touch

- Works with native momentum touch scrolling because listeners are `{ passive: true }`
  and read-only.
- Themed recipe meets 24x24px minimum target sizing (ideally 32–44px block hit
  target) and allows consumers to hide/collapse the rail on narrow viewports via
  media queries without horizontal overflow (as `landing-rail.css` does below
  `1100px`).

## Performance

- Expected scale: 2–50 sections per page (typical docs/landing/settings TOC).
- Scroll handler coalesces work to at most **one `requestAnimationFrame` per
  frame** (`if (frame !== 0) return`).
- Inside `measure()`, all DOM reads (`scrollY`, `innerHeight`, `scrollHeight`,
  `getBoundingClientRect().top`) are batched before the single DOM write
  (`root.style.setProperty(...)`) to prevent read/write layout thrashing.
- Progress values are written directly to element CSS custom properties rather
  than reactive Vue refs so scrolling does not trigger component tree
  re-renders; only discrete `activeId` transitions trigger a reactive update.

## Composition

- **`GhostLink` / `useGhostLink`:** Reused by `GhostScrollSpyLink` for native
  anchor semantics, `as` polymorphism, `disabled` handling, and `focus()`/`blur()`.
- **`useControllableState`:** Reused for `modelValue` / `defaultValue` active
  section ownership.
- **`useGhostId`:** Reused if needed for fallback accessible-label or item IDs.
- **`resolveDir` / `useRovingFocus`:** Available for reuse if Open Question #1
  selects roving focus or opt-in roving mode.
- **No external dependencies:** Pure DOM / `ResizeObserver` / `matchMedia` only.

## Test plan

- **Framework-neutral unit tests (`packages/vue/src/`):**
  - `resolveScrollSpyActiveIndex`: top of page, probe crossing in both
    directions, short trailing section clamped at `endThreshold`, non-scrollable
    container, empty targets.
  - `resolveScrollSpyProgress` and `resolveScrollSpySegmentProgress`: clamping
    at `0` and `1`, exact marker alignment at activation offset, monotonicity.
  - `resolveScrollSpyTravelDirection`: `down`, `up`, sub-pixel jitter `< 0.5`
    ignored.
- **Vue component & composable tests (`packages/vue/src/`):**
  - Controlled (`modelValue` + `update:modelValue`) and uncontrolled
    (`defaultValue`) state, including controlled veto on scroll/click.
  - Dynamic target insertion, removal, and DOM reordering updates tracking order.
  - Cleanup on unmount (listeners, `rAF`, timers, `ResizeObserver` disconnected).
  - Plain click vs modified click (`Ctrl`/`Cmd`/`Shift`/`Alt`/middle click).
  - `activate` event cancellation.
  - `expectSsrHydration` verifying zero warnings and deterministic SSR HTML.
- **Playwright E2E + axe (`tests/e2e/scroll-spy.spec.ts` + `tests/e2e/docs-landing.spec.ts`):**
  - Active tracking (`aria-current="location"`) while scrolling in both
    directions, including short final section.
  - Click and keyboard (`Enter`) activation scrolls target into view and asserts
    real focus (`toBeFocused()`) on the target section and subsequent `Tab` inside
    the section.
  - `prefers-reduced-motion: reduce` scrolls immediately without smooth motion.
  - Works without JS enabled (real `#target` links navigate natively).
  - Axe scan on headless and themed examples in light/dark modes.
  - Visual baseline for themed example (`pnpm test:visual:docker`).
  - Full `tests/e2e/docs-landing.spec.ts` regression pass after migrating
    `LandingSectionRail.vue` and `landing-motion.ts`.
- **Compile-time type tests (`packages/vue/type-tests/`):**
  - Positive and negative fixtures for `GhostScrollSpy*` props, scoped slots,
    exposed `scrollTo`, and `useGhostScrollSpy`.

## Documentation plan

After spec approval and implementation:

- `docs/components/scroll-spy.md` with `<GhostExample />` demos under
  `examples/scroll-spy/`:
  - `basic` — headless landmark navigation with `--ghost-scroll-spy-section-progress`
  - `themed` — themed `@ghostvue/themes` vertical rail/TOC
  - `composable` — `useGhostScrollSpy` custom layout
- `packages/vue/manifests/ghost-scroll-spy*.manifest.json` and
  `packages/themes/manifests/ghost-scroll-spy.manifest.json` via `pnpm manifests:write`.
- Generated API tables via `pnpm docs:api:write`.
- Playground section under `apps/playground/`, `docs/roadmap.md` row update,
  and migration of `apps/docs/.vitepress/theme/LandingSectionRail.vue` +
  `landing-motion.ts`.

## Compatibility and release impact

- Purely additive minor release via Changesets for `@ghostvue/vue` and
  `@ghostvue/themes`.
- Migrating `LandingSectionRail.vue` onto `GhostScrollSpy` is internal to
  `apps/docs` and preserves all existing test IDs, styles, and E2E behavior.

## Open architectural questions

Decisions below require **Zac's sign-off** before writing production markup or
exports:

1. **Tab-per-link vs roving focus (`useRovingFocus`).**
   - _Option A (Recommended):_ Standard Tab-per-link inside `<nav><ol><li><a>`.
     Matches WAI-ARIA landmark navigation expectations, works identically with
     and without JS, and preserves the existing keyboard contract verified in
     `tests/e2e/docs-landing.spec.ts` (`Tab` / `Shift+Tab` between links).
   - _Option B:_ Roving `tabindex` (`useRovingFocus`) with a single Tab stop and
     `ArrowUp`/`ArrowDown` navigation.
   - _Option C:_ Tab-per-link by default with an opt-in `rovingFocus?: boolean`
     prop.

2. **RTL behavior.**
   - _Option A (Recommended):_ Use CSS logical properties (`inset-inline-*`,
     `padding-inline-*`) in the themed recipe so rails flip sides cleanly in
     `dir="rtl"`, and keep v1 scroll tracking vertical (`scrollTop` / `top`),
     while honoring `dir` if horizontal arrow navigation is ever enabled.
   - _Option B:_ Also support `orientation="horizontal"` horizontal scroll
     containers (`scrollLeft`) with cross-browser RTL `scrollLeft` sign
     normalization in v1.

3. **Nested scroll containers vs viewport (`window`) only.**
   - _Option A (Recommended):_ Support an optional `container` prop/option
     (`MaybeRefOrGetter<HTMLElement | Window | null | undefined>`, defaulting
     to `window`). When `container` is an `HTMLElement`, measure bounds relative
     to `container.getBoundingClientRect().top` and scroll the container directly
     via `container.scrollTo(...)` rather than `element.scrollIntoView(...)` so
     outer page scroll does not jump unexpectedly.
   - _Option B:_ Viewport (`window`) only in v1; defer nested containers.

4. **SSR output before client measurement.**
   - _Option A (Recommended):_ Render `aria-current="location"` on `modelValue`
     if controlled, else `defaultValue` if provided, else **the first registered
     enabled item** once registered (matching `LandingSectionRail.vue` SSR output), and
     reconcile to actual scroll position in `onMounted` after hydration. Note:
     for compound children without `defaultValue`, `GhostScrollSpyLink` setup
     order must not mutate parent state _after_ the first link renders; either
     `GhostScrollSpyLink` reads a deterministic registration index synchronously
     in setup (`firstTargetId`) or `defaultValue` is encouraged for SSR rails.
   - _Option B:_ Render no `aria-current` during SSR unless `modelValue` or
     `defaultValue` is explicitly passed, and apply `aria-current="location"`
     after `onMounted` measurement.

5. **Target focusability on activation.**
   - _Option A (Recommended):_ If the resolved target element is not naturally
     focusable and has no `tabindex` attribute (`target.tabIndex < 0 && !target.hasAttribute('tabindex')`),
     set `tabindex="-1"` right before `target.focus({ preventScroll: true })`
     (matching standard skip-link handling so consumers who forget `tabindex="-1"`
     still get working keyboard flow).
   - _Option B:_ Never write `tabindex` onto consumer section elements; require
     consumers to put `tabindex="-1"` on target sections (as `GhostLanding.vue`
     already does) and warn in dev when `target.focus()` leaves `document.activeElement`
     unchanged.
