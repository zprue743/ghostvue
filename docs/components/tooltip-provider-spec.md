# GhostTooltipProvider specification

**Status:** Approved for GHO-118 (`GhostTooltipProvider`).

## Purpose

`GhostTooltipProvider` groups adjacent `GhostTooltip` instances so pointer moves
between triggers can skip the open delay after a tooltip has already been shown,
matching Radix Tooltip Provider and WAI-ARIA APG timing guidance for
supplemental hover content.

## Public API

Headless export from `@ghostvue/vue`:

- `GhostTooltipProvider` (renderless wrapper; `provide` / `inject` only)
- Types: `GhostTooltipProviderProps`, `GhostTooltipProviderContext`
- `ghostTooltipProviderContextKey` for advanced composition

| Prop                | Type     | Default | Contract                                                                            |
| ------------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `delayDuration`     | `number` | `700`   | Default open delay for descendant roots that omit `delayDuration`.                  |
| `skipDelayDuration` | `number` | `300`   | Window after a descendant closes during which the next pointer show uses delay `0`. |

`GhostTooltipProvider` has no emits, slots beyond the default, or exposed
methods.

## Behavior

- The **first** pointer-driven open for any tooltip under a provider uses the
  resolved open delay (provider default or per-root override).
- After at least one descendant has opened, the next pointer-driven show uses
  delay `0` when another descendant is still open, or when the pointer reaches a
  new trigger within `skipDelayDuration` of the previous descendant closing.
- Per-root `delayDuration` on `GhostTooltip` overrides the provider default for
  delay resolution; skip-delay still applies unless the override path is tested
  with that explicit delay as the base.
- **Keyboard focus** scheduling is unchanged: skip-delay is not applied on
  `focusin`.
- Tooltips **outside** a provider keep today’s defaults (`700` ms when
  `delayDuration` is omitted).

## Test plan

- Unit tests with Vitest fake timers in `GhostTooltipProvider.test.ts`.
- Type tests in `packages/vue/type-tests/GhostTooltipProviderConsumer.vue`.
- Docs example `examples/tooltip-provider/skip-delay.vue`.

## Compatibility

Additive minor release for `@ghostvue/vue`; no breaking API changes.
