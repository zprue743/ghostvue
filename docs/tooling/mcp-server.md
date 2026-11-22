# MCP server (`@ghostvue/mcp`)

GhostVue exposes a **local, read-only** [Model Context Protocol](https://modelcontextprotocol.io/) server so agents can discover components, manifests, executable examples, docs, and design tokens without the Vue runtime.

**Status:** Not implemented. The first-release contract is specified in:

- [GHO-17 MCP first-release contract](../plans/gho-17-mcp-first-release.md) (tool schemas, bundles, errors)
- [ADR 0014](../adr/0014-mcp-server-first-release.md) (package boundary and scope)

## What ships in v1

| Tool              | Purpose                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| `list_components` | Summarize manifests under `@ghostvue/vue` and `@ghostvue/themes`                     |
| `get_component`   | Full JSON manifest ([ADR 0006](../adr/0006-component-manifest-schema.md))            |
| `get_examples`    | Metadata and `.vue` source from [`examples/registry.ts`](../../examples/registry.ts) |
| `search_docs`     | Search sidebar-published docs (same corpus as `llms-full.txt`)                       |
| `get_tokens`      | Resolved catalog from `@ghostvue/themes/tokens.json`                                 |

Transport is **stdio** only. HTTP (GHO-205) and `validate_usage` (GHO-206) are deferred.

## What is excluded

Arbitrary file access, executing examples, hosting a network endpoint, and importing `vue` inside `@ghostvue/mcp`.

## After implementation

Consumers will run the published bin (name TBD) from their MCP host config. Setup instructions and copy-paste config land with implementation (GHO-17h); dependency on `@modelcontextprotocol/sdk` requires approval per [dependencies.md](../standards/dependencies.md) § GHO-17.
