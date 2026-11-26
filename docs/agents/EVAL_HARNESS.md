# Agent eval harness

`pnpm eval` benchmarks whether GhostVue's AI-native layer (`@ghostvue/mcp` manifests, examples, docs search, and tokens) improves real UI code generation compared to documentation alone.

## Benchmark design

Every run compares two conditions using the same pinned model and generation settings:

| Condition   | Tools provided to the agent                                                                                        | Purpose                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `docs-only` | `docs_search`, `docs_read` over GhostVue's Markdown/`llms-full.txt` corpus                                         | Baseline with published docs and no MCP manifest/example server      |
| `docs+mcp`  | Live `@ghostvue/mcp` stdio tools (`list_components`, `get_component`, `get_examples`, `search_docs`, `get_tokens`) | Measures the incremental value of structured MCP component contracts |

### Fixed five-task suite

The task set (`EVAL_TASK_SET_VERSION` `1.0.0` in `scripts/lib/eval/tasks.js`) uses only shipped GhostVue primitives:

| Task ID                 | Primitives exercised                                                                             | Key grading checks                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `login-form`            | `GhostCard`, `GhostField`, `GhostInput`, `GhostCheckbox`, `GhostButton`                          | Empty submit validation (`aria-invalid="true"`, `role="alert"`), valid submit status, `Tab` / `Space` / `Enter` keyboard flow                                      |
| `settings-dialog`       | `GhostDialog*`, `GhostSwitch`, `GhostField`, `GhostInput`, `GhostButton`                         | `role="dialog"` + `aria-modal="true"`, `Tab` focus trap, `Space` switch toggle, `Escape` draft discard + focus restoration, save summary update                    |
| `async-combobox-search` | `GhostCombobox*`, `GhostSpinner`, `useGhostComboboxAsyncSearch`                                  | Out-of-order async search race safety (`begin` / `isLatest`), empty state, `ArrowDown` (`aria-activedescendant`), `Enter`, `Escape` focus retention                |
| `paginated-table`       | `GhostTable*`, `GhostPagination` (explicitly **forbids** `GhostDataTable` / `useGhostDataTable`) | Semantic `<table>` + `<caption>` + `scope="col"`, 5 rows/page slicing, keyboard `Enter` pagination + `aria-current="page"` + boundary disable state                |
| `validation-error-form` | `GhostField*`, `GhostInput`, `GhostInlineAlert`, `GhostButton`                                   | `GhostInlineAlert` error summary + field errors, focus moved to first `[aria-invalid="true"]` control on invalid submit, error clearing + status on valid resubmit |

## Separate scoring and visual evidence

`pnpm eval` never collapses results into a single misleading accessibility or quality score. Each `(task, condition)` trial reports every grading dimension separately, with explicit `passed`, `failed`, `skipped`, and `missing` counts:

- **Constraints (`constraints`)**: SFC structure (`<script>` + `<template>`), expected primitives, and forbidden-API checks (such as rejecting `GhostDataTable` on `paginated-table`).
- **ESLint (`eslint`)**: `@ghostvue/eslint-plugin` `configs.recommended` (`no-unknown-props`, `no-unknown-slots`, `no-undeclared-v-model`).
- **Typecheck (`typecheck`)**: Isolated `vue-tsc --noEmit` against workspace `@ghostvue/themes` and `@ghostvue/vue` types.
- **Build (`build`)**: Vite + `@vitejs/plugin-vue` bundle inside a `.ghost-theme` (`default.css`) host page.
- **Behavior (`behavior`) & Keyboard (`keyboard`)**: Real Chromium Playwright assertions for functional DOM state, focus movement (`document.activeElement`), and `aria-*` updates. When `--skip-browser` is passed or Vite build fails, browser checks are marked `skipped` rather than omitted or passed.
- **Axe (`axe`)**: Per-state `@axe-core/playwright` scans (`initial`, `open`, `validation-error`, `page-2`, etc.), reporting exact violations per state.
- **Visual evidence (`visual`)**: Full-page Playwright PNG screenshots saved under `reports/eval/<run-id>/artifacts/<condition>/<taskId>/<state>.png` with `status: "captured-pending-human-review"`, `reviewed: false`, and `humanAssessment: "unreviewed"`. Unreviewed images never count as having passed human visual assessment.

