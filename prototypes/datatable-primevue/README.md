# GHO-35 PrimeVue side-by-side prototype (throwaway)

Isolated comparison for [data-table-spec.md](../../docs/components/data-table-spec.md)
pre-freeze gate. **Do not merge.** Evidence for PR #265 only.

## Commands

From this directory (uses its own `pnpm-lock.yaml`, not the monorepo workspace root):

```bash
pnpm install
pnpm verify
```

`pnpm verify` runs `typecheck`, `build`, and Playwright (`test:e2e`).

Ghost table primitives are **local stubs** in `src/stubs/` so this folder does not depend on a built `@ghostvue/vue` package.

## Routes

| Path | Purpose |
| ---- | ------- |
| `/ghost` | Spec approval fixture (b), headless prototype API |
| `/prime` | Same fixture, PrimeVue DataTable |
| `/perf/ghost?rows=N` | Performance scenario |
| `/perf/prime?rows=N` | Performance scenario |
| `/harness/:mode` | Behavior parity harness (`local-full`, `server-page-local-filter`, `server-manual-filter`) |

Results are captured in [FINDINGS.md](./FINDINGS.md).