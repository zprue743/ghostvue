---
'@ghostvue/themes': patch
---

Fix themed Collapsible and Accordion panels that stayed partly visible when
closed (GHO-222). The `ghost-collapsible.css` animation shell set
`display: grid`, which outranked the user-agent `[hidden]` rule, and its block
padding kept the collapsed `0fr` row one padding-pair tall, so each closed
panel showed a bordered strip with the first line of body text clipped. Closed
themed panels now render `display: none` once `hidden` is applied, and the
shell's block padding collapses with the height transition, so the close
animation ends at zero. Open/close animation and the instant reduced-motion
path are unchanged.
