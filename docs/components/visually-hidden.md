# SlVisuallyHidden

`SlVisuallyHidden` renders content that assistive technology can reach but sighted
users do not see. Use it when an interface conveys meaning through position,
iconography, or visual grouping, and the missing text has to exist without
changing the design.

## Basic use

```vue
<script setup lang="ts">
import { SlVisuallyHidden } from '@slop-ui/vue'
</script>

<template>
  <button type="button">
    <TrashIcon aria-hidden="true" />
    <SlVisuallyHidden>Delete report</SlVisuallyHidden>
  </button>
</template>
```

The button now has the accessible name "Delete report" while still showing only
an icon. No stylesheet import or bundler configuration is required.

## API

| Prop        | Type                                             | Default  | Description                                                          |
| ----------- | ------------------------------------------------ | -------- | -------------------------------------------------------------------- |
| `as`        | `'span' \| 'div' \| 'p' \| 'li' \| 'td' \| 'th'` | `'span'` | Selects the rendered element so the result is valid in its parent.   |
| `focusable` | `boolean`                                        | `false`  | Reveals the content while focus is inside it, then hides it on blur. |

The default slot is the only slot. Native attributes and listeners fall through
to the single root element, which is how you attach `id`, `role`, `lang`,
`aria-live`, `data-*`, and anything else a given pattern needs.

Headless use of the same contract without the SFC:

```vue
<script setup lang="ts">
import { useSlVisuallyHidden } from '@slop-ui/vue'

const { rootProps } = useSlVisuallyHidden()
</script>

<template>
  <span v-bind="rootProps">Delete report</span>
</template>
```

## Naming icon-only controls

Icon-only controls are the most common use. Hide the decorative icon from
assistive technology and supply the name as hidden text:

```vue
<button type="button" @click="remove(report.name)">
  <TrashIcon aria-hidden="true" />
  <SlVisuallyHidden>Delete {{ report.name }}</SlVisuallyHidden>
</button>
```

Prefer this to `aria-label` when the name is interpolated from content, because
hidden text is translated by page-level translation tools that skip attributes.

## Table headers

A column of row actions usually needs no visible header, but a screen reader
still announces every cell against one. Render a real header that only assistive
technology encounters:

```vue
<tr>
  <th scope="col">Report</th>
  <th scope="col">Owner</th>
  <SlVisuallyHidden as="th" scope="col">Actions</SlVisuallyHidden>
</tr>
```

`as` exists for exactly this: a `<span>` is not valid inside a `<tr>`. Pick the
element that is valid where you place the component.

## Skip links

Content that can receive focus must become visible when it does. Set `focusable`
so keyboard users can see what they have focused:

```vue
<SlVisuallyHidden focusable>
  <a href="#main">Skip to content</a>
</SlVisuallyHidden>
```

The component reveals itself while focus is anywhere inside it and hides again
when focus leaves. Without `focusable`, a focusable child is reachable by
keyboard but invisible, which strands sighted keyboard users on a control they
cannot see. Always pass `focusable` when the slot contains anything focusable.

## Live regions

A visually hidden live region announces an outcome that is otherwise conveyed
only visually:

```vue
<SlVisuallyHidden
  role="status"
  aria-live="polite"
>{{ status }}</SlVisuallyHidden>
```

Render the region before the text changes. A live region that is inserted and
populated in the same update is frequently not announced, so keep the element
mounted and change only its content.

## When not to use it

- **Content that should be gone for everyone.** Use `v-if`, `display: none`, or
  the `hidden` attribute. Hidden text is still read aloud in full.
- **As a replacement for real semantics.** A form control needs a `<label>`;
  putting hidden text near an input does not create that relationship. Use
  `<label>`, `aria-labelledby`, or `aria-describedby`.
- **For anything private.** The content is in the DOM and visible to anyone who
  inspects the page. This is not a security or privacy mechanism.
- **To hide long passages.** Everything inside is announced. Keep hidden text
  short and specific, and remember that a screen-reader user has no way to skim
  past it visually.

## Styling

The component applies its hiding declarations inline, so it works with no setup
and no CSS import. It renders one element with no wrappers.

Stable styling hooks are class `slop-visually-hidden`, `data-part="root"`, and
`data-state="hidden"` while the content is hidden (`data-state` is omitted while
revealed):

```css
.slop-visually-hidden[data-state='hidden'] {
  /* Applies only while the content is hidden. */
}
```

Because the declarations are inline, a stylesheet cannot override them without
`!important`. The supported override is a `style` binding, which Vue merges after
the component's own, so a conflicting declaration wins:

```vue
<SlVisuallyHidden
  :style="{ whiteSpace: 'normal' }"
>Still hidden</SlVisuallyHidden>
```

Overriding one declaration does not reveal the content. The declarations work
together, so making the content visible means undoing all of them — the box is
still 1px with `overflow: hidden` even after `position` changes. If content
needs to be visible some of the time, render it conditionally instead of
fighting the style:

```vue
<template>
  <span v-if="expanded">{{ label }}</span>
  <SlVisuallyHidden v-else>{{ label }}</SlVisuallyHidden>
</template>
```

## Accessibility and environment behavior

The component adds no role, never sets `aria-hidden`, and never becomes
focusable itself. Content stays in the accessibility tree and in document order,
so screen readers read it in sequence with the surrounding content and name
computation includes it.

Hiding uses the clip technique — a 1px clipped box rather than `display: none`,
`visibility: hidden`, or zero dimensions, each of which removes content from
assistive technology or risks doing so. The style sets no font size or text
spacing, so it never fights a consumer's text-resize or text-spacing needs.

Server-rendered markup is deterministic and identical to the client's, and setup
reads no browser globals. One consequence applies to `focusable`: reveal is
driven by `focusin` and `focusout` listeners, so a server-rendered instance does
not reveal on focus until Vue hydrates. The content remains present and operable
throughout that window.

The library ships no visual styling, so you own visible focus indication and the
size and spacing of any content that becomes visible.

Automated checks cannot tell you whether hidden text is correct, sufficient, or
appropriately terse. Verify it with a screen reader.

See the [approved SlVisuallyHidden specification](./visually-hidden-spec.md) for
the complete behavior and compatibility contract.
