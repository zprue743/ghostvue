# GhostPresence

`GhostPresence` keeps a closing surface in the DOM while its own CSS exit
transition or animation plays, then unmounts it. Logical state still changes
at once: the surface switches to `data-state="closed"`, leaves the
accessibility tree, and stops taking pointer input the moment it closes. It
renders no wrapper element and ships no CSS. Built-in overlays already use it,
so most apps never import it; reach for it when you build your own panel,
inspector, or overlay. Its composable, `useGhostPresence`, is covered in
[Advanced: the composable](#advanced-the-composable).

## Inspector panel

<GhostExample id="presence/basic" />

The panel fades and slides out before it unmounts. Plain CSS targets the
`data-state` hook, with `@starting-style` for entry:

```css
.panel {
  transition:
    opacity 120ms ease,
    translate 120ms ease;
  @starting-style {
    opacity: 0;
    translate: 0 0.5rem;
  }
}

.panel[data-state='closed'] {
  opacity: 0;
  translate: 0 0.5rem;
}
```

When the default slot renders a single element or component, `GhostPresence`
adds `data-state` (unless the child sets its own), plus `inert` and
`pointer-events: none` while the exit runs. Your own `ref`, `class`, `style`,
and `inert` are kept, and come back unchanged if the panel reopens. The
`exitComplete` event fires once the panel has unmounted.

## Built-in overlays

`GhostDialog`, `GhostDrawer`, `GhostPopover`, `GhostHoverCard`,
`GhostCommandPalette`, and `GhostDatePicker` animate out with no extra props.
The `@ghostvue/themes` recipes fade them out, faster than they enter (see
[Motion](../themes/motion.md#overlay-entry-and-exit)). Without a theme, write
exit CSS against `[data-state='closed']` on the part classes, for example
`.ghost-dialog-content[data-state='closed']`. With no exit CSS the surface
unmounts in the same frame, exactly as before.

## Portals and multi-root slots

<GhostExample id="presence/portal" />

`GhostPresence` can sit inside `GhostPortal`, and the surface stays in the
portal target until it unmounts. When the slot renders a fragment, several
roots, or a portal wrapper, there is no single element to decorate. Bind the
slot props on the surface whose motion should gate removal:

```vue
<GhostPresence v-slot="{ state, exiting, setElement }" :present="open">
  <div class="scrim" :data-state="state"></div>
  <div
    :ref="setElement"
    class="sheet"
    :data-state="state"
    :inert="exiting || undefined"
  >
    …
  </div>
</GhostPresence>
```

In development, closing a multi-root slot that never bound `setElement` logs
[`GHOST014`](../warnings.md#ghost014) once, and the slot unmounts at once
instead of waiting.

## Timing and accessibility

- **Focus returns immediately.** Overlays restore focus, release the focus
  trap, unlock scrolling, and clear background `inert` at logical close, not
  when the fade ends. Removing the node later never moves focus again.
- **The departing surface is inert.** It is hidden from assistive technology,
  cannot receive focus, and lets clicks and taps through to the page beneath.
- **Escape reaches the next layer.** A closing overlay has already left the
  layer stack, so a second `Escape` closes the overlay underneath.
- **Reopening is seamless.** Opening again mid-exit reuses the same element and
  reverses the transition from where it is. A late `transitionend` from the
  interrupted exit is ignored.
- **Only the surface's own motion counts.** Transitions and animations on
  descendants, such as a spinner inside the panel, never delay removal.
  Infinite animations on the surface are ignored, and finite repeats run to the
  end.
- **Reduced motion follows your CSS.** `GhostPresence` waits for whatever
  duration the stylesheet resolves. The themes fade over
  `--ghost-motion-fade-duration`; `transition: none` unmounts at once.

Set `disabled` to skip the exit and unmount immediately.

## Advanced: the composable

`useGhostPresence` is the same lifecycle without a component, for teams that
render their own surface element. Bind `isPresent` to `v-if`, `dataState` to
`data-state`, and `setElement` as the template ref:

```ts
import { ref } from 'vue'
import { useGhostPresence } from '@ghostvue/vue'

const open = ref(false)
const presence = useGhostPresence({
  present: open,
  onExitComplete: () => console.log('removed'),
})
// presence.isPresent, presence.phase ('closed' | 'open' | 'exiting'),
// presence.dataState ('open' | 'closed'), presence.isExiting,
// presence.setElement
```

Apply `inert` and `pointer-events: none` yourself while `isExiting` is true.
The composable touches no browser globals during setup, so it renders on the
server; a surface that closes before mount skips the exit.

## API

See the [generated component references](/reference/) for props, events, slots,
and executable examples, and the [specification](/specs/presence) for the
full contract.

<!-- @generated docs-api:vue/ghost-presence begin -->

<!-- Source: packages/vue/manifests/ghost-presence.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop       | Type      | Default  | Description                                                                                                                   |
| ---------- | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `disabled` | `boolean` | `false`  | When `true`, bypasses exit waiting and unmounts immediately when `present` turns `false`.                                     |
| `present`  | `boolean` | Required | Logical open/mounted state. When `true`, mounts the default slot; when `false`, transitions through `exiting` before unmount. |

| Event          | Payload | Description                                                                                                                                                  |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `exitComplete` | `void`  | Emitted once when an exit finishes and the slot unmounts. Not emitted when a reopen interrupts the exit, when disabled skips it, or when the owner unmounts. |

| Slot      | Slot props                                                                                                                                    | Description                                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | `exiting: boolean`, `phase: GhostPresencePhase`, `present: boolean`, `setElement: (target: unknown) => void`, `state: GhostPresenceDataState` | Content mounted while present. A single element or component root is decorated automatically; otherwise bind `setElement`, `state`, and `exiting` on the animated surface. |

<!-- @generated docs-api:vue/ghost-presence end -->
