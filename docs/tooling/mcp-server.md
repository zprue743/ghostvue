# MCP server (`@ghostvue/mcp`)

GhostVue exposes a **local, read-only** [Model Context Protocol](https://modelcontextprotocol.io/) server so agents can discover components, manifests, executable examples, docs, and design tokens without the Vue runtime.

`@ghostvue/mcp` is [available on npm](https://www.npmjs.com/package/@ghostvue/mcp).
It serves all five v1 tools over stdio from its bundled offline assets.
See [GHO-17](../plans/gho-17-mcp-first-release.md) and
[ADR 0015](../adr/0015-mcp-server-first-release.md) for the contract.

## What ships in v1

<!-- @generated docs-api:mcp-tools begin -->

<!-- Source: defineTool calls in packages/mcp/src and packages/mcp/src/contract.ts. Run pnpm docs:api:write after they change. -->

| Tool              | Title             | Inputs                                                         | Description                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ----------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_component`   | Get component     | `name`, `package`                                              | Return one full GhostVue component manifest, validated against the bundled manifest schema. Pass package "@ghostvue/themes" for the themed wrapper.                                                                                                                                                                           |
| `get_examples`    | Get examples      | `id`, `component`, `layer`, `includeSource`, `limit`, `cursor` | Read GhostVue executable examples (examples/registry.ts). Pass `id` (e.g. button/basic) for one example or `component` (e.g. button) for every example under `component/`, with .vue source unless includeSource is false. With neither, list catalog metadata only (no source), paged with cursor/nextCursor.                |
| `get_tokens`      | Get design tokens | `name`, `prefix`, `tier`, `includeValues`, `limit`             | Read the resolved GhostVue design-token catalog (@ghostvue/themes tokens.json). Pass `name` for one exact token or `prefix` for every token under `prefix.`; omit both for the catalog header (modes, densities, attributes, token count) only.                                                                               |
| `list_components` | List components   | `package`, `status`, `query`, `limit`, `cursor`                | List GhostVue component manifests as summary rows with optional package, status, and text filters. Use get_component for a full manifest.                                                                                                                                                                                     |
| `search_docs`     | Search docs       | `query`, `limit`, `section`                                    | Full-text search over the GhostVue docs site pages listed in its sidebar (the llms-full.txt corpus). Ranks pages by BM25 over title, description, and body, matching whole words only (no fuzzy matching), and returns each hit with a short snippet. Use `section` to search one top-level sidebar section, e.g. Components. |

Every tool also accepts `expectedGhostvueVersion`. Every successful payload carries tool contract `schemaVersion` `1.0.0` (`toolContractSchemaVersion`).

<!-- @generated docs-api:mcp-tools end -->

Transport is **stdio** only. HTTP (GHO-205) and `validate_usage` (GHO-206) are deferred. A [draft `validate_usage` contract](../plans/gho-206-validate-usage.md) awaits approval; it is not implemented.

## What is excluded

Arbitrary file access, executing examples, hosting a network endpoint, and importing `vue` inside `@ghostvue/mcp`.

## Install and host configuration

The package installs one executable, `ghostvue-mcp`. It speaks MCP over stdin
and stdout, needs Node 22 or later, and makes no network requests: every
answer comes from data bundled in the package. Use the same version as the
`@ghostvue/vue` and `@ghostvue/themes` packages in your app, so the manifests
and tokens match the components you use. Each tool's
`expectedGhostvueVersion` input can enforce that.

Hosts start the server with `npx`, which downloads the package on first use:

```bash
npx -y -p @ghostvue/mcp@0.1.0 ghostvue-mcp
```

For a faster start, install it once with `npm install --save-dev
@ghostvue/mcp@0.1.0` (or globally with `npm install -g`) and set `command` to
`ghostvue-mcp` with no `args`.

### Cursor

Add to `.cursor/mcp.json` in the project, or `~/.cursor/mcp.json` for every
project:

```json
{
  "mcpServers": {
    "ghostvue": {
      "command": "npx",
      "args": ["-y", "-p", "@ghostvue/mcp@0.1.0", "ghostvue-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add ghostvue -- npx -y -p @ghostvue/mcp@0.1.0 ghostvue-mcp
```

Add `--scope project` to write the server to `.mcp.json` and share it with the
repository.

### Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config), then
restart Claude Desktop:

```json
{
  "mcpServers": {
    "ghostvue": {
      "command": "npx",
      "args": ["-y", "-p", "@ghostvue/mcp@0.1.0", "ghostvue-mcp"]
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json` in the workspace. VS Code uses `servers`, not
`mcpServers`:

```json
{
  "servers": {
    "ghostvue": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "-p", "@ghostvue/mcp@0.1.0", "ghostvue-mcp"]
    }
  }
}
```

### Try it from a checkout

To test local changes, build the package in this repository and point the
host at the built bin with an absolute path:

```bash
pnpm install
pnpm build
node packages/mcp/dist/bin.js   # waits for MCP frames on stdin; Ctrl+C to quit
```

```json
{
  "mcpServers": {
    "ghostvue": {
      "command": "node",
      "args": ["/absolute/path/to/ghostvue/packages/mcp/dist/bin.js"]
    }
  }
}
```

Without a built asset bundle, `ghostvue-mcp` prints a diagnostic to stderr and
exits 1.

### What the package contains

Only `dist/` is published: the server code, its type declarations, and the
asset bundle in `dist/assets/`. A production install is about 16 MiB of
`node_modules` plus about 3.5 MiB of bundled assets. Most of the dependency
size is the MCP SDK's HTTP stack, which a stdio server installs but never
loads.

Tool responses use MCP **structured content** (`structuredContent`) with a declared `outputSchema` per tool; each payload includes top-level `schemaVersion` (`1.0.0` for the GhostVue MCP tool contract) and a `ghostvue` stamp (`version`, `assetBundleId`, `manifestSchemaId`). Every tool accepts an optional `expectedGhostvueVersion`; when it differs from the server version, the call fails with `VERSION_MISMATCH` before doing any work. Details: [GHO-17 plan §5](../plans/gho-17-mcp-first-release.md).

## Components

`list_components` returns summary rows; `get_component` returns one full
manifest. Both identify a component the same way
([GHO-17 plan §3.2](../plans/gho-17-mcp-first-release.md#32-component-identity)):

- `family` is the manifest filename stem (`ghost-button`), shared by a
  headless component and its themed wrapper.
- `manifestPath` is the bundle path, `manifests/vue/<family>.manifest.json` or
  `manifests/themes/<family>.manifest.json`.
- `relatedManifest` (`package`, `family`, `manifestPath`) names the paired
  manifest in the other package and is omitted when there is none. Every
  `@ghostvue/themes` manifest has a `@ghostvue/vue` pair.

`list_components` accepts `package` (`@ghostvue/vue`, `@ghostvue/themes`, or
`all`, the default), `status` (one or more manifest statuses), `query` (a
case-insensitive substring of the name or description), and `limit` (1–500,
default 200). Rows are ordered by `family`, headless before themed. When
`nextCursor` is not `null`, pass it back as `cursor` with the same `package`,
`status`, and `query` to get the next page; a cursor reused with other filters
fails with `INVALID_INPUT`. `totalApprox` counts every row matching the
filters. Each row has `name`, `package`, `family`, `manifestPath`,
`relatedManifest`, `status`, `manifestSchemaVersion` (the manifest's own
`schemaVersion`), `description`, `exampleIds`, and `spec` (`path` and
`status`, omitted when the manifest has none).

`get_component` takes `name` and an optional `package` that defaults to
`@ghostvue/vue`; pass `@ghostvue/themes` for the themed wrapper. An unknown
name fails with `NOT_FOUND`, and the message says when the name exists only in
the other package. The server validates every bundled manifest against the
bundled `manifest.schema.json` with Ajv's 2020-12 build (the same options as
`pnpm manifests` in CI) before serving it; a manifest that fails, or that is
bundled under the wrong package, fails with `MANIFEST_INVALID`.

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

## `get_examples`

Reads the bundled example catalog (`examples/registry.ts` metadata) and the
bundled `.vue` sources. Example files are returned as text and never run
([plan §5.3](../plans/gho-17-mcp-first-release.md#53-get_examples)).

| Input           | Default | Meaning                                                                               |
| --------------- | ------- | ------------------------------------------------------------------------------------- |
| `id`            | —       | One example, e.g. `button/basic`. Unknown id: `NOT_FOUND`.                            |
| `component`     | —       | Every example whose id starts with `component/`, e.g. `button`. No match: empty page. |
| `layer`         | both    | `headless` or `themed`.                                                               |
| `includeSource` | `true`  | `false` drops `source`.                                                               |
| `limit`         | `50`    | 1–100 examples per page.                                                              |
| `cursor`        | —       | `nextCursor` from the previous page. A cursor from other filters is `INVALID_INPUT`.  |

`id` and `component` are mutually exclusive. `component` is the `examples/`
directory name (`button`), not the manifest family (`ghost-button`); a
manifest's `examples` array lists the exact ids. With neither, the result is a
metadata-only catalog page with no `source`, whatever `includeSource` says.
`id` combined with a `layer` the example does not have is `NOT_FOUND`.

```json
{
  "schemaVersion": "1.0.0",
  "ghostvue": { "version": "0.1.0", "assetBundleId": "sha256:…", "…": "…" },
  "examples": [
    {
      "id": "button/basic",
      "title": "…",
      "description": "…",
      "layer": "headless",
      "sourcePath": "examples/button/basic.vue",
      "source": "<script setup lang=\"ts\">…</template>\n"
    }
  ],
  "nextCursor": null
}
```

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
stays `"private": true` until [GHO-57](https://github.com/zprue743/ghostvue/issues?q=is%3Aissue+GHO-57+in%3Atitle)
publish authorization.

## Release checks

`pnpm mcp:packed` (part of `pnpm verify:build`, and run by the release dry
run) checks what a consumer would install:

1. `pnpm pack` output holds only `dist/` plus `package.json`, the README, and
   the license.
2. The tarball installed with `pnpm install --prod` into a scratch project
   stays at or under **18 MiB** of `node_modules`, not counting
   `dist/assets/`. Sizes are apparent bytes as `du -sb` reports them. The
   measurement goes to the CI job summary.
3. The installed `ghostvue-mcp` starts over stdio with network proxies
   pointed at a closed port, lists exactly the five tools, and answers one
   call to each. Every answer must match the tool's `outputSchema` and carry
   the bundle's `assetBundleId` and the `manifestSchemaId`
   `https://ghostvue.dev/schemas/v1/manifest.schema.json`.

`pnpm published-exports` also checks that the `bin` file exists with a Node
shebang and that `files` is `["dist"]`. Run `pnpm audit --prod` in
`packages/mcp` before publishing.

## Full contract

Authoritative tool I/O, bundles, identity rules, and errors:

- [GHO-17 MCP first-release contract](../plans/gho-17-mcp-first-release.md)
- [Agent eval harness](../agents/EVAL_HARNESS.md)
