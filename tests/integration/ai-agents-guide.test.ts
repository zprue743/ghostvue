/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { Linter } from 'eslint'
import vue from 'eslint-plugin-vue'
import { describe, expect, it } from 'vitest'

import ghostvue from '../../packages/eslint-plugin/src/index.js'
import { builtInTools } from '../../packages/mcp/src/cli.js'
import {
  AI_AGENTS_GUIDE_PATH,
  CHECKOUT_PLACEHOLDER,
  extractFences,
  extractMcpLaunchSnippets,
  mentionedEslintRuleIds,
  mentionedMcpToolNames,
  resolveMcpLaunch,
} from '../../scripts/lib/ai-agents-guide.js'

// GHO-48: the consumer AI agents guide is copy-paste material, so its
// snippets are checked against the real packages. These checks need no build;
// `pnpm agents-guide` (verify:build) also launches the built server the way
// each snippet does.

const root = process.cwd()
const guide = await readFile(join(root, AI_AGENTS_GUIDE_PATH), 'utf8')
const mcpPackageDirectory = join(root, 'packages/mcp')
const mcpPackage = JSON.parse(
  await readFile(join(mcpPackageDirectory, 'package.json'), 'utf8'),
) as { name: string; bin: Record<string, string> }
const eslintPackage = JSON.parse(
  await readFile(join(root, 'packages/eslint-plugin/package.json'), 'utf8'),
) as { name: string }

const pkg = {
  name: mcpPackage.name,
  bin: mcpPackage.bin,
  packageDirectory: mcpPackageDirectory,
  repositoryRoot: root,
}

describe('AI agents guide MCP snippets', () => {
  const snippets = extractMcpLaunchSnippets(guide)

  it('configures every documented host', () => {
    expect(new Set(snippets.map((snippet) => snippet.host))).toEqual(
      new Set([
        'Claude Code',
        'Cursor',
        'VS Code (GitHub Copilot)',
        'Windsurf',
        'Codex CLI',
        'Claude Desktop',
        'Faster start without `npx`',
        'Run from a checkout',
      ]),
    )
    expect(new Set(snippets.map((snippet) => snippet.format))).toEqual(
      new Set(['json', 'toml', 'cli']),
    )
  })

  it('launches the package bin, pinned to one version', () => {
    const versions = new Set<string>()
    for (const snippet of snippets) {
      const launch = resolveMcpLaunch(snippet, pkg)
      expect(launch.binPath, snippet.host).toBe(
        join(mcpPackageDirectory, 'dist/bin.js'),
      )
      if (launch.pinnedVersion) versions.add(launch.pinnedVersion)
    }
    expect([...versions]).toHaveLength(1)
  })

  it('mentions exactly the tools the server registers', () => {
    expect(mentionedMcpToolNames(guide)).toEqual(
      builtInTools.map((tool) => tool.name).sort(),
    )
  })

  it('documents expectedGhostvueVersion, which every tool accepts', () => {
    expect(guide).toContain('`expectedGhostvueVersion`')
    for (const tool of builtInTools) {
      expect(
        Object.keys(tool.descriptor.inputSchema.properties ?? {}),
        tool.name,
      ).toContain('expectedGhostvueVersion')
    }
  })
})

describe('AI agents guide ESLint snippet', () => {
  const configFence = extractFences(guide).find(
    (fence) => fence.lang === 'js' && fence.body.includes(eslintPackage.name),
  )

  it('mentions only rule ids the plugin defines, and all of them', () => {
    expect(mentionedEslintRuleIds(guide)).toEqual(
      Object.keys(ghostvue.rules)
        .map((rule) => `ghostvue/${rule}`)
        .sort(),
    )
  })

  it('uses a config the plugin exports, and that config reports misuse', () => {
    expect(configFence?.body).toContain(
      `import ghostvue from '${eslintPackage.name}'`,
    )
    const configNames = [
      ...(configFence?.body ?? '').matchAll(/ghostvue\.configs\.(\w+)/g),
    ].map((match) => match[1])
    expect(configNames).toEqual(['recommended'])

    // The same array the snippet exports, built from the real modules.
    const config: Linter.Config[] = [
      ...vue.configs['flat/recommended'],
      ghostvue.configs.recommended,
    ]
    const messages = new Linter().verify(
      [
        '<script setup>',
        "import { GhostDialog } from '@ghostvue/themes'",
        '</script>',
        '<template><GhostDialog v-model="open" /></template>',
      ].join('\n'),
      config,
      'Fixture.vue',
    )
    expect(messages.map((message) => message.ruleId)).toContain(
      'ghostvue/no-undeclared-v-model',
    )
  })
})

