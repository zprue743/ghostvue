# GHO-35 DataTable — PrimeVue side-by-side findings (throwaway)

Evidence for [PR #265](https://github.com/zprue743/ghostvue/pull/265) / `docs/components/data-table-spec.md` pre-freeze gate.
**Do not merge this prototype.**

## Verification commands (2026-11-22)

From `prototypes/datatable-primevue/`:

```bash
pnpm install
pnpm verify
```

`pnpm verify` output (11/11 Playwright tests, typecheck, build):

```
  ✓  tests/a11y.spec.ts (ghost, prime)
  ✓  tests/approval-fixture.spec.ts (ghost, prime)
  ✓  tests/behavior-parity.spec.ts (3)
  ✓  tests/performance.spec.ts (ghost/prime × 1k/10k)
  11 passed (~5.3s)
```

```bash
pnpm run test:loc
```

```json
{
  "ghostConsumerNonBlankLines": 171,
  "primeConsumerNonBlankLines": 95,
  "ghostPrototypeImplementationLines": 673
}
```

Ghost fixture markup uses **local table/checkbox stubs** (not shipped `@ghostvue/vue`) so the folder stays install-isolated; behavior matches the spec’s composition model, not production `GhostCheckbox` wiring.

Typecheck (`pnpm run typecheck`):

- `defineDataTableColumns`: `value.toFixed(2)` compiles; `value.toUpperCase()` fails under `strict` (`src/type-tests/column-types.pass.ts`).
- PrimeVue `Column field="…"`: **no** equivalent compile-time break for a wrong key (string field names).

---

## 1. Developer experience

| Dimension | GhostVue headless (prototype) | PrimeVue DataTable |
| --------- | ----------------------------- | ------------------ |
| Consumer non-blank LOC (fixture only) | **171** | **95** |
| Library code consumer must understand | Composable + slot bindings (673 LOC throwaway impl in `src/ghostvue/`) | Declarative columns + v-models |
| Typing | Column accessors typed via `defineDataTableColumns` | `field` is `string`; row typing is loose |
| Markup / styling | Consumer owns full `<table>` shell, empty row, detail `<tr>`, filter UI | Built-in paginator, selection/expansion columns, themed cells |
| Server mental model | Explicit `manual*` flags + single `stateChange` | Stateful `lazy` / events differ; fewer forced coalescing rules |

**Ghost wins** on typed columns and explicit server/local boundaries. **Prime wins** on brevity for the same visible screen.

---

## 2. Behavior parity (Zac’s recorded decisions)

Harness: `/harness/:mode` + Playwright `behavior-parity.spec.ts`.

| Scenario | Spec expectation | Ghost prototype | PrimeVue (fixture) |
| -------- | ---------------- | --------------- | ---------------- |
| Local select-all | `getPrePaginationRowModel()` (filtered, all pages) | **Pass** — select-all count matches pre-pagination filter set | Select-all is **page scoped** by default (`SelectionMode` / paginator interaction) — does **not** match spec’s local rule without custom logic |
| Server select-all | `getRowModel()` visible rows only | **Pass** (composable rule) | Page-level checkbox semantics; cross-page ids need custom `dataKey` + selection state |
| IDs across pages | Persist in `selectedRowIds` | **Pass** (harness + composable) | Supported via `dataKey` + v-model selection |
| One `stateChange` per action | Single emit with full `query` | **Pass** after suppressing duplicate pagination emit on server filter reset (found during prototype) | N/A — no `stateChange`; filter/page emit separate events |
| Page-local filter on page 4 | Stay on page 4, **zero** server requests | **Pass** | Paginator resets page on filter by default — **differs** |
| Server filter | page → 1, **one** fetch | **Pass** (sync flush + coalesced emit) | Typical filter triggers paginator reset (closer to server rule) |
| Null cells in text match | Skip null/undefined | **Pass** (`filtering.ts`) | Global filter uses custom OR in fixture; Prime filter rules differ per column API |

**Prototype gap surfaced:** filter-driven pagination reset must not emit a second `stateChange` for the automatic page-index correction — spec should state pagination side-effects are coalesced into the filter `stateChange` only.

---

## 3. Accessibility

Playwright + `@axe-core/playwright` on `table` scope (`tests/a11y.spec.ts`).

| Check | Ghost | Prime |
| ----- | ----- | ----- |
| Approval script: `Space` on checkbox, sort button, expand | **Pass** | Partial (Prime expand/sort differ; row checkbox OK) |
| `aria-sort` on sorted column | **Pass** (`getHeaderCellProps`) | Sortable headers use Prime markup (verify in real theme) |
| Header mixed selection | `indeterminate` on checkbox stub | Prime tri-state header built-in |
| axe on table | Minor `empty-table-header` on icon-only `<th>` | **`aria-selected` on checkbox div** (critical, Prime internal) + empty header on expander column |

Attach reports: Playwright artifacts `axe-ghost`, `axe-prime` per run.

---

## 4. Performance (informational)

Method: Playwright `performance.mark` / `measure` around sort click and filter input (`input` event), double `requestAnimationFrame` before end mark. **Not** CI-grade; numbers vary by host.

| Rows | Implementation | sort (ms) | filter (ms) |
| ---- | -------------- | --------- | ----------- |
| 1,000 | Ghost prototype | ~15.7 | ~24.8 |
| 1,000 | PrimeVue | ~43.0 | ~32.2 |
| 10,000 | Ghost prototype | ~55.9 | ~61.4 |
| 10,000 | PrimeVue | ~64.4 | ~43.0 |

Both stay on the order of tens of ms for this fixture (client-only full dataset in memory; Prime paginator still holds 10k row objects in Vue state). Treat as directional, not a gate.

---

## 5. Recommended spec changes for #265

1. **`stateChange` coalescing:** Document that when `manualFiltering: true` resets `pageIndex` to 1, consumers receive **one** `stateChange` with `trigger: 'globalFilter' | 'columnFilters'`, not a follow-up `pagination` emit. *(Found duplicate emit in prototype.)*
2. **`GhostDataTableTable` / cell render:** Spec example uses `<component :is="cell.column.cell">`; `cell` is a function, not a component — change to `cell()` call or a small `DataTableCell` helper. *(Prototype used `cell(ctx)` in template.)*
3. **Select-all vs Prime parity:** Add a short “comparison note” that local select-all across filtered pages is **not** Prime’s default; justify `getPrePaginationRowModel()` as an explicit GhostVue contract.
4. **Page-local server filter:** Call out that Prime often resets paginator on filter — GhostVue’s “stay on page 4” rule is deliberate for `manualPagination + !manualFiltering`.
5. **Interaction prop attrs:** Require `aria-label` / `aria-expanded` to fall through to the **focusable element** (checkbox input, button), not wrapper-only — approval + axe depend on it.
6. **Pending clamp rules:** Prototype did not fully implement Zac’s pending clamp-on-local-filter scenarios; keep them in “pending review” until a second fixture test exists.

## Arguments against the spec’s headless-first design

- **LOC tax:** ~1.8× consumer markup vs Prime for the same fixture (171 vs 95 non-blank lines), before counting composable wiring.
- **Composition errors are runtime:** Wrong slot binding or missing `headers` when body empty is easy; Prime renders header/body as one component.
- **Team familiarity:** PrimeVue’s imperative `DataTable` API is well known; GhostVue requires learning slot binding tables and `manual*` matrix.
- **Two-phase delivery:** Without `GhostDataTableTable` in phase one, basic on-ramp parity with Prime is harder — spec already plans the mapper; comparison supports shipping it early.

---

## Process friction

- Root `pnpm-workspace.yaml` must **not** include `prototypes/` — standalone `pnpm-workspace.yaml` + lockfile in folder works; `allowBuilds.esbuild: true` required for Vite.
- Linking real `@ghostvue/vue` pulls entire package into `vue-tsc`; stubs kept prototype isolated.
- Playwright `webServer` reuses dev server; behavior harness needed `flush: 'sync'` on filter watches so pagination reset is observable in the same turn as `stateChange` counting.