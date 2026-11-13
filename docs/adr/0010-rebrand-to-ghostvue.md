# ADR 0010: Rebrand to GhostVue

- Status: accepted
- Date: 2026-11-12
- Decision owners: Zac Pruett
- Supersedes: the `Sl` / `useSl*` prefix rule in
  [ADR 0003](./0003-public-component-api-conventions.md)

## Context

The library shipped as slop-ui (`@slop-ui/*`, `Sl*` components, `--sl-*`
custom properties, `data-sl-*` attributes, `.slop-*` classes). The owner
approved a full rebrand to GhostVue. This is a mechanical rename: public
behavior, visual appearance, and the GitHub repository URL stay the same.

ADR 0003 had accepted `Sl` as the Vue prefix (short, distinct from Vuetify's
`V`) and `slop-` for CSS so the library did not collide with Shoelace's
`sl-` custom-element namespace. Those names are the brand. Changing the brand
changes the prefix.

## Decision

Apply this map everywhere, including all case variants:

| Kind                          | Before                               | After                              |
| ----------------------------- | ------------------------------------ | ---------------------------------- |
| Prose brand                   | slop-ui / Slop UI / SlopUI / slop ui | GhostVue                           |
| Identifier / slug             | slop-ui                              | ghostvue                           |
| npm scope                     | `@slop-ui/*`                         | `@ghostvue/*`                      |
| Vue components, types         | `SlButton`, `Sl*`                    | `GhostButton`, `Ghost*`            |
| Composables                   | `useSlButton`, `useSl*`              | `useGhostButton`, `useGhost*`      |
| CSS classes                   | `.slop-button`, `.slop-*`            | `.ghost-button`, `.ghost-*`        |
| CSS custom properties         | `--sl-*`, `--_slop-*`                | `--ghost-*`, `--_ghost-*`          |
| Data attributes               | `data-sl-theme`, `data-sl-*`         | `data-ghost-theme`, `data-ghost-*` |
| Diagnostic codes              | `SLOP001`, `slopCodes`               | `GHOST001`, `ghostCodes`           |
| Plugin / resolver (specified) | `SlopUi`, `SlopUiResolver()`         | `GhostVue`, `GhostVueResolver()`   |

Keep Button `variant="ghost"` unchanged, so
`<GhostButton variant="ghost">` remains valid.

Keep `github.com/zprue743/slop-ui` and Linear issue ids (`SLO-*`). The
repository, Linear workspace, and Vercel project names are not renamed in
this change.

Registration, `GlobalComponents`, flattened compound names, and the rest of
ADR 0003 still stand. Only the prefix string changes.

## Alternatives considered

**Keep `Sl` / `@slop-ui` while changing marketing copy only.** Rejected. The
owner asked for one name in prose, packages, components, and CSS.

**Rename the GitHub repository in the same change.** Deferred. Existing
issue, PR, and compare links stay valid.

**Change the Button `ghost` variant.** Rejected. That value is a visual
treatment, not the brand prefix.

## Consequences

- Every published package name, import path, component export, CSS hook, and
  diagnostic code is a breaking rename for consumers.
- Historical ADRs keep their decisions. Identifiers in those docs are updated
  so current names are not misleading, with a one-line pointer at this ADR.
- Shoelace still owns `sl-` custom elements. `ghost-` / `--ghost-` /
  `data-ghost-*` continue to avoid that namespace.

## Compatibility implications

Breaking for any consumer of `@slop-ui/*`, `Sl*` components, `--sl-*`
variables, `data-sl-*` attributes, `.slop-*` classes, or `SLOP0xx` codes.
Migration is a mechanical find-and-replace along the map above. No visual or
runtime behavior change is intended. No SSR, accessibility, or token-value
change. First release remains pre-1.0; this is still a named breaking change.

## Amendment

2026-11-11: The GitHub repository was renamed to zprue743/ghostvue (old URLs
redirect). 2026-11-12: the Linear team key changed from SLO to GHO with the same
issue numbers; docs now cite GHO-n.