describe('AI agents guide snippet parser', () => {
  const host = (body: string, lang = 'json') =>
    `### Host\n\n\`\`\`${lang}\n${body}\n\`\`\`\n`

  it('reads mcpServers, VS Code servers, Codex TOML, and claude mcp add', () => {
    const markdown = [
      host('{"mcpServers":{"ghostvue":{"command":"npx","args":["-y"]}}}'),
      host(
        '{"servers":{"ghostvue":{"type":"stdio","command":"ghostvue-mcp"}}}',
      ),
      host(
        '[mcp_servers.ghostvue]\ncommand = "npx"\nargs = ["-y", "x"]\n\n[other]\nargs = ["no"]',
        'toml',
      ),
      host('claude mcp add ghostvue -- npx -y -p a b', 'bash'),
      host('{"name":"not an MCP config"}'),
    ].join('\n')

    expect(extractMcpLaunchSnippets(markdown)).toEqual([
      { host: 'Host', format: 'json', command: 'npx', args: ['-y'] },
      { host: 'Host', format: 'json', command: 'ghostvue-mcp', args: [] },
      { host: 'Host', format: 'toml', command: 'npx', args: ['-y', 'x'] },
      {
        host: 'Host',
        format: 'cli',
        command: 'npx',
        args: ['-y', '-p', 'a', 'b'],
      },
    ])
  })

  it('rejects a config without a ghostvue server or with a non-stdio type', () => {
    expect(() =>
      extractMcpLaunchSnippets(host('{"mcpServers":{"other":{}}}')),
    ).toThrow('no "ghostvue" server')
    expect(() =>
      extractMcpLaunchSnippets(
        host('{"servers":{"ghostvue":{"type":"http","command":"x"}}}'),
      ),
    ).toThrow('must use stdio')
  })

  it.each([
    ['another package', ['-y', '-p', '@ghostvue/vue@0.1.0', 'ghostvue-mcp']],
    ['an unknown bin', ['-y', '-p', '@ghostvue/mcp@0.1.0', 'ghostvue']],
    [
      'an unpinned version',
      ['-y', '-p', '@ghostvue/mcp@latest', 'ghostvue-mcp'],
    ],
    [
      'extra args',
      ['-y', '-p', '@ghostvue/mcp@0.1.0', 'ghostvue-mcp', '--http'],
    ],
  ])('rejects an npx launch of %s', (_case, args) => {
    expect(() => resolveMcpLaunch({ command: 'npx', args }, pkg)).toThrow()
  })

  it('accepts only the built bin path under the checkout placeholder', () => {
    expect(
      resolveMcpLaunch(
        {
          command: 'node',
          args: [`${CHECKOUT_PLACEHOLDER}/packages/mcp/dist/bin.js`],
        },
        pkg,
      ).binName,
    ).toBe('ghostvue-mcp')
    expect(() =>
      resolveMcpLaunch(
        {
          command: 'node',
          args: [`${CHECKOUT_PLACEHOLDER}/packages/mcp/src/bin.ts`],
        },
        pkg,
      ),
    ).toThrow('is not a @ghostvue/mcp bin file')
    expect(() =>
      resolveMcpLaunch({ command: 'ghostvue-mcp', args: ['--stdio'] }, pkg),
    ).toThrow('takes no args')
  })

  it('finds rule ids but not package names or paths', () => {
    expect(
      mentionedEslintRuleIds(
        '`ghostvue/no-unknown-props`, @ghostvue/vue, /to/ghostvue/packages, ghostvue/*',
      ),
    ).toEqual(['ghostvue/no-unknown-props'])
  })
})
