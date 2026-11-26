# GhostScrollSpy

`GhostScrollSpy` is a headless section-navigation primitive that keeps an
in-page table of contents synchronized with scroll position. Import from
`@ghostvue/vue` for semantic landmarks and CSS progress variables, or from
`@ghostvue/themes` for a vertical TOC rail.

## Basic navigation

<GhostExample id="scroll-spy/basic" />

The compound parts render `<nav>` → `<ol>` → `<li>` → `<a href="#...">` via
`GhostScrollSpyLink`. Progress is exposed as
`--ghost-scroll-spy-section-progress` on the root without per-frame Vue
re-renders.

When enabled, `GhostScrollSpyLink` forwards its default fragment or explicit
`href` to a custom link component passed through `as`.

Disabled links are skipped when choosing the current section. If several links
share a target, the first enabled link in DOM order owns the current state and
the section counts once toward progress.

For a nested scroll area, pass its element or a template ref as `container`.
Tracking follows the ref when it resolves or changes. Navigation honors the
container's vertical scroll padding and the section's scroll margin. Viewport
and observed content resizes refresh tracking. Both progress values stay at
zero when there are no measurable targets. Changing `probeOffset` or
`endThreshold` refreshes the current section and its progress at the current
scroll position.

## Themed rail

<GhostExample id="scroll-spy/themed" />

## Custom layout

<GhostExample id="scroll-spy/composable" />

Use the root scoped slot (`activeId`, `scrollTo`, `travelDirection`,
`itemCount`) or `useGhostScrollSpy` when the default list markup is not enough.

## Keyboard and focus

- `Tab` / `Shift+Tab` move between section links.
- `Enter` scrolls to the target, updates the URL hash (`historyMode` defaults to
  `replace`), and moves focus into the section (`focusTarget` defaults to `true`).

Link activation and `scrollTo()` jump to the section immediately when reduced
motion is requested, even if the scroll container uses CSS smooth scrolling.

## API

See the [specification](/specs/scroll-spy).

<!-- @generated docs-api:vue/ghost-scroll-spy begin -->

<!-- Source: packages/vue/manifests/ghost-scroll-spy.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop             | Type                            | Default           | Description                     |
| ---------------- | ------------------------------- | ----------------- | ------------------------------- |
| `as`             | `GhostScrollSpyElement`         | `"nav"`           | Declared prop `as`.             |
| `container`      | `HTMLElement \| null \| Window` | —                 | Declared prop `container`.      |
| `defaultValue`   | `string`                        | —                 | Declared prop `defaultValue`.   |
| `endThreshold`   | `number`                        | —                 | Declared prop `endThreshold`.   |
| `focusTarget`    | `boolean`                       | `true`            | Declared prop `focusTarget`.    |
| `historyMode`    | `'none' \| 'push' \| 'replace'` | `"replace"`       | Declared prop `historyMode`.    |
| `label`          | `string`                        | `"Page sections"` | Declared prop `label`.          |
| `modelValue`     | `string`                        | —                 | Declared prop `modelValue`.     |
| `orientation`    | `GhostScrollSpyOrientation`     | `"vertical"`      | Declared prop `orientation`.    |
| `probeOffset`    | `number`                        | —                 | Declared prop `probeOffset`.    |
| `scrollBehavior` | `ScrollBehavior`                | `"smooth"`        | Declared prop `scrollBehavior`. |
| `travelSettleMs` | `number`                        | `180`             | Declared prop `travelSettleMs`. |

| Event      | Payload                                                                             | Description            |
| ---------- | ----------------------------------------------------------------------------------- | ---------------------- |
| `activate` | `{ id: string; element: HTMLElement \| null; event: MouseEvent \| KeyboardEvent; }` | Emitted as `activate`. |

| Slot      | Slot props                                                                                                                                                                                                             | Description      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `default` | `activeId: string \| undefined`, `itemCount: number`, `scrollTo: (targetId: string, options?: { behavior?: ScrollBehavior; focus?: boolean; }) => void`, `travelDirection: GhostScrollSpyTravelDirection \| undefined` | Primary content. |

<!-- @generated docs-api:vue/ghost-scroll-spy end -->

<!-- @generated docs-api:themes/ghost-scroll-spy begin -->

<!-- Source: packages/themes/manifests/ghost-scroll-spy.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostScrollSpy` API, which it forwards.

<!-- @generated docs-api:themes/ghost-scroll-spy end -->

| Part                 | Element | Key semantics               |
| -------------------- | ------- | --------------------------- |
| `GhostScrollSpy`     | `nav`   | `aria-label`, CSS variables |
| `GhostScrollSpyList` | `ol`    | ordered section sequence    |
| `GhostScrollSpyItem` | `li`    | list item wrapper           |
| `GhostScrollSpyLink` | `a`     | `aria-current="location"`   |
