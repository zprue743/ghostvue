# GhostScrollArea

`GhostScrollArea` is a bounded native overflow container. Import it from
`@ghostvue/vue` for headless use, or from `@ghostvue/themes` for scrollbar
containment and token-colored native scrollbars.

## Workspace activity feed

<GhostExample id="scroll-area/activity-feed" />

A bounded `GhostScrollArea` inside a `GhostCard` keeps a fixed height while
scrolling through deterministic activity entries. Because there are no
focusable controls inside, `label` names the region (`role="region"` +
`aria-label`) so keyboard users can focus and scroll it.

## Vertical region

<GhostExample id="scroll-area/basic" />

Set a block-size constraint on the root (`style`, `class`, or layout parent). The
component applies native `overflow-y: auto` by default and exposes
`data-overflow` when content exceeds the box.

## API

<!-- @generated docs-api:vue/ghost-scroll-area begin -->

<!-- Source: packages/vue/manifests/ghost-scroll-area.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop          | Type                          | Default      | Description                                                                            |
| ------------- | ----------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| `as`          | `'div'`                       | `"div"`      | Scroll root host. Closed union; only div is supported initially.                       |
| `label`       | `string`                      | —            | When the root is a tab stop with no inner focusables, sets role=region and aria-label. |
| `orientation` | `GhostScrollAreaOrientation`  | `"vertical"` | Which axes may scroll when content exceeds the box.                                    |
| `type`        | `GhostScrollAreaOverflowType` | `"auto"`     | Native overflow mode on enabled axes: auto or scroll.                                  |

| Slot      | Slot props | Description                                         |
| --------- | ---------- | --------------------------------------------------- |
| `default` | —          | Scrollable content inside the native overflow root. |

<!-- @generated docs-api:vue/ghost-scroll-area end -->

<!-- @generated docs-api:themes/ghost-scroll-area begin -->

<!-- Source: packages/themes/manifests/ghost-scroll-area.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostScrollArea` API, which it forwards.

<!-- @generated docs-api:themes/ghost-scroll-area end -->

Native attributes fall through to the scroll root (`id`, `class`, `dir`,
`aria-labelledby`, sizing styles). There is no v-model.

### Focus and naming

When content overflows and the slot has **no tabbable descendants**, the root
receives `tabindex="0"`. Provide `label` then so the tab stop is named
(`role="region"` and `aria-label`). You can also name the region through
fallthrough `aria-labelledby` together with an explicit `role` when you need a
custom pattern. When buttons, links, or
fields live inside, the root stays out of the tab order and keyboard users scroll
via those controls or pointer.

## Horizontal strip

Bounded horizontal overflow matches wide table preview regions:

<GhostExample id="scroll-area/horizontal" />

## Composable path

<GhostExample id="scroll-area/composable" />

## Themed use

<GhostExample id="scroll-area/themed" />

The themed wrapper adds `data-themed` and loads instance styles. Sizing still
comes from your layout.

## Styling hooks

The scroll root uses class `ghost-scroll-area`, `data-part="root"`,
`data-orientation`, `data-type` (`auto` or `scroll`), and runtime
`data-overflow` (`none`, `vertical`, `horizontal`, or `both`). Target overflow
affordances without replacing native scrollbars:

```css
.ghost-scroll-area[data-overflow='vertical'] {
  max-block-size: var(--panel-scroll-max, 16rem);
}
```

## Accessibility

A focused native overflow root scrolls with platform keys (arrows, Page Up/Down,
Home/End, Space). The component does not install key handlers. RTL layouts
inherit native horizontal scroll direction from `dir` on the root or document.

SSR renders `data-overflow="none"` and omits `tabindex` until the client
measures layout.
