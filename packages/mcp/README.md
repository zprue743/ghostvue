# @ghostvue/mcp

Read-only [Model Context Protocol](https://modelcontextprotocol.io/) stdio
server for discovering GhostVue components, examples, docs, and design tokens.
It runs offline: everything it serves is bundled into the package at build
time. Host setup lives in the
[MCP server guide](../../docs/tooling/mcp-server.md); the contract is the
[GHO-17 plan](../../docs/plans/gho-17-mcp-first-release.md).

> The server is in progress: `ghostvue-mcp` serves MCP over stdio from the
> offline asset bundle and registers `get_tokens` and `search_docs`; the other
> discovery tools are not registered yet.

## Published contents

Only `dist/` is published (plus `package.json`, this README, and the license):

- `dist/bin.js`: the `ghostvue-mcp` executable, and `dist/index.js` with its
  type declarations.
- `dist/assets/`: the offline asset bundle described below.

No file in the tarball points back into the monorepo, so the server works
without network access once the package is installed.

## Offline asset bundle

`pnpm --filter @ghostvue/mcp build` compiles the TypeScript entry points and
then runs `scripts/bundle-assets.mjs`, which replaces `dist/assets/` with:

| Bundled path (`dist/assets/…`)            | Source                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `manifests/vue/<family>.manifest.json`    | `packages/vue/manifests/*.manifest.json`, byte for byte                                     |
| `manifests/themes/<family>.manifest.json` | `packages/themes/manifests/*.manifest.json`, byte for byte                                  |
| `manifest.schema.json`                    | `packages/core/manifest.schema.json` (must equal `schemas/component-manifest.schema.json`)  |
| `examples/catalog.json`                   | `examples/registry.ts` as `{ "examples": [{ id, title, description, layer, sourcePath }] }` |
| `examples/sources/<id>.vue`               | `examples/<id>.vue`, byte for byte                                                          |
| `docs/pages.json`                         | `{ "pages": [...] }` from the docs site's `generateLlmsDocuments`                           |
| `tokens.json`                             | `packages/themes/dist/tokens.json`, byte for byte                                           |
| `bundle.json`                             | Bundle metadata, including `assetBundleId` (not part of the hash)                           |

The docs corpus has the same pages and plain-text transforms as
`llms-full.txt`: every page linked from the docs sidebar, in sidebar order,
except `docs/plans/*`, which is never searchable.

The bundler refuses to write a bundle, and lists every problem, when:

- the two manifest schema copies differ;
- an example is in the catalog without a source file, or the reverse;
- a manifest `examples` entry names an id that does not exist;
- `packages/themes/dist/tokens.json` is missing or differs from
  `packages/themes/src/generated/tokens.json` (the themes build did not run
  or is outdated).

### Build order

The bundle copies generated files, so it must run after the steps that
produce them: `pnpm registries:write` (run by this package's `prebuild`),
`pnpm manifests` (manifests are committed and checked in CI), and
`pnpm --filter @ghostvue/themes build`. The root `pnpm build` builds every
other package first and this package last. The docs corpus is generated
inside the bundler, which first writes the API reference pages under
`docs/reference/`, as `pnpm docs:build` does.

### `assetBundleId`

`assetBundleId` identifies the exact bundled bytes. It is written to
`dist/assets/bundle.json` and will be reported in every tool response's
`ghostvue` stamp.

- **Algorithm:** SHA-256, written as `sha256:<64 lowercase hex digits>`.
- **File set:** every file under `dist/assets/` except `bundle.json`, keyed
  by its POSIX path relative to `dist/assets/`.
- **Byte stream:** the UTF-8 string `ghostvue-mcp-assets/v1`, a NUL byte,
  then, for each file in ascending code-unit order of its path: the path, a
  NUL byte, the file's length in bytes as a decimal string, a NUL byte, and
  the file's bytes.

The same sources always give the same id, whatever the machine, file system
order, or build time. The length framing means moving bytes from one file to
the next still changes the id.

### Freshness check

There is no committed lock hash, so docs-only changes never need to update
one. Instead, the bundle is rebuilt by every `pnpm build`, and

```bash
pnpm --filter @ghostvue/mcp assets:check
```

rebuilds the bundle in memory from the current sources and compares it with
`dist/assets/`. It fails, and names each missing, unexpected, or stale file,
when the ids differ or when `bundle.json` does not match the bundled bytes.
CI runs it after the build in the `verify-build` job and in the release dry
run.
