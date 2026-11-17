---
'@ghostvue/vue': patch
---

Mark the shared visually hidden style object as pure so bundlers tree-shake it
from component imports that never use it.
