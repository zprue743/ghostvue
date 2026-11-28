# GhostToast

`GhostToast` shows short, non-blocking notifications: an operation result, a
finished background job, or a recoverable error that should not interrupt with a
dialog. Sighted users see a small stack near an edge of the screen. Screen
reader users hear each notification once, when it appears, and focus never
moves to the stack.

Import the provider, viewport, and `useGhostToast` from `@ghostvue/themes` for a
styled corner stack. The themed wrappers add styling only: the store, timers,
announcements, and keyboard behavior are the headless ones from
`@ghostvue/vue`. Teams that bring their own design system or need custom toast
markup can start from
[Advanced: custom rendering and headless composition](#advanced-headless-composition).

## Save and retry {#themed-use}

<GhostExample id="toast/themed" />

The example imports every component from `@ghostvue/themes`. Try both buttons:

- **Success.** **Save draft** shows an informational "Draft saved" toast. It is
  announced politely and dismisses itself after 8 seconds. Hovering it or
  moving focus into it pauses the countdown.
- **Persistent error.** **Sync files** shows "Sync failed" with a **Retry**
  action. `type: 'error'` keeps it on screen until someone dismisses it, and
  the themed toast picks the danger tone.
- **Retry.** **Retry** calls `update()` on the same `id`. The toast changes to
  "Still failing" and counts the attempt, but it keeps its place in the stack,
  focus stays on **Retry**, and the enter animation does not play again.
  `announceUpdate: true` reads the new text once. Pressing **Sync files** again
  while the toast is visible calls `update()` on the same id with
  `announceUpdate: true`, so the reset to "Sync failed" is announced too and
  the stack never fills with duplicate errors.
- **Dismiss.** The portaled stack comes last in the page's tab order, oldest
  toast first. Press `Enter` or `Space` on a **Dismiss** button, or `Escape`
  anywhere in a toast, to remove only that toast. Focus returns to the control
  you used before entering the stack.

The source keeps one function per outcome (`saveDraft`, `syncFiles`,
`retrySync`) so each `toast()` and `update()` call reads on its own. The
sample stays offline on purpose. In an app, call `update()` with a success
message when the retry succeeds.

## Set up the provider {#basic-use}

Render one `GhostToastProvider` near the root of your app, with one
`GhostToastViewport` inside it. Any descendant component publishes with
`useGhostToast()`:

```vue
<!-- App.vue -->
<script setup lang="ts">
import { GhostToastProvider, GhostToastViewport } from '@ghostvue/themes'
</script>

<template>
  <GhostToastProvider>
    <RouterView />
    <GhostToastViewport />
  </GhostToastProvider>
</template>
```

```ts
// Any component under the provider
import { useGhostToast } from '@ghostvue/themes'

const { toast } = useGhostToast()

function onSaved() {
  toast({ title: 'Draft saved', description: 'Your changes are stored.' })
}
```

`toast()`, `update()`, `dismiss()`, and `dismissAll()` can be called outside
`setup`, for example from an event handler or after an `await`.
`useGhostToast()` itself must run in a component under a provider; without one it
throws.

State belongs to the provider. There is no module-global queue, so two
providers never share toasts and each server request renders its own provider.

`@ghostvue/themes` exports a themed `GhostToastViewport` and `GhostToast`, and
re-exports the other parts and `useGhostToast` from `@ghostvue/vue`. Importing
from `@ghostvue/themes` loads `default.css`.

| Part                    | Element              | Role                                                                  |
| ----------------------- | -------------------- | --------------------------------------------------------------------- |
| `GhostToastProvider`    | none                 | Owns the store, timers, and queue for its subtree.                    |
| `GhostToastViewport`    | `div` or `section`   | Notification region with the visible stack and two hidden announcers. |
| `GhostToast`            | `div`                | One visible toast. Takes a `toast` record. No live-region role.       |
| `GhostToastTitle`       | `div`                | Primary line.                                                         |
| `GhostToastDescription` | `div`                | Optional supporting copy.                                             |
| `GhostToastAction`      | `button type=button` | Runs the `action.onClick` given to `toast()`. Does not dismiss.       |
| `GhostToastClose`       | `button type=button` | Dismisses its toast.                                                  |

## Imperative API

`useGhostToast(options?)` returns:

| Member       | Contract                                                                               |
| ------------ | -------------------------------------------------------------------------------------- |
| `toasts`     | Readonly ref of the **visible** toasts, oldest first.                                  |
| `toast`      | Creates a toast and returns its id. Reusing the id of a toast in the store updates it. |
| `update`     | Merges fields into a waiting or visible toast. Unknown ids are ignored.                |
| `dismiss`    | Removes a toast. A freed visible slot shows the oldest waiting toast.                  |
| `dismissAll` | Removes every visible and waiting toast and cancels their timers.                      |

`options` are defaults merged into every `toast()` call from that instance, for
example `useGhostToast({ type: 'error' })` in an error boundary.

`toast()` options:

| Field         | Default     | Notes                                                                                 |
| ------------- | ----------- | ------------------------------------------------------------------------------------- |
| `title`       | required    | Non-empty after trimming; otherwise the call is ignored (`GHOST011`).                 |
| `description` | none        | Shown and announced after the title.                                                  |
| `id`          | generated   | Pass one for "latest status" toasts. Generated ids look like `${storeKey}:auto:${n}`. |
| `type`        | `'default'` | `'error'` persists until dismissed. A styling hook, not an ARIA role.                 |
| `urgency`     | `'default'` | `'urgent'` announces through the assertive region. See [Urgency](#urgency).           |
| `duration`    | provider    | Informational toasts only. `null` or `0` persists; a positive number is milliseconds. |
| `action`      | none        | `{ label, onClick }`. The toast persists until dismissed.                             |
| `onDismiss`   | none        | Called once when the toast leaves the store, for any reason. Not called on updates.   |

### Stable ids and updates

Pass an explicit `id` when one toast should represent one piece of state, such
as a save or upload status. The [first example](#themed-use) does this for its
sync status. Calling `toast({ id })` again, or `update(id, patch)`, changes the
toast in place: it keeps its position, its visible slot, and its key, so
nothing re-mounts. A dismissed id can be used again for a new toast.

`update()` does not re-announce by default, so routine progress changes stay
quiet. Pass `announceUpdate: true` to announce the merged title and description
again when the change matters (for example "Upload failed").

```ts
const { toast, update } = useGhostToast()

toast({ id: 'upload', title: 'Uploading…', duration: null })
update('upload', { title: 'Uploading 60%' }) // silent
update('upload', {
  title: 'Upload failed',
  type: 'error',
  urgency: 'urgent',
  announceUpdate: true,
})
```

Explicit ids must not start with the provider's generated prefix
(`…:auto:`). Such a call warns (`GHOST009`) and can only update an existing toast.

## Duration rules

1. `type: 'error'` toasts and toasts with an `action` **persist** until the user
   or your code dismisses them. A `duration` on them is ignored with a
   development warning (`GHOST007`).
2. Informational toasts use their own `duration` when it is set: `null` or `0`
   persists, a positive number is milliseconds. A negative or non-finite value
   warns (`GHOST008`) and is treated as unset.
3. Otherwise the provider `duration` applies (default **8000 ms**). Provider
   `duration: 0` makes informational toasts persist. An invalid provider value
   warns and uses 8000.

Timers pause while the pointer is over a toast, while focus is inside it, and
while the page is hidden. Pauses overlap: a toast that is both hovered and
focused resumes only after both end, with the time it had left. A toast that
waits in the queue does not use up its time; its countdown starts when it is
shown. Changing `duration` with `update()` restarts a longer interval and keeps
the elapsed time for a shorter one.

## Queue and limit

At most `limit` toasts (default 3) are visible. Later toasts wait in creation
order and appear as visible toasts leave. The waiting queue has no cap; more
than 20 waiting toasts logs a development warning (`GHOST010`), which usually
means a loop is calling `toast()`. Reuse an id to update one toast instead.
The [headless stack example](#headless-stack) sends five toasts to a provider
with `:limit="3"`.

## Themed stack

- **Stack:** the themed viewport sets `data-themed`, so the portaled region is a
  fixed stack in the bottom-end corner (logical insets, so it flips in RTL),
  above modal layers. The empty region ignores pointer events. With
  `:portal="false"` it also sets `data-inline` and stays in normal flow, so
  your layout places it.
- **Default content:** without slots, each toast renders as a themed
  `GhostToast` with title, description, an outlined action, and an icon-only
  close button named "Dismiss". A `toast` or `default` slot replaces that
  content; see [Custom rendering](#custom-rendering).
- **Variant and tone:** the themed `GhostToast` takes `variant`
  (`'surface'` default, or `'solid'`) and `tone` (`'neutral'`, `'accent'`,
  `'danger'`). Without `tone`, `type: 'error'` toasts use `danger` and others
  `neutral`. Defaults omit `data-variant` and `data-tone`, as on
  `GhostInlineAlert`.
- **Appearance:** portaled toasts get token values from the nearest
  `data-ghost-theme` (or `.ghost-theme`) ancestor, usually `<html>`, as other
  portaled themed surfaces do. On this site the stack follows the light or dark
  appearance you pick.

### Motion

The themed toast plays a short enter animation (fade and rise by
`--ghost-motion-translate` over `--ghost-motion-enter-duration` with
`--ghost-motion-enter-easing`) once, when its element is inserted. There is no
exit animation: dismissed toasts unmount immediately. With
`prefers-reduced-motion: reduce` there is no animation at all.

The viewport keys each toast by id, so `update()` and a repeated `toast()` with
the same `id` patch the existing element and the animation does not replay,
even when the update changes the type or tone. A new id is a new toast and
animates in.

## Server rendering

The provider starts no timers and adds no listeners on the server. The viewport
renders an empty region and two empty announcers, so hydration is stable.

- During server rendering, `toast()` does nothing and warns in development
  (`GHOST006`). Server-rendered pages never carry toasts from another request.
- On the client, toasts created before the viewport mounts wait silently. When
  the viewport mounts they are shown, announced, and their timers start.

## Modals and live regions

The viewport and both announcers carry `data-ghost-live`. While a modal
`GhostDialog` or `GhostDrawer` is open, they stay outside the inert background
([ADR 0012](../adr/0012-modal-overlays.md)), so announcements are still heard
and toasts stay operable. Pressing a toast does not count as an outside press
that closes the dialog, and the dialog's focus trap does not pull focus back
out of the stack. Tab from a toast returns to the dialog.

Keep the default `portal` so the stack is a sibling of the dialog under
`<body>`. A viewport rendered inside your app root becomes inert with it. The
headless `toast/persist-error` example on the
[GhostToast reference page](/reference/vue/ghost-toast) shows an urgent error
above an open dialog.

## Urgency

Ordinary toasts announce through a polite `role="status"` region, which waits
for the screen reader to finish speaking. Use `urgency: 'urgent'` only for a
message that needs immediate attention, such as a failed payment or lost
connection. It announces through an assertive `role="alert"` region and
interrupts. `type: 'error'` alone does not make a toast urgent, so the first
example's sync error is announced politely.

## Accessibility

- **Region:** the viewport is `role="region"` named by the provider `label`.
  Pass `aria-labelledby` (or `aria-label`) to the viewport to name it yourself;
  the default `aria-label` is then dropped.
- **Announcements:** two visually hidden live regions sit next to the region:
  polite (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) and
  assertive (`role="alert"`). Each show writes the title and description to
  exactly one of them, in a new keyed node so identical messages are announced
  again. Toasts shown in the same tick are joined into one announcement.
  Waiting toasts are announced only when they are shown; dismissal is silent.
- **Toast roots** have no role, so the message is not announced twice.
- **Focus:** creating, updating, promoting, and expiring toasts never moves
  focus. Each toast's buttons are in the normal tab order, oldest first; there
  is no roving focus.
- **Keyboard:** `Enter` and `Space` activate the focused action or close button.
  `Escape` with focus inside a toast dismisses only that toast and stops the
  event, so a dialog behind the stack stays open.
- **Focus return:** when a toast that holds focus is removed (Escape, Close, or
  an action that dismisses), focus returns to the element that had it before
  focus entered the region.
- **Time:** errors and toasts with actions persist. Informational toasts
  auto-dismiss after 8 seconds by default and pause on hover, focus, and a
  hidden page. Do not put the only path to an action in an auto-dismissing
  toast.
- **Close names:** give `GhostToastClose` visible text or an `aria-label`.

## Advanced: custom rendering and headless composition {#advanced-headless-composition}

This section is for teams that bring their own design system, or that need
markup the default toast content does not render.

### Custom rendering

Without slots, the viewport renders each toast as title, description, action,
and a **Dismiss** button. Use the `toast` slot to render your own content per
visible toast; the viewport keeps the list keyed by id. With the themed
viewport, render the themed `GhostToast` from `@ghostvue/themes` to keep the
recipe and pick a variant or tone:

```vue
<GhostToastViewport>
  <template #toast="{ toast }">
    <GhostToast :toast="toast" variant="solid" tone="accent">
      <GhostToastTitle>{{ toast.title }}</GhostToastTitle>
      <GhostToastDescription v-if="toast.description">
        {{ toast.description }}
      </GhostToastDescription>
      <GhostToastAction v-if="toast.action">
        {{ toast.action.label }}
      </GhostToastAction>
      <GhostToastClose aria-label="Dismiss notification">×</GhostToastClose>
    </GhostToast>
  </template>
</GhostToastViewport>
```

The `default` slot receives `{ toasts, dismiss }` and replaces the whole stack.
Render one `GhostToast` per record with `:key="toast.id"`. The `toasts` ref from
`useGhostToast()` holds the same records if you render the stack elsewhere.

Each record has `id`, `type`, `urgency`, `title`, `description`, `action`, the
resolved `duration` (`null` when it persists), `remainingMs`, `pauseReasons`,
and `state`.

### Headless stack

<GhostExample id="toast/queue-overflow" />

The same names imported from `@ghostvue/vue` are headless: the parts render
plain elements with `data-part` hooks and no styles, and the headless layer has
no animation. Stack position, gaps, and stacking order are yours to set. The
example renders its own toast content through the `toast` slot, keeps the
viewport in place with `:portal="false"`, and styles the stack with a scoped
class. A portaled headless viewport needs an unscoped stylesheet, because the
teleported region does not carry the component's scoped attribute.

The [GhostToast reference page](/reference/vue/ghost-toast) also renders the
headless `toast/basic` (one informational toast) and `toast/persist-error`
(an urgent error above a dialog) examples.

### Styling hooks

| Part                | Class                     | `data-part`           | Other hooks                              |
| ------------------- | ------------------------- | --------------------- | ---------------------------------------- |
| Viewport            | `ghost-toast-viewport`    | `viewport`            | `data-ghost-live`                        |
| Toast               | `ghost-toast`             | `root`                | `data-ghost-toast`, `data-type="error"`  |
| Title               | `ghost-toast-title`       | `title`               | none                                     |
| Description         | `ghost-toast-description` | `description`         | none                                     |
| Action              | `ghost-toast-action`      | `action`              | none                                     |
| Close               | `ghost-toast-close`       | `close`               | none                                     |
| Polite announcer    | none                      | `announcer-polite`    | visually hidden, not for visible styling |
| Assertive announcer | none                      | `announcer-assertive` | visually hidden, not for visible styling |

`data-type` is omitted for default toasts. The themed toast adds
`data-themed`, and `data-variant` and `data-tone` when they are not the
defaults.

## API

<!-- @generated docs-api:vue/ghost-toast begin -->

<!-- Source: packages/vue/manifests/ghost-toast.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop    | Type               | Default  | Description                                                    |
| ------- | ------------------ | -------- | -------------------------------------------------------------- |
| `toast` | `GhostToastRecord` | Required | Record to render, usually one item of the viewport's `toasts`. |

| Slot      | Slot props                                       | Description      |
| --------- | ------------------------------------------------ | ---------------- |
| `default` | `dismiss: () => void`, `toast: GhostToastRecord` | Primary content. |

<!-- @generated docs-api:vue/ghost-toast end -->

<!-- @generated docs-api:themes/ghost-toast begin -->

<!-- Source: packages/themes/manifests/ghost-toast.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostToast` API, which it forwards:

| Prop      | Type                                | Default     | Description                                                                                                           |
| --------- | ----------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `variant` | `'surface' \| 'solid'`              | `"surface"` | Visual treatment. The default omits data-variant.                                                                     |
| `tone`    | `'neutral' \| 'accent' \| 'danger'` | —           | Semantic color intent. When unset, type 'error' maps to danger and other records to neutral. Neutral omits data-tone. |

<!-- @generated docs-api:themes/ghost-toast end -->

## Provider and viewport props

| Prop (provider) | Default           | Contract                                                        |
| --------------- | ----------------- | --------------------------------------------------------------- |
| `duration`      | `8000`            | Default interval for informational toasts. `0` persists.        |
| `limit`         | `3`               | Visible toasts. An invalid value warns (`GHOST008`) and uses 3. |
| `label`         | `'Notifications'` | Accessible name of the viewport region.                         |

| Prop (viewport) | Default | Contract                                                                                      |
| --------------- | ------- | --------------------------------------------------------------------------------------------- |
| `as`            | `'div'` | `'section'` makes the region a landmark in more screen readers.                               |
| `portal`        | `true`  | Teleports the region and announcers to `document.body` after mount. `false` renders in place. |

Every part merges your `class` and `style` and exposes `element`. Action and
Close also expose `focus()` and `blur()`. Close and Action emit `click` after
they dismiss or run the action.

See the [generated component references](/reference/) for every part's props,
slots, and examples.

## Specification

See [GhostToast specification](/specs/toast) and, for feedback next to the
related content, [GhostInlineAlert](./inline-alert.md).
