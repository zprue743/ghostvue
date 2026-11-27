const PLAYWRIGHT_IMAGE = 'mcr.microsoft.com/playwright:v1.65.1-noble'

const ANONYMOUS_NODE_MODULES = [
  '/work/node_modules',
  '/work/apps/docs/node_modules',
  '/work/apps/nuxt-fixture/node_modules',
  '/work/apps/playground/node_modules',
  '/work/packages/core/node_modules',
  '/work/packages/eslint-plugin/node_modules',
  '/work/packages/mcp/node_modules',
  '/work/packages/nuxt/node_modules',
  '/work/packages/shared/node_modules',
  '/work/packages/themes/node_modules',
  '/work/packages/vue/node_modules',
]

const CHOWN_TARGETS = [
  'tests/e2e/*-snapshots',
  'apps/playground/dist',
  'apps/docs/.vitepress/dist',
  'apps/docs/.vitepress/.registries',
  'docs/reference',
  'docs/.registries',
  'examples/.registries',
  'packages/vue/src/.registries',
  'packages/vue/src/.publish-index.generated.ts',
  'packages/themes/src/.registries',
  'packages/themes/src/.publish-index.generated.ts',
  'packages/nuxt/src/.registries',
  '.pnpm-store',
  'playwright-report',
  'test-results',
]

/**
 * Build the `docker run` argument vector for Linux-only visual snapshot
 * generation without relying on POSIX shell substitutions on the host.
 *
 * @param {{
 *   cwd?: string
 *   uid?: number | null
 *   gid?: number | null
 * }} [options]
 * @returns {string[]}
 */
export function buildVisualDockerArgs(options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const uid =
    options.uid !== undefined
      ? options.uid
      : typeof process.getuid === 'function'
        ? process.getuid()
        : null
  const gid =
    options.gid !== undefined
      ? options.gid
      : typeof process.getgid === 'function'
        ? process.getgid()
        : null

  const args = [
    'run',
    '--rm',
    '--ipc=host',
    '-v',
    `${cwd}:/work`,
    ...ANONYMOUS_NODE_MODULES.flatMap((mount) => ['-v', mount]),
    '-w',
    '/work',
    '-e',
    'HOME=/root',
    '-e',
    'COREPACK_ENABLE_DOWNLOAD_PROMPT=0',
  ]

  const hasHostIds = typeof uid === 'number' && typeof gid === 'number'
  if (hasHostIds) {
    args.push('-e', `HOST_UID=${uid}`, '-e', `HOST_GID=${gid}`)
  }

  // Playwright v1.65.1-noble ships Node 26 without bundled Corepack, so fall
  // back to installing the repo's pinned pnpm via npm when corepack is absent.
  const ensurePnpm =
    'command -v pnpm >/dev/null 2>&1 || (command -v corepack >/dev/null 2>&1 && corepack enable) || npm install -g --no-fund --no-audit "$(node -e \'console.log(require("./package.json").packageManager.split("+")[0])\')"'
  const innerSteps = [
    `(${ensurePnpm}) && pnpm install --frozen-lockfile && pnpm test:visual:update; rc=$?;`,
  ]
  if (hasHostIds) {
    innerSteps.push(
      `chown -R "$HOST_UID:$HOST_GID" ${CHOWN_TARGETS.join(' ')} 2>/dev/null || true;`,
    )
  }
  innerSteps.push('exit $rc')

  args.push(PLAYWRIGHT_IMAGE, 'bash', '-lc', innerSteps.join(' '))
  return args
}
