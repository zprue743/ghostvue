<!-- Generated from packages/vue/src/dev-codes.ts. Do not edit by hand. -->

# Development diagnostic codes

GhostVue reports API misuse in development with stable `GHOST0xx` codes.
Each code is assigned once and is never reused, including after a warning
is removed. Production builds should not contain these strings: the library
ships `process.env.NODE_ENV !== 'production'` so the consumer bundler can
dead-code-eliminate the diagnostic.

Console format:

```text
[ghostvue GHOST001] <message> See <docs url>
```

This page is generated from `packages/vue/src/dev-codes.ts`.
Update the catalog, then rewrite this file from `renderGhostCodeDocs()`.

## GHOST001

**Warning:** Controlled and uncontrolled state mixed

A component switched from {from} to {to}. Pass the value prop for the lifetime of the instance, or omit it and use default*.

Related: [./architecture/component-state.md](./architecture/component-state.md)

