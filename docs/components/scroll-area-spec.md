---
schemaVersion: 1.0.0
component: GhostScrollArea
components:
  - GhostScrollArea
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: proposed
manifests:
  - packages/vue/manifests/ghost-scroll-area.manifest.json
  - packages/themes/manifests/ghost-scroll-area.manifest.json
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

# GhostScrollArea specification

**Status:** Proposed for GHO-84. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostScrollArea` is a constrained overflow container with predictable layout
and accessibility behavior. It clips or scrolls content that exceeds a bounded
region without custom scrollbar widgets, sticky orchestration, or
virtualization.

Sighted users scroll with pointer, trackpad, or native scrollbars. Keyboard
users can reach overflowed content when the region has no other focusable
descendants, using the same keys as a native scrollable element. Assistive
technology encounters a scrollable region with an accessible name when the
root is in the tab order.

Immediate consumers include tall lists in side panels, bounded dialog bodies,
and horizontally overflowed table wrappers ahead of `GhostDataTable`. Those need
native scrolling, stable layout, and axe-clean focus rules
(`scrollable-region-focusable`).

## Non-goals

- Custom scrollbar rendering, drag-to-scroll thumbs, or scrollbar-only styling
  as a requirement. Themed CSS may style native scrollbars where the platform
  allows it; consumers are not forced to replace native scrolling.
- Virtualization, infinite scroll, or scroll-position persistence.
- Sticky rows/columns, scroll syncing, or DataTable-specific orchestration.
- Window-level scroll locking (`useScrollLock` stays separate).
- Split panes / window splitters (APG window splitter pattern).
- Focus trapping inside the region; parent widgets own that when needed.
- Shadow DOM scroll portals or nested viewport/corner/scrollbar part trees.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostScrollArea` / `useGhostScrollArea`:

| Prop          | Type                                   | Default      | Contract                                                                                                                                                          |
| ------------- | -------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orientation` | `'vertical' \| 'horizontal' \| 'both'` | `'vertical'` | Which axes may scroll. Vertical is `overflow-y`; horizontal is `overflow-x`; both allow either axis when content exceeds the box.                                 |
| `type`        | `'auto' \| 'scroll'`                   | `'auto'`     | Maps to native `overflow-*: auto` vs `scroll`. `auto` shows scrollbars when needed; `scroll` always reserves the scrollable overflow mode on enabled axes.        |
| `as`          | `'div'`                                | `'div'`      | Host element. Closed union; widened only additively.                                                                                                              |
| `label`       | `string`                               | `undefined`  | When the root is a tab stop with no tabbable descendants, sets `role="region"` and `aria-label`. Provide whenever case (1) applies so the name is valid for ARIA. |

```ts
type GhostScrollAreaElement = 'div'
type GhostScrollAreaOrientation = 'vertical' | 'horizontal' | 'both'
type GhostScrollAreaOverflowType = 'auto' | 'scroll'
```

Named ESM exports: `GhostScrollArea`, `useGhostScrollArea`, and the types above.
Headless behavior lives in the composable; the SFC is a thin root that merges
`rootProps` and the default slot.

Native attributes and listeners fall through to the single root (`id`, `class`,
`data-*`, `aria-labelledby`, `style`, `dir`, etc.). The component owns `class`,
`data-part`, `data-orientation`, `data-type`, `data-overflow`, overflow-related
inline style, conditional `tabindex`, and when `label` is set on an active tab
stop, `role="region"` with `aria-label`.

Themed `@ghostvue/themes` `GhostScrollArea` wraps the unstyled component. Same
behavioral props; no extra visual props. Importing it loads the default
stylesheet and wraps the instance in `.ghost-themed-scope`.

### v-model contracts

No model. Overflow detection is internal state exposed via `data-overflow` for
styling, not for v-model.

### Events, callbacks, slots, and exposed methods

- **Default slot:** scrollable content. No nested viewport slot.
- **Events:** none component-specific; native `scroll` listeners attach via
  fallthrough.
- **Exposed:** `element` getter for the root `HTMLElement`.

## State model

Configuration props (`orientation`, `type`, `as`, `label`) are consumer-owned.
Runtime state:

| State           | Meaning                                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-overflow` | `none` when no enabled axis overflows; otherwise `vertical`, `horizontal`, or `both`.                                                                                             |
| Tab stop        | Root receives `tabindex="0"` only when at least one enabled axis overflows **and** the subtree has no tabbable descendants (excluding the root). Otherwise `tabindex` is omitted. |

Overflow and focusable-content detection run after mount and on resize or slot
text/content changes (`ResizeObserver` on the root and added element children;
`MutationObserver` limited to `childList` and `characterData` with `subtree`, not
attribute churn on the root). Server render omits `tabindex` and uses
`data-overflow="none"`.

### Loading, empty, disabled, read-only, and error states

None apply. Empty slot content is valid; overflow stays `none`.

### Async behavior

