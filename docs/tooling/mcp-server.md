# MCP server (`@ghostvue/mcp`)

GhostVue exposes a **local, read-only** [Model Context Protocol](https://modelcontextprotocol.io/) server so agents can discover components, manifests, executable examples, docs, and design tokens without the Vue runtime.

**Status:** In progress — the private `packages/mcp` package runs a stdio MCP server (`tools` capability, version stamp, error envelope) over the offline asset bundle its build produces. It serves `get_tokens` and `search_docs`; the other discovery tools are not registered yet. Without the bundle, `ghostvue-mcp` prints a diagnostic to stderr and exits 1 ([GHO-17](../plans/gho-17-mcp-first-release.md), [ADR 0015](../adr/0015-mcp-server-first-release.md) accepted).

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

Tool responses use MCP **structured content** (`structuredContent`) with a declared `outputSchema` per tool; each payload includes top-level `schemaVersion` (`1.0.0` for the GhostVue MCP tool contract) and a `ghostvue` stamp (`version`, `assetBundleId`, `manifestSchemaId`). Every tool accepts an optional `expectedGhostvueVersion`; when it differs from the server version, the call fails with `VERSION_MISMATCH` before doing any work. Details: [GHO-17 plan §5](../plans/gho-17-mcp-first-release.md).

## `get_tokens`

Reads the bundled token catalog, a byte-for-byte copy of the
`@ghostvue/themes` `./tokens.json` export
([plan §5.5](../plans/gho-17-mcp-first-release.md#55-get_tokens)).

| Input           | Default | Meaning                                                                       |
| --------------- | ------- | ----------------------------------------------------------------------------- |
| `name`          | —       | One token by exact name, e.g. `action.primary.bg`. Unknown name: `NOT_FOUND`. |
| `prefix`        | —       | Every token whose name starts with `prefix.`, in catalog order.               |
| `tier`          | all     | `primitive` or `semantic`.                                                    |
| `includeValues` | `true`  | `false` drops `value`, leaving names, types, tiers, and CSS variables.        |
| `limit`         | `100`   | 1–2000; caps a `prefix` query.                                                |

`name` and `prefix` are mutually exclusive. With neither, the result is the
catalog header only: `catalog` holds `schemaVersion`, `theme`, `modes`,
`densities`, `attributes`, and `tokenCount`, and there is no `tokens` array.

```json
{
  "schemaVersion": "1.0.0",
  "ghostvue": {
    "version": "0.1.0",
    "assetBundleId": "sha256:…",
    "manifestSchemaId": "…"
  },
  "catalog": {
    "schemaVersion": "1.0.0",
    "theme": "default",
    "modes": ["light", "dark"],
    "…": "…"
  },
  "tokens": [
    {
      "name": "action.primary.bg",
      "type": "color",
      "tier": "semantic",
      "cssVar": "--ghost-action-primary-bg",
      "value": { "light": "…", "dark": "…" }
    }
  ],
  "matchCount": 7
}
```

`matchCount` appears on `prefix` queries and counts matches before `limit`, so
a client can tell when a page was cut short. `cssVar` is omitted for tokens the
themes build emits no custom property for (primitives, which are inlined into
semantic tokens). `name` combined with a `tier` the token does not have is
`NOT_FOUND`.

## `search_docs`

Full-text search over the bundled docs corpus `dist/assets/docs/pages.json`
([plan §5.4](../plans/gho-17-mcp-first-release.md#54-search_docs)). The corpus
is exactly the pages linked from the docs sidebar, the same set as
`llms-full.txt`, minus `docs/plans/*`. Generated TypeDoc output and specs
outside the sidebar are not searched.

| Input     | Default | Meaning                                                                                                                    |
| --------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `query`   | —       | Required. Words separated by whitespace; words shorter than 2 characters are ignored. Blank: `INVALID_INPUT`.              |
| `limit`   | `10`    | 1–25 hits.                                                                                                                 |
| `section` | —       | Top-level sidebar label, matched exactly: `Docs`, `Components`, `Theming`, or `Contribute`. Other labels: `INVALID_INPUT`. |

Ranking is a small BM25 over each page's title (weight 3), description
(weight 2), and body. Matching is on whole, lowercased words: `v-model` and
`action.primary.bg` stay one word, and there is no stemming or typo tolerance.
Pages with score 0 are dropped. Equal scores sort by sidebar section order,
then link path. A `section` filter narrows the list without changing scores.

```json
{
  "schemaVersion": "1.0.0",
  "ghostvue": { "…": "…" },
  "hits": [
    {
      "title": "Button",
      "link": "/components/button",
      "section": "Components",
      "score": 7.912,
      "snippet": "…Space and Enter activate the button…"
    }
  ]
}
```

`score` is rounded to 3 decimals. `snippet` is plain text of at most 280
characters around the first match in the body, with `…` where text was cut. A
page that matches only in its title or description shows the description or
the start of the body. A query with no usable words returns no hits.

## Errors

A failed tool call is an MCP tool result with `isError: true`. Its first text
content block is the JSON error envelope from
[GHO-17 plan §10](../plans/gho-17-mcp-first-release.md#10-error-envelope):

```json
{
  "code": "VERSION_MISMATCH",
  "message": "Expected @ghostvue/mcp 0.1.0, but this server is 0.2.0.",
  "data": {
    "tool": "list_components",
    "ghostvueVersion": "0.2.0",
    "schemaVersion": "1.0.0"
  }
}
```

`code` is one of `INVALID_INPUT`, `NOT_FOUND`, `VERSION_MISMATCH`,
`MANIFEST_INVALID`, or `INTERNAL`. Error results carry no `structuredContent`,
because MCP clients validate `structuredContent` against the tool's success
`outputSchema`. `INTERNAL` messages are fixed text; the server writes the
underlying detail only to its stderr log. Calling a tool name the server does
not have is a JSON-RPC invalid-params error, not a tool result.

## Dependencies

Direct runtime pins (approved Nov 22, 2026): `@modelcontextprotocol/sdk@1.32.2`,
`zod@4.6.7`, `ajv@8.20.0`, with production `node_modules` ≤ 18 MiB. Adoption and
measurements are recorded in [dependencies.md](../standards/dependencies.md)
§ `@ghostvue/mcp`. The package joins the monorepo release train at `0.1.0` but
stays `"private": true` until [GHO-57](https://linear.app/ghost-vue/issue/GHO-57)
publish authorization.

## Full contract

Authoritative tool I/O, bundles, identity rules, and errors:

- [GHO-17 MCP first-release contract](../plans/gho-17-mcp-first-release.md)
