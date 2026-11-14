# Scaffolding components

Run `pnpm new:component Switch` from the repository root. `GhostSwitch` is also
accepted and produces the same name. Names must be PascalCase with at least two characters (the manifest id convention); existing files,
exports, and example ids are rejected before anything is written.
`pnpm new:component Switch --dry-run` lists the identical plan without writing.
No dependencies are installed by the generator.

The scaffold creates:

- `packages/vue/src/GhostSwitch.vue`, its `ghost-switch.ts` ref contract,
  `use-ghost-switch.ts` composable and colocated unit test.
- A themed wrapper and CSS recipe under `packages/themes/src`, using existing
  `--ghost-*` tokens, plus a themed ref test. Both exports expose the content
  root as `element`; the themed wrapper forwards the headless ref contract.
  The root exposes `data-part="root"` and `data-ghost-switch` hooks.
- Vue and themed manifests, a docs page and draft specification, and
  `examples/switch/basic.vue` registered in `examples/registry.ts`.
- A runnable Playwright/Axe smoke test at `tests/e2e/ghost-switch.spec.ts`.

It wires both public barrels, the default CSS imports and the docs sidebar:
the component under Components and its draft specification under Contributing.
Vue refs and composables stay in `vue`; a neutral scaffold has no useful
framework-independent behavior to put in `core` or `shared`.

The generated component passes the repository verification gate as a neutral,
non-interactive content container. It does **not** implement switch semantics,
state or keyboard behavior. Follow the [component gate](../agents/COMPONENT_WORKFLOW.md):
complete the draft specification using the [template](../components/spec-template.md),
obtain design approval, then replace the scaffolding with the approved contract
and behavior tests. Keep the headless component thin and behavior in its composable.
Do not ship the starter as a production widget.

After implementation, run `pnpm manifests:write`, fill out manifest prose, and
run `pnpm verify` and `pnpm test:e2e`. New registered examples need visual
baselines via `pnpm test:visual:docker` before browser CI can pass. Add a
Changeset when the component changes a published package's output. The scaffold
generator itself is tooling and requires no Changeset.
