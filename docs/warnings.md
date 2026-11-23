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

## GHOST002

**Warning:** Dialog content missing accessible name

GhostDialogContent, GhostDrawerContent, and GhostCommandPaletteContent require an accessible name. Render GhostDialogTitle, GhostDrawerTitle, or GhostCommandPaletteTitle inside the content, or pass aria-label or aria-labelledby.

Related: [./components/dialog.md](./components/dialog.md)

## GHOST003

**Warning:** Alert dialog missing description

GhostDialogContent or GhostDrawerContent with role="alertdialog" should provide a description. Render GhostDialogDescription or GhostDrawerDescription inside the content, or pass aria-describedby.

Related: [./components/dialog.md](./components/dialog.md)

## GHOST004

**Warning:** DatePicker format callback threw

The GhostDatePicker format callback threw for {date}. The input shows the ISO YYYY-MM-DD text instead. Make format synchronous, pure, and total for valid CalendarDate values.

Related: [./components/date-picker.md](./components/date-picker.md)

## GHOST005

**Warning:** Deprecated API used

{api} is deprecated since {since} and will be removed in {removal}. {migration}

Related: [./standards/component-stability.md](./standards/component-stability.md)

## GHOST006

**Warning:** Duplicate command palette item id

Two GhostCommandPaletteItem components in one palette use the id "{id}". Give every command a unique, stable id; duplicates share one highlight and registry entry.

Related: [./components/command-palette.md](./components/command-palette.md)

