---
'@ghostvue/vue': patch
---

Modal `GhostDialog` and `GhostDrawer` keep focus on the restored trigger after
an overlay click in WebKit (Safari). WebKit sends no `mousedown` after the
overlay is removed on `pointerdown`, but still moved focus to `<body>`; the
dialog now reapplies the restored focus in the next task when focus was dropped
to `<body>`. A deliberate move to another control is kept.