## Safety and budget enforcement

Live paid runs are **manual only** and **fail closed**:

1. **Default $5 total cap:** `--budget` defaults to `5` USD, covering **both** `docs-only` and `docs+mcp` across all selected tasks (not $5 per task or condition).
2. **Explicit authorization:** Paid providers (`anthropic`, `openai`, `gemini`) require `--allow-paid`, an explicit `--model`, and the provider API key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY`).
3. **CI / PR guard:** Paid providers are blocked whenever `CI`, `GITHUB_ACTIONS`, or `CONTINUOUS_INTEGRATION` is set. Automated tests and CI only run offline `--provider mock` or stubbed HTTP transports.
4. **Fail-closed preflight:** Before issuing any API request, `evaluateBudgetPreflight` verifies pinned pricing for `(provider, model)` and finite `maxTurnsPerTrial`, `maxInputTokensPerTurn`, `maxOutputTokensPerTurn`, and `maxRetries = 0`. Unknown model pricing or worst-case total cost above `--budget` aborts before spending $0.00 (`EvalBudgetError`).
5. **Per-call ledger & zero retries:** `BudgetLedger.assertCanExecuteCall` checks worst-case remaining headroom before every single turn, and `maxRetries` is locked to `0` on paid runs.

## Running `pnpm eval`

Offline deterministic run (uses the real `@ghostvue/mcp` stdio server for `docs+mcp` and $0.00 mock agent output):

```bash
pnpm build
pnpm eval
```

Run a fast static/typecheck smoke without launching Chromium:

```bash
pnpm eval --skip-browser --tasks login-form,paginated-table
```

Run a manual bounded comparison against a live model (local terminal only):

```bash
ANTHROPIC_API_KEY=... pnpm eval \
  --provider anthropic \
  --model claude-sonnet-4-20250514 \
  --budget 5 \
  --allow-paid
```

### CLI flags

| Flag                  | Default                 | Description                                                                                            |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `--provider`          | `mock`                  | `mock`, `anthropic`, `openai`, or `gemini`                                                             |
| `--model`             | `mock-deterministic-v1` | Pinned model identifier (required for paid providers)                                                  |
| `--budget`            | `5`                     | Total USD cap across all selected tasks and conditions                                                 |
| `--allow-paid`        | `false`                 | Required explicit opt-in for non-`mock` providers                                                      |
| `--tasks`             | all 5 tasks             | Comma-separated task IDs                                                                               |
| `--conditions`        | `docs-only,docs+mcp`    | Comma-separated conditions                                                                             |
| `--mock-profile`      | `comparison`            | `comparison` (shows representative `docs-only` gaps vs `docs+mcp`) or `reference` (all reference SFCs) |
| `--max-turns`         | `6`                     | Maximum tool/completion turns per trial                                                                |
| `--max-input-tokens`  | `24000`                 | Upper bound on input tokens per turn for budget preflight                                              |
| `--max-output-tokens` | `4096`                  | Output token cap per turn                                                                              |
| `--out-dir`           | `reports/eval`          | Directory where per-run folders are written (gitignored)                                               |
| `--skip-browser`      | `false`                 | Skip Playwright behavior, keyboard, axe, and visual checks                                             |
| `--skip-typecheck`    | `false`                 | Skip `vue-tsc` typecheck                                                                               |

## Stored per-run artifacts

Each run writes a self-contained folder under `reports/eval/<run-id>/` (ignored by Git and Prettier):

- `results.json` — Pinned task versions and prompt hashes, model/provider/settings, budget preflight & actual token/USD usage, Git SHA + dirty flag, workspace package versions, live MCP `assetBundleId`, tool traces, and per-dimension grading results.
- `summary.md` — Side-by-side comparison table across `docs-only` and `docs+mcp` with separate dimension counts and visual review notices.
- `generated/<condition>/<taskId>/TaskOutput.vue` — Generated SFC source for inspection.
- `artifacts/<condition>/<taskId>/<state>.png` — Unreviewed visual evidence screenshots.

## Related

- [Agent guide](./AGENT_GUIDE.md)
- [MCP server reference](../tooling/mcp-server.md)
- [Using GhostVue with AI agents](../tooling/ai-agents.md)
