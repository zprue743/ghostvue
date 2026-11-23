# MCP server (`@ghostvue/mcp`) (proposed)

GhostVue exposes a **local, read-only** [Model Context Protocol](https://modelcontextprotocol.io/) server so agents can discover components, manifests, executable examples, docs, and design tokens without the Vue runtime.

**Status:** Not implemented — contract only ([GHO-17](../plans/gho-17-mcp-first-release.md), [ADR 0015](../adr/0015-mcp-server-first-release.md) proposed).

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

## Bin and host configuration

Published **bin name:** `ghostvue-mcp` (stdio server entry; same executable whether installed globally or invoked via `npx @ghostvue/mcp`).

Example Cursor / Claude Desktop MCP fragment (paths adjust after the package exists on npm):

```json
{
  "mcpServers": {
    "ghostvue": {
      "command": "npx",
      "args": ["-y", "-p", "@ghostvue/mcp@<version>", "ghostvue-mcp"]
    }
  }
}
```

Prefer a global or project-local install when `npx` cold-start latency matters:

```json
{
  "mcpServers": {
    "ghostvue": {
      "command": "ghostvue-mcp"
    }
  }
}
```

Tool responses use MCP **structured content** (`structuredContent`) with a declared `outputSchema` per tool; each payload includes top-level `schemaVersion` (`1.0.0` for the GhostVue MCP tool contract). Details: [GHO-17 plan §5](../plans/gho-17-mcp-first-release.md).

## Dependencies

Runtime pins are **not yet approved** for the lockfile. Zac sign-off is required for `@modelcontextprotocol/sdk@1.32.2`, `zod@4.6.7`, and `ajv@8.20.0` — see [dependencies.md](../standards/dependencies.md) § `@ghostvue/mcp`.

## Full contract

Authoritative tool I/O, bundles, identity rules, and errors:

- [GHO-17 MCP first-release contract](../plans/gho-17-mcp-first-release.md)
