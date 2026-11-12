# Project philosophy

GhostVue aims to pair readable Vue ergonomics with the depth required by complex
application interfaces. Simple use should look simple; consumers should meet
complexity only when their problem requires it.

The preferred customization progression is:

```text
props and configuration
  -> callbacks
  -> slots and render customization
  -> lower-level primitives
```

Configuration describes intent—such as searchable, clearable, or virtualized—not
the library's nested DOM. Opinionated defaults are welcome; architectural dead
ends are not.

The library must not demand proprietary records for ordinary consumer data.
Future data-heavy APIs should support conventional properties, useful nested
paths, typed accessors, identity callbacks, and adapters for unusual sources.

## Product principles

- Vue-first and idiomatic rather than a second framework hidden inside Vue.
- Headless functionality with replaceable optional styling.
- Excellent TypeScript as a form of product documentation.
- Accessibility specified before implementation.
- Backwards compatibility and migration impact considered at public boundaries.
- Composition over slightly different copies of existing capabilities.
- Evidence before abstraction; predictability before cleverness.

GitHub issues #1–#19 are sequenced toward DataTable in the
[component roadmap](./roadmap.md). Query tooling and scheduling remain
directional; do not invent generic architecture solely to anticipate them.
