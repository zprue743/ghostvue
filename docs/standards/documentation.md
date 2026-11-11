# Documentation standard

Documentation ships with a public feature rather than following as optional
cleanup. Every future public feature should include:

- an API reference with types and defaults;
- a minimal ordinary-use example and focused advanced examples;
- accessibility and keyboard guidance where relevant;
- loading, empty, disabled, error, async, and edge-case behavior;
- SSR, performance, or data-shape constraints when applicable; and
- migration or deprecation notes for changed contracts.

Examples must represent supported APIs and should not invent features that do not
exist. Keep canonical engineering guidance in `docs/`; link to it from agent and
tool integrations rather than copying it. `pnpm adapters` fails when those
adapters drift from the catalog. Run `pnpm docs:build` to catch broken site
configuration and invalid Markdown integration before review. The docs build
also emits `/llms.txt` and `/llms-full.txt` for language-model clients.
