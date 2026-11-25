# Using GhostVue with AI agents

Coding agents write better GhostVue code when they read the real component
contracts instead of guessing from training data. GhostVue publishes those
contracts in four forms:

| Surface                                     | What the agent gets                                                            | Needs                |
| ------------------------------------------- | ------------------------------------------------------------------------------ | -------------------- |
| [MCP server](#mcp-server)                   | Component manifests, example source, docs search, and design tokens, on demand | An MCP-capable agent |
| [`llms.txt`](#llms-txt-and-llms-full-txt)   | An index of every docs page, plus `llms-full.txt` with all pages as Markdown   | Nothing; plain text  |
| [Component manifests](#component-manifests) | One JSON contract per component, validated against a published JSON Schema     | Installed GhostVue   |
| [ESLint plugin](#eslint-plugin)             | Errors for props, slots, and `v-model` names that a component does not declare | ESLint 9 or 10       |

This page shows how to wire each one into a consumer app and gives an
[instruction block](#instructions-for-your-repository) to paste into your
repository's `AGENTS.md`.

> [!WARNING]
> **Pre-release.** No `@ghostvue/*` package is on npm yet. The snippets below
> use `0.1.0`, the planned first version
> ([release status](../contributing/releases.md#publication-status)). Until it
> ships, run the MCP server [from a checkout](#before-the-npm-release).

## MCP server

`@ghostvue/mcp` is a local, read-only
[Model Context Protocol](https://modelcontextprotocol.io/) server. It installs
one executable, `ghostvue-mcp`, which speaks MCP over stdio, needs Node 22 or
later, and makes no network requests: every answer comes from data bundled in
the package. It exposes five tools:

| Tool              | Use it to                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `list_components` | Find components by name, description, package, or status                                  |
| `get_component`   | Read one component's full manifest: props, models, events, slots, styling hooks, and a11y |
| `get_examples`    | Read the `.vue` source of the executable examples shown on the docs site                  |
| `search_docs`     | Search the published docs pages (the pages in `llms-full.txt`)                            |
| `get_tokens`      | Look up design tokens, their CSS custom properties, and light and dark values             |

Inputs, outputs, pagination, and error codes are in the
[MCP server reference](./mcp-server.md). The server does not write files, run
examples, or validate your code; use the [ESLint plugin](#eslint-plugin) and
`vue-tsc` for that.

### Host configuration

Each host starts the server with `npx`, which downloads the package on first
use. Pin the same version as the `@ghostvue/vue` and `@ghostvue/themes`
packages in your app so the manifests match the components you use.

#### Claude Code

```bash
claude mcp add ghostvue -- npx -y -p @ghostvue/mcp@0.1.0 ghostvue-mcp
```

Add `--scope project` to write the server to `.mcp.json` and share it with
your team. You can also write `.mcp.json` by hand:

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

#### Cursor

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

#### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in the workspace. VS Code uses `servers`, not
`mcpServers`, and the tools are available in Copilot's agent mode:

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

#### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

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

#### Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.ghostvue]
command = "npx"
args = ["-y", "-p", "@ghostvue/mcp@0.1.0", "ghostvue-mcp"]
```

#### Claude Desktop

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

#### Faster start without `npx`

Install the package as a dev dependency so the host does not resolve it on
every start:

```bash
pnpm add -D @ghostvue/mcp@0.1.0
```

Then point the host at the installed bin, for example in `.mcp.json`:

```json
{
  "mcpServers": {
    "ghostvue": {
      "command": "ghostvue-mcp",
      "args": []
    }
  }
}
```

Hosts look the command up on their own `PATH`, which may not include
`node_modules/.bin`. If the server fails to start, use `npx` or the absolute
path to the bin.

### Before the npm release

Build the server in a clone of this repository and point the host at the built
bin with an absolute path:

```bash
git clone https://github.com/zprue743/ghostvue.git
cd ghostvue
pnpm install
pnpm build
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

Use the same `command` and `args` in any host above (`servers` for VS Code).
Without a build, `ghostvue-mcp` prints a diagnostic to stderr and exits 1, so
the host reports a failed server.

### Check the connection

Ask the agent something only the server can answer, such as "Which slots does
`GhostCard` declare? Use the ghostvue MCP server." It should call
`get_component` and answer from the manifest. Every tool also accepts an
optional `expectedGhostvueVersion`; when it differs from the server version,
the call fails with `VERSION_MISMATCH` instead of answering for the wrong
release.

## `llms.txt` and `llms-full.txt`

The docs build writes two [llmstxt.org](https://llmstxt.org/) files to the root
of the docs site:

- `/llms.txt` lists every page in the docs sidebar, in sidebar order, with a
  link and the page description when it has one.
- `/llms-full.txt` concatenates the Markdown of those pages. Live examples are
  inlined as `vue` code blocks, and each page records its source path.

Use them with agents that have no MCP support: add the `llms-full.txt` URL as
a docs source, or attach the file to the conversation. `search_docs` searches
the same pages (minus internal planning documents), so an agent gets the same
answers either way. The
files describe the docs as published, which may be ahead of the version you
have installed; the MCP server and manifests are pinned to your version.

## Component manifests

Every component has a JSON manifest that the docs, the MCP server, and the
ESLint plugin all read. It lists props with types and defaults, `v-model`
bindings, events, slots and slot props, exposed members, styling hooks
(`data-part`, `data-state`, and `--ghost-*` custom properties), accessibility
facts (role, keyboard map, required ARIA), and the ids of its examples.

Agents usually read manifests through `get_component`. Build tools can import
them from the packages:

```ts
import headless from '@ghostvue/vue/manifest.json' with { type: 'json' }
import themed from '@ghostvue/themes/manifest.json' with { type: 'json' }
```

Both files are manifest collections. The schemas they follow ship in
`@ghostvue/core`:

- `@ghostvue/core/manifest.schema.json` for one manifest
- `@ghostvue/core/manifest-collection.schema.json` for a collection

Accessibility verification has three separate categories (automated keyboard,
manual review, and assistive-technology review). Treat each status on its
own; a passing keyboard test does not mean a screen reader review happened.
Field-by-field rules are in
[component manifests](../architecture/component-manifest.md).

## ESLint plugin

`@ghostvue/eslint-plugin` checks `.vue` templates against the same manifests,
so an agent that runs ESLint after editing gets a precise error instead of a
silent mistake:

```bash
pnpm add -D @ghostvue/eslint-plugin eslint eslint-plugin-vue
```

```js
// eslint.config.js
import ghostvue from '@ghostvue/eslint-plugin'
import vue from 'eslint-plugin-vue'

export default [
  ...vue.configs['flat/recommended'],
  ghostvue.configs.recommended,
]
```

`configs.recommended` enables three rules as errors for `**/*.vue`:

| Rule                             | Reports                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| `ghostvue/no-unknown-props`      | An attribute that is not a declared prop or a native one   |
| `ghostvue/no-unknown-slots`      | Slot content for a slot the component does not declare     |
| `ghostvue/no-undeclared-v-model` | `v-model` or `v-model:name` the component does not declare |

The rules only report what they can prove from a static import of
`@ghostvue/vue` or `@ghostvue/themes`. They do not check value types, events,
deprecations, or accessible names, and a missing error is not proof that a
usage is correct. Pair the plugin with `vue-tsc`. Details and limits:
[ESLint plugin](./eslint-plugin.md).

## Instructions for your repository

Most coding agents read an `AGENTS.md` file at the repository root. Paste this
block into it and adjust the commands to your project. For tools that read
their own file, such as Claude Code's `CLAUDE.md` or GitHub Copilot's
`.github/copilot-instructions.md`, paste the same block there or point that
file at `AGENTS.md`.

```markdown
## GhostVue components

This app uses GhostVue: headless components from `@ghostvue/vue` and themed
wrappers (with `variant`, `tone`, and `size` props) from `@ghostvue/themes`.

- Before using a GhostVue component, read its contract with the `ghostvue`
  MCP server: `list_components` to find it, `get_component` for props, slots,
  `v-model` bindings, events, styling hooks, and accessibility notes, and
  `get_examples` for working usage. Use `search_docs` for guides and
  `get_tokens` for design tokens. Without the MCP server, read `llms-full.txt`
  from the GhostVue docs site.
- Use only the props, slots, models, and events the manifest declares. Do not
  guess names from other UI libraries.
- Style through the manifest's `styling` hooks (`data-part`, `data-state`,
  and `--ghost-*` custom properties), not internal markup or class names.
- Follow each component's accessibility section. Give icon-only controls an
  accessible name; the lint rules do not check this.
- After editing `.vue` files, run `pnpm exec eslint .` and
  `pnpm exec vue-tsc --noEmit`. Fix `ghostvue/*` errors instead of disabling
  them.
```

### Prompt snippets

Point the agent at the server in the request itself when a task depends on
exact APIs:

```text
Build a notification settings form with GhostField, GhostSwitch, and
GhostButton from @ghostvue/themes. Before writing the template, call
get_component for each one and get_examples for a matching example. Then run
ESLint and fix any ghostvue/* errors.
```

```text
Restyle GhostSwitch from @ghostvue/vue to match our brand. Use get_component
for its data-part and data-state hooks and get_tokens with prefix "action" for
token names. Do not target internal class names.
```

## Related

- [MCP server reference](./mcp-server.md)
- [ESLint plugin](./eslint-plugin.md)
- [Component manifests](../architecture/component-manifest.md)
- [Getting started](../getting-started.md)
