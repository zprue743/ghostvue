# GhostScrollArea

`GhostScrollArea` is a bounded native overflow container. Import it from
`@ghostvue/vue` for headless use, or from `@ghostvue/themes` for scrollbar
containment and token-colored native scrollbars.

## Vertical region

<GhostExample id="scroll-area/basic" />

Set a block-size constraint on the root (`style`, `class`, or layout parent). The
component applies native `overflow-y: auto` by default and exposes
`data-overflow` when content exceeds the box.

## API

| Prop          | Type                                   | Default      | Description                                                                                            |
| ------------- | -------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `orientation` | `'vertical' \| 'horizontal' \| 'both'` | `'vertical'` | Axes that may scroll.                                                                                  |
| `type`        | `'auto' \| 'scroll'`                   | `'auto'`     | Native `overflow-*` mode on enabled axes.                                                              |
| `as`          | `'div'`                                | `'div'`      | Host element.                                                                                          |
| `label`       | `string`                               | —            | Required when the root is a tab stop with no focusables inside: sets `role="region"` and `aria-label`. |

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
