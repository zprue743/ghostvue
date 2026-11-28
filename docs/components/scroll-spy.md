# GhostScrollSpy

`GhostScrollSpy` keeps an in-page table of contents in step with the reader's
scroll position. Import it from `@ghostvue/themes` for a styled vertical
section rail. The rail marks the section being read, scrolls to a section when
a link is activated, and moves focus there.

Teams that bring their own design system can compose the same behavior from
`@ghostvue/vue`; see [Advanced: custom layout](#custom-layout).

## Navigate an article {#themed-rail}

<GhostExample id="scroll-spy/themed" />

The example imports every part from `@ghostvue/themes` and renders the rail
beside a short feature-flag rollout article. The article scrolls inside its own
panel, so the example passes that panel's template ref as `container`. Try it:

- **Jump to a section.** `Tab` to a link such as **Ramp up traffic** and press
  `Enter`. The panel scrolls the section to its top, focus moves into the
  section, the URL hash becomes `#rollout-ramp`, and the link turns active.
- **Keep reading.** Scroll the panel with the wheel, or focus it and use the
  arrow keys. The active link follows the section under the reading line.
- **Narrow the preview.** Below 34rem the rail stacks above the panel, so
  every link stays on screen while the article scrolls.

The panel is a named `role="region"` with `tabindex="0"`, so keyboard users can
scroll it. Each section has `tabindex="-1"` so link activation can focus it.
`:probe-offset="64"` puts the reading line 64px below the top of the panel, and
the last section is at least one panel tall, so a jump to any section brings it
to the top and keeps its link active.

Without `container`, ScrollSpy tracks and scrolls the window. Pass an element
or a template ref for a nested scroll area; tracking follows the ref when it
resolves or changes. Navigation honors the container's vertical scroll padding
and the section's scroll margin, so the example's `scroll-padding-block-start`
keeps each heading clear of the panel edge.

## Active section behavior {#active-section}

The active link has `aria-current="location"` and `data-state="active"`. The
themed recipe paints it in the default text color at semibold weight, while
the other links stay muted.

- **Reading line.** The active section is the last one, in link order, whose
  start edge has crossed the probe line. `probeOffset` defaults to `0.4`:
  values in `(0, 1]` are a fraction of the container height, and `0` or values
  above `1` are pixel offsets from the start edge.
- **Before scrolling.** The first enabled link is active, including in
  server-rendered markup.
- **At the end.** When overall scroll progress reaches `endThreshold` (default
  `0.995`, the very end of the container), the last section becomes active even
  if its start never reaches the probe line, so short final sections still get
  their turn. A jump to an earlier section that cannot scroll to the top of the
  container also lands at the end, so the last link is marked. Leave enough
  content after the sections, as the example does, when every jump should mark
  the chosen link.
- **Disabled and shared targets.** Disabled links are skipped when choosing the
  active section. If several links share a target, the first enabled link in
  DOM order owns the active state and the section counts once toward progress.
- **Refreshes.** Viewport and observed content resizes refresh tracking, and so
  does adding or removing a target section in the scroll container. Changing
  `probeOffset` or `endThreshold` refreshes the active section at the current
  scroll position.
- **Controlled state.** With a controlled `modelValue`, ScrollSpy requests a
  selection change once for consecutive measurements of the same section while
  the current value stays the same.

## Keyboard and focus

- `Tab` / `Shift+Tab` move between section links.
- `Enter` scrolls to the target, updates the URL hash (`historyMode` defaults to
  `replace`), and moves focus into the section (`focusTarget` defaults to `true`).

Link activation and `scrollTo()` jump to the section immediately when reduced
motion is requested, even if the scroll container uses CSS smooth scrolling.

## Advanced: custom layout {#custom-layout}

This section is for teams that bring their own design system and style the
navigation themselves. Import the same parts from `@ghostvue/vue`; they render
semantic markup and state attributes but no visual styles.

### Headless list markup {#basic-navigation}

<GhostExample id="scroll-spy/basic" />

The compound parts render `<nav>` → `<ol>` → `<li>` → `<a href="#...">` via
`GhostScrollSpyLink`. Style them through `data-part` and `data-state`. Progress
is exposed as `--ghost-scroll-spy-progress` and
`--ghost-scroll-spy-section-progress` on the root without per-frame Vue
re-renders. Both progress values stay at zero when there are no
measurable targets.

When enabled, `GhostScrollSpyLink` forwards its default fragment or explicit
`href` to a custom link component passed through `as`.

### Composable layout {#composable-layout}

<GhostExample id="scroll-spy/composable" />

Use the root scoped slot (`activeId`, `scrollTo`, `travelDirection`,
`itemCount`) or `useGhostScrollSpy` when the default list markup is not enough.

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