No async work beyond layout observation debounced to animation frames.

## Consumer data

The component does not accept data props and mutates no consumer-owned objects.
It measures its own layout box and subtree focusability.

## Accessibility contract

### Semantics and relationships

Native scrolling on a `div` (or other host). When the root is a tab stop and
`label` is set, the component assigns `role="region"` with `aria-label` so the
name is valid under ARIA.

Focusable scroll container rules (axe `scrollable-region-focusable`):

1. When content overflows on an enabled axis and there are **no tabbable**
   descendants, the root must be focusable (`tabindex="0"`) and named
   (`label` / `aria-label` / `aria-labelledby` via fallthrough).
2. When tabbable descendants exist, the root is **not** in the tab order;
   keyboard users scroll via focused descendants or pointer/trackpad.
3. When nothing overflows, the root is not focusable even if empty.

Overflowing static text with no tab stops matches case (1) and is the primary
DataTable-adjacent scenario for horizontal overflow.

### Keyboard interaction

No component key handlers. When the root is focused (`tabindex="0"`) with
overflow, the user agent scrolls the native overflow container (arrows, Page
Up/Down, Home/End, Space, and equivalent assistive-technology scroll gestures).
The component does not call `preventDefault` on keyboard events.

### Focus behavior

The root enters the tab order only per the table in **State model**. It does not
trap or restore focus. Visible focus follows the platform outline on the
scrollable root.

### Assistive technology expectations

When focusable and named, the scrollable region is announced as a focusable
element with its label; scrolling is performed after focus via keyboard or
assistive-technology scroll gestures. When not focusable, assistive technology
reads descendants normally.

## Rendering and customization

Single root element with a default slot. Stable styling hooks:

- class `ghost-scroll-area`
- `data-part="root"`
- `data-orientation="vertical" | "horizontal" | "both"`
- `data-type="auto" | "scroll"`
- `data-overflow="none" | "vertical" | "horizontal" | "both"`

Overflow axes use inline `overflow-x` / `overflow-y` from `orientation` and
`type`. Consumers size the box (`max-block-size`, `max-inline-size`, flex
child constraints, etc.) via attrs or parent layout.

Themed CSS under `.ghost-theme` / `.ghost-themed-scope` adds:

- `overscroll-behavior: contain` on the root to reduce scroll chaining into the page
- touch-friendly momentum scrolling where supported
- `scrollbar-gutter: stable` when `data-type="scroll"`
- native scrollbar color tokens where the engine supports `scrollbar-color`
- `scroll-behavior: auto` under `prefers-reduced-motion: reduce`

Token use is limited to existing semantic tokens (for example
`--ghost-border-subtle` for scrollbar thumb); no new component tokens.

## Environment behavior

### SSR and hydration

Initial markup uses configuration props and `data-overflow="none"`. Overflow
measurement and `tabindex` assignment run only in the browser after mount,
avoiding hydration mismatches. An integration test uses `expectSsrHydration`.

### Mobile and touch

Native touch scrolling on the root. No custom touch handlers. The themed recipe
may set `-webkit-overflow-scrolling: touch`. Minimum target size is not imposed
on the root; focusable children keep their own sizes.

## Performance

`ResizeObserver` (when available) watches the root; overflow checks are
coalesced with `requestAnimationFrame`. No virtualization. Expected scale is
modest DOM subtrees (hundreds of nodes), not million-row tables.

## Composition

`useGhostScrollArea` owns orientation/type styles, overflow measurement,
tabindex policy, and `data-*` hooks. `GhostScrollArea` binds the composable to a
template ref and slot. Themed wrapper adds scoped stylesheet load only.

Manifests: `packages/vue/manifests/ghost-scroll-area.manifest.json` and
`packages/themes/manifests/ghost-scroll-area.manifest.json`.

## Test plan

- Vue tests: default hooks, orientation/type overflow styles, `data-overflow`
  updates when layout overflows (stubbed metrics), tabindex when overflow without
  tabbables, no tabindex with tabbable children, `label` → `aria-label` when
  region role when labeled tab stop, no key interception, attribute fallthrough,
  SSR HTML without `tabindex`.
- Composable tests: overflow axis matrix, focusable-descendant detection,
  tabindex and `aria-label` policy.
- Integration: `expectSsrHydration` with slotted static content.
- Browser: playground scenarios (vertical list, horizontal strip, themed
  bounded region), axe scan without `scrollable-region-focusable` violations.
- Visual baselines: registered examples via `pnpm test:visual:docker`.
- No compile-time consumer fixtures: closed unions only.

## Documentation plan

`docs/components/scroll-area.md` with API reference, vertical, horizontal,
composable, themed, and accessibility sections; playground gallery section;
roadmap status update.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None blocking.

- **GHO-38 styling hooks.** Uses existing `data-part` / `data-*` attributes
  only.
- **Custom scrollbars.** Out of scope; native-first per issue.
