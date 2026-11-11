# slop-ui

slop-ui is the foundation of a Vue-first, headless-first open-source UI
component library. The project aims to make ordinary use cases concise while
providing progressive escape hatches for demanding application interfaces.

The intended product direction combines:

- simple Vue props and configuration-driven ergonomics;
- framework-independent behavior where that boundary is genuinely useful;
- optional polished styling that headless functionality never requires;
- strong TypeScript and accessibility contracts; and
- room for capable application components such as data tables and query
  builders without dictating consumer data models.

## Status

The repository is **pre-release** and not ready for production. Tooling,
package boundaries, tests, documentation, and contribution rules are in
place. Production components may be added only when they pass the
[component gate](./docs/agents/COMPONENT_WORKFLOW.md) (approved spec, tests,
docs, and a machine-readable manifest). See
[ADR 0002](./docs/adr/0002-exit-foundation-phase.md).

The likely product directions described in the documentation are context, not a
committed roadmap.

## Requirements

- Node.js 22 or newer
- pnpm 11 or newer

## Development

```bash
pnpm install
pnpm verify
```

Useful focused commands include:

```bash
pnpm dev
pnpm docs:dev
pnpm test
pnpm test:e2e
pnpm typecheck
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a change. Engineering
standards and architecture decisions live in [docs](./docs/index.md); coding
agents must begin with [AGENTS.md](./AGENTS.md). `pnpm docs:build` also writes
[`llms.txt`](https://llmstxt.org/) and `llms-full.txt` into the VitePress output
so published docs are served at `/llms.txt` and `/llms-full.txt`.

## Philosophy

Simple usage should remain simple. Configuration should describe behavior, not
internal markup. Advanced users should be able to progress from props and
configuration to callbacks, slots, custom rendering, and lower-level APIs only
when their use case needs that power.

Accessibility, TypeScript quality, documentation, and backwards compatibility
are product requirements rather than cleanup phases.

## License

[MIT](./LICENSE)
